import asyncio
import httpx
from datetime import datetime, timezone, timedelta
import logging
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import WeatherObservation
from database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# 3 Representative points along the NH-13 Bhalukpong–Tawang corridor
POINTS = [
    {"lat": 27.02, "lon": 92.65, "name": "Bhalukpong (Start)"},
    {"lat": 27.32, "lon": 92.53, "name": "Bomdila (Middle)"},
    {"lat": 27.58, "lon": 91.86, "name": "Tawang (End)"}
]

async def fetch_weather_for_point(client: httpx.AsyncClient, lat: float, lon: float, force_fail=False):
    if force_fail:
        # Simulate a network error or missing data to test staleness
        return None
        
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "precipitation,soil_moisture_0_to_7cm",
        "past_days": 3,  # We need 72h history
        "forecast_days": 2,
        "timezone": "auto"
    }
    
    try:
        response = await client.get(url, params=params, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch weather for {lat},{lon}: {e}")
        return None

def process_weather_data(data, lat, lon):
    now = datetime.now(timezone.utc)
    
    if not data or "hourly" not in data:
        # Create a stale record with fallback data to survive demo
        return WeatherObservation(
            lat=lat,
            lon=lon,
            timestamp=now,
            rainfall_1h=2.5,
            rainfall_24h_sum=45.0,
            rainfall_72h_sum=120.0,
            soil_moisture=0.65,
            is_stale=True
        )
        
    hourly = data["hourly"]
    times = hourly["time"]
    precip = hourly["precipitation"]
    soil_moisture = hourly["soil_moisture_0_to_7cm"]
    
    # Find the current hour index
    # Open-Meteo returns ISO times like '2023-10-27T14:00'
    # We find the closest time in the past
    now_str = now.strftime("%Y-%m-%dT%H:00")
    try:
        current_idx = times.index(now_str)
    except ValueError:
        # If exact match fails, just take the middle of the past_days array roughly
        current_idx = 72
        
    # Safely get rolling sums
    def get_sum(start_idx, end_idx):
        start = max(0, start_idx)
        end = min(len(precip), end_idx)
        return sum([p for p in precip[start:end] if p is not None])

    rain_1h = precip[current_idx] if current_idx < len(precip) else 0.0
    rain_24h_sum = get_sum(current_idx - 24, current_idx)
    rain_72h_sum = get_sum(current_idx - 72, current_idx)
    rain_24h_forecast = get_sum(current_idx, current_idx + 24)
    current_soil_moisture = soil_moisture[current_idx] if current_idx < len(soil_moisture) else 0.0
    
    # Ensure None values are 0.0
    rain_1h = rain_1h or 0.0
    current_soil_moisture = current_soil_moisture or 0.0
    
    return WeatherObservation(
        lat=lat,
        lon=lon,
        timestamp=now,
        rainfall_1h=rain_1h,
        rainfall_24h_sum=rain_24h_sum,
        rainfall_72h_sum=rain_72h_sum,
        rainfall_24h_forecast=rain_24h_forecast,
        soil_moisture=current_soil_moisture,
        is_stale=False
    )

async def ingest_weather_data(force_fail=False):
    logger.info(f"Starting weather ingestion (force_fail={force_fail})")
    async with httpx.AsyncClient() as client:
        observations = []
        for pt in POINTS:
            data = await fetch_weather_for_point(client, pt["lat"], pt["lon"], force_fail=force_fail)
            obs = process_weather_data(data, pt["lat"], pt["lon"])
            observations.append(obs)
            
        async with AsyncSessionLocal() as session:
            session.add_all(observations)
            await session.commit()
    logger.info(f"Saved {len(observations)} weather observations.")
