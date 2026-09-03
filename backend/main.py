import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, File, UploadFile, Form, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select, desc
import logging
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os

from services.weather import ingest_weather_data
from models import WeatherObservation
import logging
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def weather_scheduler():
    """Background task to fetch weather every 1 minute for demo purposes."""
    while True:
        try:
            await ingest_weather_data()
        except Exception as e:
            logger.error(f"Error in weather scheduler: {e}")
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from models import Base
    from database import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start the background task
    task = asyncio.create_task(weather_scheduler())
    yield
    # Cancel on shutdown
    task.cancel()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="NER-DRISHTI API", 
    version="1.0.0", 
    lifespan=lifespan,
    description="Core REST API for NER-DRISHTI Early Warning System"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from database import engine, AsyncSessionLocal
from services.auth import create_access_token, require_authority
from fastapi.security import OAuth2PasswordRequestForm

@app.post("/api/v1/token", tags=["Auth"], summary="Mint a JWT Token (Demo Only)")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Dummy logic for demo purposes
    if form_data.username == "admin" and form_data.password == "password":
        role = "authority"
    else:
        role = "public"
    
    access_token = create_access_token(data={"sub": form_data.username, "role": role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/v1/reports/submit", tags=["Citizen Reporting"], summary="Submit an incident report")
@limiter.limit("5/minute")
async def submit_report(
    request: Request,
    type: str = Form(...),
    description: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    photo: UploadFile = File(...)
):
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{photo.filename}")
    
    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(photo.file, buffer)
        
    from services.reports import process_report
    async with AsyncSessionLocal() as session:
        report = await process_report(
            session=session,
            report_type=type,
            description=description,
            lat=lat,
            lon=lon,
            photo_path=file_path
        )
        
    return {
        "status": "success",
        "is_spoofed": report.is_spoofed,
        "cluster_id": report.cluster_id
    }

@app.get("/health")
async def health_check():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        db_status = "error"

    return {"status": "ok", "db": db_status}

SIMULATE_RAIN_SPIKE = False

@app.post("/api/v1/simulate/rain", tags=["Demo"], summary="Toggle Rain Spike Simulation")
async def toggle_rain_spike(enable: bool = Query(True)):
    global SIMULATE_RAIN_SPIKE
    SIMULATE_RAIN_SPIKE = enable
    return {"status": "ok", "simulate_rain_spike": SIMULATE_RAIN_SPIKE}

@app.get("/api/v1/risk/grid", tags=["Risk Analysis"], summary="Get Hazard Grid GeoJSON")
async def get_risk_grid(rainfall_delta: float = Query(0.0, description="Simulate cloudburst (mm of rain)")):
    """Returns terrain grid as GeoJSON FeatureCollection with live simulated risk tiers."""
    global SIMULATE_RAIN_SPIKE
    from models import TerrainGrid
    async with AsyncSessionLocal() as session:
        rain_modifier = 0.5 if SIMULATE_RAIN_SPIKE else (rainfall_delta / 200.0)
        
        result = await session.execute(select(TerrainGrid).limit(200))
        cells = result.scalars().all()
        
        features = []
        for cell in cells:
            probability = min(1.0, max(0.0,
                (cell.slope / 45.0) * 0.4 +
                ((cell.elevation or 1000) / 3000.0) * 0.2 +
                rain_modifier
            ))
            # Build a tiny square polygon around the point
            d = 0.005
            coords = [[
                [cell.lon - d, cell.lat - d],
                [cell.lon + d, cell.lat - d],
                [cell.lon + d, cell.lat + d],
                [cell.lon - d, cell.lat + d],
                [cell.lon - d, cell.lat - d],
            ]]
            features.append({
                "type": "Feature",
                "id": cell.id,
                "geometry": {"type": "Polygon", "coordinates": coords},
                "properties": {
                    "elevation": cell.elevation,
                    "slope": cell.slope,
                    "probability": round(probability, 3)
                }
            })
        
        return JSONResponse(content={"type": "FeatureCollection", "features": features})

@app.get("/api/v1/weather/current")
async def get_current_weather():
    """Returns the latest weather observations for the 3 representative points."""
    async with AsyncSessionLocal() as session:
        # We need the most recent record per location.
        # SQLite / Postgres window functions or simple distinct/group by.
        # For simplicity, we just fetch the last 3 records ordered by timestamp desc
        query = select(WeatherObservation).order_by(desc(WeatherObservation.timestamp)).limit(3)
        result = await session.execute(query)
        obs_list = result.scalars().all()
        
        return [
            {
                "lat": obs.lat,
                "lon": obs.lon,
                "timestamp": obs.timestamp,
                "rainfall_1h": obs.rainfall_1h,
                "rainfall_24h_sum": obs.rainfall_24h_sum,
                "soil_moisture": obs.soil_moisture,
                "is_stale": obs.is_stale
            }
            for obs in obs_list
        ]

@app.post("/api/v1/weather/force_fetch")
async def force_weather_fetch(fail: bool = Query(False, description="Simulate failure to test staleness")):
    """Force an immediate weather fetch."""
    await ingest_weather_data(force_fail=fail)
    return {"status": "ok", "message": f"Weather fetch triggered (fail={fail})"}

from services.inference import predict_risk

@app.get("/api/v1/risk", tags=["Risk Analysis"], summary="Get Landslide Risk Prediction")
@limiter.limit("60/minute")
async def get_risk(request: Request, lat: float, lon: float):
    """
    Returns the landslide probability, severity tier, and top SHAP contributing factors
    for the given coordinates.
    """
    try:
        pred, exps = await predict_risk(lat, lon)
        return {
            "lat": lat,
            "lon": lon,
            "risk_probability": round(pred.probability, 4),
            "probability": round(pred.probability, 4),
            "severity_tier": pred.severity_tier,
            "severity": pred.severity_tier,
            "timestamp": pred.timestamp.isoformat(),
            "top_factors": [
                {
                    "feature": e.feature_name,
                    "contribution": round(e.contribution_value, 4),
                    "is_positive_driver": e.is_positive_driver
                }
                for e in exps
            ]
        }
    except Exception as e:
        logger.error(f"Inference error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/reports", tags=["Citizen Reporting"], summary="List Active Citizen Reports")
async def get_active_reports():
    from models import IncidentCluster
    async with AsyncSessionLocal() as session:
        query = select(IncidentCluster).where(IncidentCluster.status == "active")
        result = await session.execute(query)
        clusters = result.scalars().all()
        return [{"id": c.id, "lat": c.lat, "lon": c.lon, "created_at": c.created_at} for c in clusters]

@app.get("/api/v1/roads-impacted", tags=["Impact Analysis"], summary="Get Roads Impacted by High Risk")
async def get_roads_impacted(role: str = Depends(require_authority)):
    """Protected endpoint for authorities to plan road closures."""
    # In a real setup, we would run ST_Intersects against the risk predictions table and road network.
    # We will mock the return payload here for API stability.
    return {
        "status": "success",
        "impacted_segments": [
            {"highway_class": "national", "name": "NH-13", "risk_level": "Critical"}
        ]
    }

@app.get("/api/v1/alerts", tags=["Alerts"], summary="Get recent alerts")
async def get_alerts():
    from models import AlertLog
    async with AsyncSessionLocal() as session:
        query = select(AlertLog).order_by(desc(AlertLog.sent_at)).limit(5)
        result = await session.execute(query)
        alerts = result.scalars().all()
        return [
            {
                "id": a.id,
                "audience": a.audience_tier,
                "severity": a.severity_tier,
                "channel": a.channel,
                "message": a.message_payload,
                "sent_at": a.sent_at
            }
            for a in alerts
        ]

@app.get("/api/v1/routes/safe", tags=["Routing"], summary="Plan Safe Evacuation Route")
async def get_safe_route():
    """Returns a mock GeoJSON LineString dodging high-risk zones for the demo."""
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"name": "Safe Evacuation Corridor", "color": "#22c55e"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [92.4, 27.15],
                    [92.45, 27.25], 
                    [92.55, 27.28],
                    [92.6, 27.2]
                ]
            }
        }]
    }

@app.get("/api/v1/history/replay", tags=["Simulation"], summary="Replay Historical Event")
async def get_history_replay():
    """Returns timeline frames for the 2022 Dima Hasao event mock."""
    return {
        "event": "Dima Hasao 2022",
        "frames": [
            {"time": "T-48h", "risk_modifier": 0.0, "description": "Normal conditions."},
            {"time": "T-24h", "risk_modifier": 0.2, "description": "Heavy rainfall begins."},
            {"time": "T-6h", "risk_modifier": 0.5, "description": "Soil saturation critical."},
            {"time": "T-0h", "risk_modifier": 0.8, "description": "Landslide initiated."}
        ]
    }
