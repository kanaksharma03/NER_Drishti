import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Use SQLite for the software-only hackathon demo to avoid native PostgreSQL dependencies
db_url = "sqlite+aiosqlite:///./nerdrishti.db"

engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)
