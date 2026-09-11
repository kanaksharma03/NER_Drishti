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
    return {"access_token": access_token, "token_type": "bearer", "role": role.capitalize()}

@app.post("/api/v1/reports/submit", tags=["Citizen Reporting"], summary="Submit an incident report")
@limiter.limit("5/minute")
async def submit_report(
    request: Request,
    type: str = Form(...),
    description: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    photo: UploadFile = File(...),
    region_id: int | None = Form(None)
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
            photo_path=file_path,
            region_id=region_id
        )
        
    return {
        "status": "success",
        "is_spoofed": report.is_spoofed,
        "cluster_id": report.cluster_id
    }

@app.get("/api/v1/regions", tags=["Regions"], summary="List monitored regions/districts")
async def get_regions():
    from models import Region
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Region).where(Region.is_active == True))
        regions = result.scalars().all()
        return [
            {
                "id": r.id,
                "state": r.state,
                "district": r.district,
                "corridor_name": r.corridor_name,
                "center_lat": r.center_lat,
                "center_lon": r.center_lon,
            }
            for r in regions
        ]

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
async def get_risk_grid(rainfall_delta: float = Query(0.0, description="Simulate cloudburst (mm of rain)"), region_id: int | None = Query(None)):
    """Returns terrain grid as GeoJSON FeatureCollection with live simulated risk tiers."""
    global SIMULATE_RAIN_SPIKE
    from models import TerrainGrid
    async with AsyncSessionLocal() as session:
        rain_modifier = 0.5 if SIMULATE_RAIN_SPIKE else (rainfall_delta / 200.0)
        
        stmt = select(TerrainGrid)
        if region_id is not None:
            stmt = stmt.where(TerrainGrid.region_id == region_id)
        else:
            stmt = stmt.limit(200)
            
        result = await session.execute(stmt)
        cells = result.scalars().all()
        
        features = []
        for cell in cells:
            probability = min(1.0, max(0.0,
                (cell.slope / 45.0) * 0.4 +
                ((cell.elevation or 1000) / 3000.0) * 0.2 +
                rain_modifier
            ))
            # Build a corridor cell polygon around point
            d = 0.002
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
async def get_current_weather(region_id: int = Query(...)):
    """Returns the latest weather observations."""
    async with AsyncSessionLocal() as session:
        stmt = select(WeatherObservation).where(WeatherObservation.region_id == region_id).order_by(desc(WeatherObservation.timestamp)).limit(1)
        result = await session.execute(stmt)
        obs = result.scalar_one_or_none()
        
        if not obs:
            return {}
            
        return {
            "region_id": obs.region_id,
            "rainfall_1h": obs.rainfall_1h,
            "rainfall_24h": obs.rainfall_24h_sum,
            "rainfall_72h": obs.rainfall_72h_sum,
            "soil_moisture": obs.soil_moisture,
            "updated_at": obs.timestamp.isoformat() if obs.timestamp else None
        }

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
async def get_active_reports(region_id: int | None = Query(None)):
    from models import CitizenReport, IncidentCluster
    async with AsyncSessionLocal() as session:
        query = select(CitizenReport, IncidentCluster.status).join(IncidentCluster, CitizenReport.cluster_id == IncidentCluster.id).where(IncidentCluster.status == "active")
        if region_id is not None:
            query = query.where(CitizenReport.region_id == region_id)
        result = await session.execute(query)
        rows = result.all()
        return [
            {
                "id": str(r.CitizenReport.id),
                "report_type": r.CitizenReport.type,
                "description": r.CitizenReport.description,
                "lat": r.CitizenReport.lat,
                "lon": r.CitizenReport.lon,
                "photo_url": r.CitizenReport.photo_path,
                "status": r.status,
                "created_at": r.CitizenReport.submitted_at.isoformat() if r.CitizenReport.submitted_at else None
            }
            for r in rows
        ]

@app.get("/api/v1/roads-impacted", tags=["Impact Analysis"], summary="Get Roads Impacted by High Risk")
async def get_roads_impacted(region_id: int | None = Query(None)):
    """Returns impacted road segments for the selected region."""
    ROADS_BY_REGION = {
        1: [
            {"name": "NH-13", "highway_class": "National Highway", "risk_level": "Critical", "affected_segment": "Bhalukpong–Bomdila Stretch (KM 42)"},
            {"name": "SH-4", "highway_class": "State Highway", "risk_level": "High", "affected_segment": "Tenga Valley Cut (KM 18)"}
        ],
        2: [
            {"name": "NH-10", "highway_class": "National Highway", "risk_level": "Critical", "affected_segment": "Gangtok–Nathula Corridor (KM 24)"},
            {"name": "Ranka Road", "highway_class": "District Road", "risk_level": "Moderate", "affected_segment": "Lower Ranka Bypass"}
        ],
        3: [
            {"name": "NH-6", "highway_class": "National Highway", "risk_level": "Critical", "affected_segment": "Shillong–Cherrapunji Highway (KM 31)"},
            {"name": "Mawkdok Road", "highway_class": "State Highway", "risk_level": "High", "affected_segment": "Duwan Sing Syiem Bridge Approach"}
        ]
    }
    target_id = region_id or 1
    segments = ROADS_BY_REGION.get(target_id, ROADS_BY_REGION[1])
    return {
        "status": "success",
        "region_id": target_id,
        "impacted_segments": segments
    }

