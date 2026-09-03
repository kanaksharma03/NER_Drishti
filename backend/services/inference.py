import os
import joblib
import pandas as pd
import shap
import logging
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import func

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import TerrainGrid, WeatherObservation, RiskPrediction, RiskExplanation

logger = logging.getLogger(__name__)

# Load the model artifact once at startup
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ml", "models", "xgb_v1.joblib")
try:
    model = joblib.load(MODEL_PATH)
    explainer = shap.TreeExplainer(model)
    logger.info(f"Loaded XGBoost model from {MODEL_PATH}")
except Exception as e:
    logger.error(f"Failed to load model from {MODEL_PATH}: {e}")
    model = None
    explainer = None

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

async def predict_risk(lat: float, lon: float):
    if not model or not explainer:
        raise Exception("Model not loaded")

    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        # 1. Fetch nearest terrain grid
        # Using simple Euclidean distance for demonstration instead of PostGIS ST_Distance for simplicity in SQLAlchemy without dropping to raw SQL,
        # but since we have PostGIS, let's use raw SQL for ST_Distance.
        from sqlalchemy import text
        
        terrain_query = text("""
            SELECT elevation, slope, aspect_sin, aspect_cos 
            FROM terrain_grid 
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326) 
            LIMIT 1
        """)
        terrain_result = await session.execute(terrain_query, {"lon": lon, "lat": lat})
        terrain_data = terrain_result.fetchone()
        
        if not terrain_data:
            raise Exception("No terrain data found near these coordinates")
            
        elevation, slope, aspect_sin, aspect_cos = terrain_data

        # 2. Fetch latest weather (using the most recent observation overall as a proxy for the region)
        weather_query = select(WeatherObservation).order_by(WeatherObservation.timestamp.desc()).limit(1)
        weather_result = await session.execute(weather_query)
        weather_data = weather_result.scalar_one_or_none()
        
        # If no weather data, default to 0
        historical_rain_3d = weather_data.rainfall_72h_sum if weather_data else 0.0
        
        # 3. Construct Feature Vector
        # Must match the order of FEATURES
        df = pd.DataFrame([{
            'elevation': elevation,
            'slope': slope,
            'aspect_sin': aspect_sin,
            'aspect_cos': aspect_cos,
            'historical_rain_3d': historical_rain_3d
        }])
        
        # 4. Predict
        prob = float(model.predict_proba(df)[0][1])
        tier = get_severity_tier(prob)
        
        # 5. Explain (TreeSHAP)
        shap_values = explainer.shap_values(df)
        # shap_values is an array for single instance, e.g., shape (5,)
        
        # Map feature names to SHAP values
        contributions = []
        for i, feat in enumerate(FEATURES):
            val = float(shap_values[0][i])
            contributions.append({
                "feature_name": feat,
                "contribution_value": val,
                "is_positive_driver": val > 0
            })
            
        # Sort by absolute contribution to get top 3
        contributions.sort(key=lambda x: abs(x["contribution_value"]), reverse=True)
        top_3 = contributions[:3]
        
        # 6. Audit Logging
        prediction = RiskPrediction(
            lat=lat,
            lon=lon,
            timestamp=datetime.now(timezone.utc),
            probability=prob,
            severity_tier=tier,
            model_version="xgb_v1"
        )
        session.add(prediction)
        await session.flush() # get ID
        
        explanations = [
            RiskExplanation(
                prediction_id=prediction.id,
                feature_name=c["feature_name"],
                contribution_value=c["contribution_value"],
                is_positive_driver=c["is_positive_driver"]
            )
            for c in top_3
        ]
        session.add_all(explanations)
        
        # 7. Verification and Recommendation
        from services.verification import verify_and_recommend
        ver_rec = await verify_and_recommend(prediction, weather_data, session)
        
        await session.commit()
        
        return {
            "lat": lat,
            "lon": lon,
            "probability": prob,
            "severity_tier": tier,
            "top_factors": top_3,
            "model_version": "xgb_v1",
            "timestamp": prediction.timestamp.isoformat(),
            "verification": {
                "confidence_score": ver_rec["confidence_score"],
                "supporting_signals": ver_rec["supporting_signals"],
                "missing_signals": ver_rec["missing_signals"]
            },
            "recommendation": {
                "priority": ver_rec["priority"],
                "action": ver_rec["recommended_action"],
                "rule_version": ver_rec["rule_version"]
            }
        }
