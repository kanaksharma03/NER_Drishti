import asyncio
import os
import httpx
import numpy as np
import rasterio
from rasterio.transform import rowcol
import osmnx as ox
import geopandas as gpd
from shapely.geometry import box, Polygon
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from geoalchemy2.shape import from_shape
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Base, TerrainGrid, Road

# Bhalukpong–Tawang Corridor Box
MIN_LON, MIN_LAT = 92.3, 27.0
MAX_LON, MAX_LAT = 92.8, 27.6
BBOX = (MIN_LON, MIN_LAT, MAX_LON, MAX_LAT)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/ner_drishti")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    print("Initializing Database Schema...")
    async with engine.begin() as conn:
        # Create extension if not exists
        await conn.execute(org.sqlalchemy.text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

async def download_dem(filename="dem.tif"):
    print("Downloading SRTM DEM from OpenTopography...")
    url = f"https://portal.opentopography.org/API/globaldem?demtype=SRTMGL3&south={MIN_LAT}&north={MAX_LAT}&west={MIN_LON}&east={MAX_LON}&outputFormat=GTiff"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(url)
        if response.status_code == 200:
            with open(filename, 'wb') as f:
                f.write(response.content)
            print("DEM downloaded successfully.")
        else:
            print(f"Failed to download DEM: {response.status_code}")
            print(response.text)
            raise Exception("DEM download failed")

def process_dem_and_insert(filename="dem.tif"):
    print("Processing DEM...")
    # Read raster
    with rasterio.open(filename) as src:
        elev = src.read(1).astype(float)
        elev[elev == src.nodata] = np.nan
        transform = src.transform
        
        # Calculate cell size in meters (approximate for EPSG:4326 at this latitude)
        # 1 degree lat is ~111km, 1 deg lon at 27deg is ~99km
        dy = 111000 * abs(transform.e)
        dx = 99000 * abs(transform.a)
        
        # We will use finite differences to calculate slope and aspect
        ey, ex = np.gradient(elev, dy, dx)
        slope = np.arctan(np.sqrt(ex**2 + ey**2)) * 180 / np.pi
        aspect = np.arctan2(-ey, ex) # radians
        aspect_sin = np.sin(aspect)
        aspect_cos = np.cos(aspect)
        
        # For curvature, second derivatives
        exx, exy = np.gradient(ex, dy, dx)
        eyx, eyy = np.gradient(ey, dy, dx)
        
        # Basic approximations for profile and plan curvature
        # Prof = (exx*ex^2 + 2*exy*ex*ey + eyy*ey^2) / (ex^2 + ey^2)
        # Plan = (exx*ey^2 - 2*exy*ex*ey + eyy*ex^2) / (ex^2 + ey^2)
        denom = ex**2 + ey**2
        denom[denom == 0] = 1e-6 # prevent division by zero
        
        profile_curv = (exx * ex**2 + 2 * exy * ex * ey + eyy * ey**2) / denom
        plan_curv = (exx * ey**2 - 2 * exy * ex * ey + eyy * ex**2) / denom
        
        # TWI = ln(a / tan(beta))
        # Where a is specific catchment area. We'll mock 'a' with a constant for now as true flow routing needs pysheds.
        twi = np.log(100 / (np.tan(slope * np.pi / 180) + 1e-6))
        
        # Subsample to create a manageable grid (e.g., skip every 3rd pixel for ~90m)
        step = 3
        
        print(f"Raster shape: {elev.shape}. Building grid (step={step})...")
        
        rows, cols = elev.shape
        records = []
        for r in range(0, rows, step):
            for c in range(0, cols, step):
                if np.isnan(elev[r, c]):
                    continue
                    
                x, y = rasterio.transform.xy(transform, r, c)
                # Create a small polygon for the cell
                w = abs(transform.a) * step
                h = abs(transform.e) * step
                poly = box(x - w/2, y - h/2, x + w/2, y + h/2)
                
                records.append({
                    "geom": from_shape(poly, srid=4326),
                    "elevation": float(elev[r, c]),
                    "slope": float(slope[r, c]),
                    "aspect_sin": float(aspect_sin[r, c]),
                    "aspect_cos": float(aspect_cos[r, c]),
                    "plan_curvature": float(plan_curv[r, c]),
                    "profile_curvature": float(profile_curv[r, c]),
                    "twi": float(twi[r, c])
                })
        
        return records

async def insert_terrain_records(records):
    print(f"Inserting {len(records)} terrain grid cells...")
    async with AsyncSessionLocal() as session:
        # Batch insert
        batch_size = 5000
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            objects = [TerrainGrid(**r) for r in batch]
            session.add_all(objects)
            await session.commit()
    print("Terrain insertion complete.")

def download_and_process_roads():
    print("Downloading OSM Roads via Overpass...")
    # ox.settings.use_cache = True
    G = ox.graph_from_bbox(MAX_LAT, MIN_LAT, MAX_LON, MIN_LON, network_type='drive')
    nodes, edges = ox.graph_to_gdfs(G)
    
    records = []
    for idx, row in edges.iterrows():
        # highway class might be a list or a string
        hw = row.get('highway', '')
        if isinstance(hw, list):
            hw = hw[0]
            
        name = row.get('name', '')
        if isinstance(name, list):
            name = name[0]
            
        records.append({
            "geom": from_shape(row['geometry'], srid=4326),
            "highway_class": str(hw),
            "name": str(name)
        })
    return records

async def insert_road_records(records):
    print(f"Inserting {len(records)} road segments...")
    async with AsyncSessionLocal() as session:
        batch_size = 1000
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            objects = [Road(**r) for r in batch]
            session.add_all(objects)
            await session.commit()
    print("Roads insertion complete.")

async def main():
    import sqlalchemy
    # Fix the missing import for text in init_db
    global org 
    import sqlalchemy as org
    
    await init_db()
    
    dem_file = "dem.tif"
    if not os.path.exists(dem_file):
        await download_dem(dem_file)
        
    terrain_records = process_dem_and_insert(dem_file)
    await insert_terrain_records(terrain_records)
    
    road_records = download_and_process_roads()
    await insert_road_records(road_records)
    
    print("Ingestion complete.")

if __name__ == "__main__":
    asyncio.run(main())