@app.get("/api/v1/alerts", tags=["Alerts"], summary="Get recent alerts")
async def get_alerts():
    from models import AlertLog
    async with AsyncSessionLocal() as session:
        query = select(AlertLog).order_by(desc(AlertLog.sent_at)).limit(10)
        result = await session.execute(query)
        alerts = result.scalars().all()
        return [
            {
                "id": a.id,
                "audience_tier": a.audience_tier,
                "severity_tier": a.severity_tier,
                "channel": a.channel,
                "message_payload": a.message_payload,
                "sent_at": a.sent_at.isoformat() if a.sent_at else None
            }
            for a in alerts
        ]

async def get_current_grid_cells(region_id: int):
    from models import TerrainGrid
    async with AsyncSessionLocal() as session:
        stmt = select(TerrainGrid)
        if region_id is not None:
            stmt = stmt.where(TerrainGrid.region_id == region_id)
        result = await session.execute(stmt)
        return result.scalars().all()

def route_intersects_critical(route_coords, grid_cells):
    """
    Simple prototype check: for each coordinate point on the route, 
    check whether it falls inside any grid cell currently classified Critical (probability >= 0.80).
    This is a rule-based check using bounding-boxes, not a road-network pathfinding engine.
    """
    global SIMULATE_RAIN_SPIKE
    rain_modifier = 0.5 if SIMULATE_RAIN_SPIKE else 0.0
    d = 0.005
    for cell in grid_cells:
        prob = min(1.0, max(0.0,
            (cell.slope / 45.0) * 0.4 +
            ((cell.elevation or 1000) / 3000.0) * 0.2 +
            rain_modifier
        ))
        if prob >= 0.8:
            cell_min_lon = cell.lon - d
            cell_max_lon = cell.lon + d
            cell_min_lat = cell.lat - d
            cell_max_lat = cell.lat + d
            for lon, lat in route_coords:
                if (cell_min_lon <= lon <= cell_max_lon) and (cell_min_lat <= lat <= cell_max_lat):
                    return True
    return False

@app.get("/api/v1/routes/safe", tags=["Routing"], summary="Plan Safe Evacuation Route")
async def get_safe_route(region_id: int = Query(...)):
    """
    Returns a primary route and, if the primary route crosses any current
    Critical-risk grid cell, flags it blocked and returns an alternate route
    instead.
    """
    ROUTES = {
        1: {  # Arunachal Pradesh — NH-13
            "corridor": "NH-13 Bhalukpong–Bomdila",
            "hazard_segment": "Bhalukpong Slide Zone (KM 42)",
            "center": [92.50, 27.22],
            "primary": [[92.4, 27.15], [92.45, 27.20], [92.50, 27.24], [92.60, 27.28]],
            "alternate": [[92.4, 27.15], [92.35, 27.18], [92.42, 27.26], [92.60, 27.28]],
            "distance_km": 48.5,
            "estimated_time_min": 65,
        },
        2: {  # Sikkim — NH-10
            "corridor": "NH-10 Gangtok–Nathula Corridor",
            "hazard_segment": "Gangtok Slide Cut (KM 24)",
            "center": [88.64, 27.37],
            "primary": [[88.61, 27.33], [88.64, 27.36], [88.67, 27.38], [88.70, 27.42]],
            "alternate": [[88.61, 27.33], [88.58, 27.35], [88.63, 27.40], [88.70, 27.42]],
            "distance_km": 34.2,
            "estimated_time_min": 48,
        },
        3: {  # Meghalaya — NH-6
            "corridor": "NH-6 Shillong–Cherrapunji Corridor",
            "hazard_segment": "Mawkdok Gorge Segment (KM 31)",
            "center": [91.82, 25.46],
            "primary": [[91.88, 25.57], [91.82, 25.46], [91.75, 25.40], [91.70, 25.35]],
            "alternate": [[91.88, 25.57], [91.94, 25.50], [91.82, 25.38], [91.70, 25.35]],
            "distance_km": 56.8,
            "estimated_time_min": 74,
        },
    }

    route_data = ROUTES.get(region_id, ROUTES[1])
    grid_cells = await get_current_grid_cells(region_id)

    is_primary_blocked = route_intersects_critical(route_data["primary"], grid_cells)
    active_coords = route_data["alternate"] if is_primary_blocked else route_data["primary"]
    route_status = "BLOCKED — ALTERNATE ROUTE ACTIVE" if is_primary_blocked else "PRIMARY ROUTE CLEAR"
    avoided_segment = f"{route_data['hazard_segment']} [REROUTED]" if is_primary_blocked else route_data["hazard_segment"]

    return {
        "status": route_status,
        "region_id": region_id,
        "corridor": route_data["corridor"],
        "is_primary_blocked": is_primary_blocked,
        "distance_km": route_data["distance_km"],
        "estimated_time_min": route_data["estimated_time_min"],
        "avoided_segment": avoided_segment,
        "center": route_data["center"],
        "primary_route": {
            "type": "Feature",
            "properties": {
                "name": "Primary Route", 
                "role": "primary", 
                "color": "#ef4444" if is_primary_blocked else "#22c55e"
            },
            "geometry": {"type": "LineString", "coordinates": route_data["primary"]}
        },
        "alternate_route": {
            "type": "Feature",
            "properties": {
                "name": "Alternate Route", 
                "role": "alternate", 
                "color": "#5752a4" if is_primary_blocked else "#94a3b8"
            },
            "geometry": {"type": "LineString", "coordinates": route_data["alternate"]}
        },
        "active_route": active_coords
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
