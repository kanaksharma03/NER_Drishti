import asyncio
import random
import math
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, TerrainGrid
from database import db_url

async def seed_db():
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as session:
        # Generate a 10x10 grid of mock terrain cells around NH-13 (approx 92.5, 27.2)
        base_lat = 27.15
        base_lon = 92.4
        
        cells = []
        for i in range(10):
            for j in range(10):
                lat = base_lat + (i * 0.01)
                lon = base_lon + (j * 0.01)
                aspect = random.uniform(0, 360)
                
                # Mock terrain features for the ML model
                cell = TerrainGrid(
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
        print(f"Successfully seeded {len(cells)} TerrainGrid cells for the NH-13 Corridor.")

if __name__ == "__main__":
    asyncio.run(seed_db())
