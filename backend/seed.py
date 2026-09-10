import asyncio
import random
import math
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, TerrainGrid, Region
from database import db_url

REGIONS = [
    {
        "state": "Arunachal Pradesh", "district": "West Kameng",
        "corridor_name": "NH-13 Bomdila–Bhalukpong",
        "center_lat": 27.15, "center_lon": 92.40,
    },
    {
        "state": "Sikkim", "district": "East Sikkim",
        "corridor_name": "NH-10 Gangtok–Nathula Corridor",
        "center_lat": 27.33, "center_lon": 88.61,
    },
    {
        "state": "Meghalaya", "district": "East Khasi Hills",
        "corridor_name": "NH-6 Shillong–Cherrapunji Corridor",
        "center_lat": 25.35, "center_lon": 91.70,
    },
]

async def seed_db():
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        for idx, reg_data in enumerate(REGIONS, start=1):
            region = Region(
                id=idx,
                state=reg_data["state"],
                district=reg_data["district"],
                corridor_name=reg_data["corridor_name"],
                center_lat=reg_data["center_lat"],
                center_lon=reg_data["center_lon"]
            )
            session.add(region)
            await session.flush()
            
            base_lat = reg_data["center_lat"]
            base_lon = reg_data["center_lon"]
            
            cells = []
            for i in range(10):
                for j in range(10):
                    lat = base_lat + (i * 0.01)
                    lon = base_lon + (j * 0.01)
                    aspect = random.uniform(0, 360)
                    
                    cell = TerrainGrid(
                        region_id=region.id,
                        lat=lat,
                        lon=lon,
                        elevation=random.uniform(500, 1500),
                        slope=random.uniform(5, 45),
                        aspect_sin=math.sin(math.radians(aspect)),
                        aspect_cos=math.cos(math.radians(aspect)),
                        plan_curvature=random.uniform(-0.5, 0.5),
                        profile_curvature=random.uniform(-0.5, 0.5),
                        twi=random.uniform(5.0, 15.0)
                    )
                    cells.append(cell)
            
            session.add_all(cells)
            
        await session.commit()
        print("Successfully seeded Regions and TerrainGrid cells.")

if __name__ == "__main__":
    asyncio.run(seed_db())
