import os
import logging
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import text
import random

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import TerrainGrid, WeatherObservation, RiskPrediction, RiskExplanation

logger = logging.getLogger(__name__)

FEATURES = ['elevation', 'slope', 'aspect_sin', 'aspect_cos', 'historical_rain_3d']

def get_severity_tier(prob: float) -> str:
    if prob < 0.3:
        return "Low"
    elif prob < 0.6:
        return "Moderate"
    elif prob < 0.8:
        return "High"
    else:
        return "Critical"

async def predict_risk(lat: float, lon: float, weather=None):
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        # Mock Terrain Fetch
        terrain_query = text("""
            SELECT elevation, slope, aspect_sin, aspect_cos, twi 
            FROM terrain_grid 
            ORDER BY ((lat - :lat)*(lat - :lat) + (lon - :lon)*(lon - :lon)) ASC 
            LIMIT 1
        """)
        terrain_result = await session.execute(terrain_query, {"lon": lon, "lat": lat})
        terrain_data = terrain_result.fetchone()
        
        if not terrain_data:
            # Fallback if seed.py wasn't run
            elevation, slope, aspect_sin, aspect_cos, twi = 1000.0, 35.0, 0.5, 0.5, 8.0
        else:
            elevation, slope, aspect_sin, aspect_cos, twi = terrain_data
            
        # Use provided weather or fetch latest
        historical_rain_3d = 0.0
        if weather:
            historical_rain_3d = weather.rainfall_72h_sum
        else:
            weather_query = select(WeatherObservation).order_by(WeatherObservation.timestamp.desc()).limit(1)
            weather_result = await session.execute(weather_query)
            weather_data = weather_result.scalar_one_or_none()
            if weather_data:
                historical_rain_3d = weather_data.rainfall_72h_sum or 0.0

        # MOCK ML INFERENCE: Calculate a heuristic probability based on slope and rain
        # Slope > 30 deg and rain > 100mm increases risk significantly
        prob = 0.1
        prob += (slope / 45.0) * 0.4
        prob += (historical_rain_3d / 200.0) * 0.5
        
        # Add a tiny bit of random noise for realism in the demo
        prob += random.uniform(-0.05, 0.05)
        prob = max(0.0, min(1.0, prob)) # Clamp between 0 and 1
        
        tier = get_severity_tier(prob)
        
        # MOCK SHAP VALUES: Hardcode reasonable explanations based on our heuristic
        top_contributions = [
            {"feature_name": "historical_rain_3d", "contribution_value": round((historical_rain_3d / 200.0) * 0.5, 3), "is_positive_driver": True},
            {"feature_name": "slope", "contribution_value": round((slope / 45.0) * 0.4, 3), "is_positive_driver": True},
            {"feature_name": "twi", "contribution_value": round(min((twi or 0) / 20.0, 0.15), 3), "is_positive_driver": True},
            {"feature_name": "elevation", "contribution_value": round(-0.05 if (elevation or 0) > 2000 else 0.02, 3), "is_positive_driver": (elevation or 0) <= 2000},
        ]
        
        # Save Prediction to DB
        now = datetime.now(timezone.utc)
        pred = RiskPrediction(
            lat=lat,
            lon=lon,
            probability=prob,
            severity_tier=tier,
            timestamp=now
        )
        session.add(pred)
        await session.flush()
        
        # Save Explanations
        exps = [
            RiskExplanation(
                prediction_id=pred.id,
                feature_name=c["feature_name"],
                contribution_value=c["contribution_value"],
                is_positive_driver=c["is_positive_driver"]
            ) for c in top_contributions
        ]
        session.add_all(exps)
        await session.commit()
        
        return pred, exps
