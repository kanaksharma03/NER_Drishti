import logging
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import VerificationResult, Recommendation, RiskPrediction, WeatherObservation
from database import AsyncSessionLocal

logger = logging.getLogger(__name__)

RULE_VERSION = "v1.0"

def evaluate_signals(prediction: RiskPrediction, weather: WeatherObservation):
    """
    Evaluates independent signals to determine confidence.
    Returns: (confidence_score, supporting_signals, missing_signals)
    """
    confidence_score = 1.0
    supporting = {}
    missing = {}

    # Signal 1: Fresh Data
    if not weather or weather.is_stale:
        missing["weather_data"] = "Weather data is stale or missing"
        confidence_score -= 0.3
    else:
        supporting["weather_data"] = "Recent weather data available"

    # Signal 2: Corroborating Soil Moisture (if high risk)
    if prediction.probability > 0.5:
        if weather and weather.soil_moisture and weather.soil_moisture > 0.7:
            supporting["soil_moisture"] = f"High soil saturation detected ({weather.soil_moisture:.2f})"
        else:
            missing["soil_moisture"] = "Lack of high soil saturation reading"
            confidence_score -= 0.3
            
    # Signal 3: Intense Rainfall
    if prediction.probability > 0.5:
        if weather and weather.rainfall_24h_sum and weather.rainfall_24h_sum > 50.0:
            supporting["rainfall"] = f"Heavy 24h rainfall detected ({weather.rainfall_24h_sum:.1f}mm)"
        else:
            missing["rainfall"] = "No heavy 24h rainfall recorded"
            confidence_score -= 0.2

    # Clamp
    confidence_score = max(0.0, min(1.0, confidence_score))
    
    return confidence_score, supporting, missing

def determine_action(prob: float, conf: float) -> tuple[str, str]:
    """
    Returns (priority, recommended_action)
    """
    if prob > 0.8:
        if conf > 0.7:
            return "P1", "VERIFIED HIGH RISK. Initiate immediate evacuation protocols and halt highway traffic."
        else:
            return "P2", "NEEDS VERIFICATION. High ML risk but missing corroborating signals. Deploy field officer."
    elif prob > 0.5:
        return "P2", "MODERATE RISK. Issue advisory warning to commuters."
    else:
        return "P3", "ROUTINE. Continue normal monitoring."

async def verify_and_recommend(prediction: RiskPrediction, weather: WeatherObservation, session) -> dict:
    conf, sup, mis = evaluate_signals(prediction, weather)
    
    # Bayesian Uplift from Citizen Reports
    from services.reports import get_recent_clusters
    nearby_clusters = await get_recent_clusters(session, prediction.lat, prediction.lon, radius_meters=1000)
    
    if nearby_clusters:
        sup["citizen_reports"] = f"{len(nearby_clusters)} verified citizen report cluster(s) nearby."
        conf += 0.25
        conf = min(1.0, conf)  # Clamp to 1.0 maximum
    else:
        mis["citizen_reports"] = "No recent citizen reports nearby."

    prio, action = determine_action(prediction.probability, conf)
    
    # Save Verification Result
    ver = VerificationResult(
        prediction_id=prediction.id,
        confidence_score=conf,
        supporting_signals=sup,
        missing_signals=mis
    )
    session.add(ver)
    
    # Save Recommendation
    rec = Recommendation(
        prediction_id=prediction.id,
        priority=prio,
        recommended_action=action,
        rule_version=RULE_VERSION
    )
    session.add(rec)
    
    # Fire background alerts for high/critical cases
    from services.alerts import dispatch_alerts
    # Need to construct dictionaries compatible with dispatch_alerts since we don't have Pydantic models here
    pred_dict = {
        "severity_tier": prediction.severity_tier,
        "probability": prediction.probability
    }
    ver_dict = {
        "confidence_score": conf,
        "recommendation": {"action": action}
    }
    # It takes an async session and awaits it, but we are inside an async function already
    await dispatch_alerts(pred_dict, ver_dict, session)
    
    return {
        "confidence_score": conf,
        "supporting_signals": sup,
        "missing_signals": mis,
        "recommendation": {
            "priority": prio,
            "action": action
        },
        "rule_version": RULE_VERSION
    }
