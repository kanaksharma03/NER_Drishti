import asyncio
import random
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import Base, TerrainCell, db_url

async def seed_db():
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Generate a 10x10 grid of mock terrain cells around NH-13 (approx 92.5, 27.2)
        base_lat = 27.15
        base_lon = 92.4
        
        cells = []
        for i in range(10):
            for j in range(10):
                lat = base_lat + (i * 0.01)
                lon = base_lon + (j * 0.01)
                
                # Mock terrain features for the ML model
                cell = TerrainCell(
                    lat=lat,
                    lon=lon,
                    elevation=random.uniform(500, 1500),
                    slope=random.uniform(5, 45),
                    aspect=random.uniform(0, 360),
                    soil_type=random.choice(["Clay", "Loam", "Sandy"]),
                    land_cover=random.choice(["Forest", "Bare", "Urban"]),
                    drainage_density=random.uniform(0.1, 1.0)
                )
                cells.append(cell)
        
        session.add_all(cells)
        await session.commit()
        print(f"Successfully seeded {len(cells)} TerrainCells for the NH-13 Corridor.")

if __name__ == "__main__":
    asyncio.run(seed_db())
