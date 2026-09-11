"""
NER-DRISHTI local demo seed.
Run once (or repeatedly — it is fully idempotent) to populate the SQLite
database with the minimum records needed for a live E2E demo.

Idempotency strategy
--------------------
* Regions / TerrainGrid: guarded by SELECT before INSERT (id-based).
* IncidentCluster:       guarded by SELECT on (region_id, lat, lon).
* CitizenReport:         guarded by SELECT on (description, region_id).
* AlertLog:              guarded by SELECT on (message_payload, region_id).

Re-running seed.py is safe at any time.
"""
import asyncio
import random
import math
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import (
    Base, TerrainGrid, Region,
    IncidentCluster, CitizenReport, AlertLog,
)
from database import db_url

# ---------------------------------------------------------------------------
# Static region definitions (must match what is in production)
# ---------------------------------------------------------------------------
REGIONS = [
    {
        "id": 1,
        "state": "Arunachal Pradesh", "district": "West Kameng",
        "corridor_name": "NH-13 Bomdila–Bhalukpong",
        "center_lat": 27.15, "center_lon": 92.40,
    },
    {
        "id": 2,
        "state": "Sikkim", "district": "East Sikkim",
        "corridor_name": "NH-10 Gangtok–Nathula Corridor",
        "center_lat": 27.33, "center_lon": 88.61,
    },
    {
        "id": 3,
        "state": "Meghalaya", "district": "East Khasi Hills",
        "corridor_name": "NH-6 Shillong–Cherrapunji Corridor",
        "center_lat": 25.35, "center_lon": 91.70,
    },
]

# ---------------------------------------------------------------------------
# Demo alert definitions — one Critical + one High per region (6 total)
# Identity key: (message_payload, region_id)
# ---------------------------------------------------------------------------
_NOW = datetime(2026, 9, 11, 6, 0, 0)

DEMO_ALERTS = [
    # --- Arunachal Pradesh (region 1) ---
    {
        "region_id": 1,
        "audience_tier": "authority",
        "severity_tier": "Critical",
        "channel": "in_app",
        "recipient": "SDMA-AP",
        "message_payload": "[DEMO] CRITICAL: Slope failure probability >0.80 on NH-13 Bomdila–Bhalukpong corridor. Immediate evacuation advisory recommended.",
        "status": "active",
        "sent_at": _NOW - timedelta(hours=1),
    },
    {
        "region_id": 1,
        "audience_tier": "public",
        "severity_tier": "High",
        "channel": "sms",
        "recipient": "public-AP",
        "message_payload": "[DEMO] HIGH RISK: Elevated landslide risk along NH-13 near Bhalukpong. Avoid travel during heavy rain periods.",
        "status": "active",
        "sent_at": _NOW - timedelta(hours=2),
    },
    # --- Sikkim (region 2) ---
    {
        "region_id": 2,
        "audience_tier": "authority",
        "severity_tier": "High",
        "channel": "in_app",
        "recipient": "SDMA-SK",
        "message_payload": "[DEMO] HIGH: Soil saturation index crossing threshold on NH-10 Gangtok–Nathula sector. Pre-position rescue teams.",
        "status": "active",
        "sent_at": _NOW - timedelta(hours=3),
    },
    {
        "region_id": 2,
        "audience_tier": "public",
        "severity_tier": "Moderate",
        "channel": "telegram",
        "recipient": "public-SK",
        "message_payload": "[DEMO] MODERATE: Rainfall accumulation above 72h threshold on NH-10 corridor. Exercise caution on hairpin bends.",
        "status": "active",
        "sent_at": _NOW - timedelta(hours=4),
    },
    # --- Meghalaya (region 3) ---
    {
        "region_id": 3,
        "audience_tier": "authority",
        "severity_tier": "Critical",
        "channel": "in_app",
        "recipient": "SDMA-ML",
        "message_payload": "[DEMO] CRITICAL: Cherrapunji 72h rainfall >1400 mm. Multiple grid cells at probability >0.85 on NH-6. Road closure order advised.",
        "status": "active",
        "sent_at": _NOW - timedelta(minutes=30),
    },
    {
        "region_id": 3,
        "audience_tier": "public",
        "severity_tier": "High",
        "channel": "sms",
        "recipient": "public-ML",
        "message_payload": "[DEMO] HIGH: Shillong–Cherrapunji NH-6 segment under active monitoring. Landslide debris risk elevated overnight.",
        "status": "active",
        "sent_at": _NOW - timedelta(hours=1, minutes=15),
    },
]

# ---------------------------------------------------------------------------
# Demo incident clusters — one per region
# Identity key: (region_id, lat, lon)
# ---------------------------------------------------------------------------
DEMO_CLUSTERS = [
    {"region_id": 1, "lat": 27.18, "lon": 92.43, "created_at": _NOW - timedelta(hours=2), "status": "active"},
    {"region_id": 2, "lat": 27.36, "lon": 88.64, "created_at": _NOW - timedelta(hours=3), "status": "active"},
    {"region_id": 3, "lat": 25.38, "lon": 91.73, "created_at": _NOW - timedelta(hours=1), "status": "active"},
]

# ---------------------------------------------------------------------------
# Demo citizen reports — two per cluster/region
# Identity key: (description, region_id)
# ---------------------------------------------------------------------------
DEMO_REPORTS = [
    # Arunachal Pradesh
    {
        "region_id": 1,
        "cluster_index": 0,  # maps to DEMO_CLUSTERS[0]
        "type": "Landslide",
        "description": "[DEMO] Large debris flow observed blocking NH-13 at km marker 42. Rocks and mud across full carriageway.",
        "lat": 27.182, "lon": 92.431,
        "photo_path": "uploads/demo_ap_landslide.jpg",
        "is_spoofed": False,
        "submitted_at": _NOW - timedelta(hours=1, minutes=45),
    },
    {
        "region_id": 1,
        "cluster_index": 0,
        "type": "Crack / ground movement",
        "description": "[DEMO] Visible ground crack ~3m long on hillside above NH-13, approximately 200m east of Bhalukpong toll.",
        "lat": 27.179, "lon": 92.428,
        "photo_path": "uploads/demo_ap_crack.jpg",
        "is_spoofed": False,
        "submitted_at": _NOW - timedelta(hours=1, minutes=10),
    },
    # Sikkim
    {
        "region_id": 2,
        "cluster_index": 1,
        "type": "Road blockage",
        "description": "[DEMO] NH-10 road blocked by boulders at Rangpo bridge approach. Single-lane passage possible.",
        "lat": 27.362, "lon": 88.641,
        "photo_path": "uploads/demo_sk_road.jpg",
        "is_spoofed": False,
        "submitted_at": _NOW - timedelta(hours=2, minutes=30),
    },
    {
        "region_id": 2,
        "cluster_index": 1,
        "type": "Rainfall anomaly",
        "description": "[DEMO] Exceptionally heavy rainfall since 03:00 IST, rivulets overflowing onto road surface near Singtam.",
        "lat": 27.359, "lon": 88.638,
        "photo_path": "uploads/demo_sk_rain.jpg",
        "is_spoofed": False,
        "submitted_at": _NOW - timedelta(hours=2),
    },
    # Meghalaya
    {
        "region_id": 3,
        "cluster_index": 2,
        "type": "Landslide",
        "description": "[DEMO] Landslide at Cherrapunji–Shillong road km 18. ~50m stretch covered with debris, road impassable.",
        "lat": 25.381, "lon": 91.732,
        "photo_path": "uploads/demo_ml_landslide.jpg",
        "is_spoofed": False,
        "submitted_at": _NOW - timedelta(minutes=50),
    },
    {
        "region_id": 3,
        "cluster_index": 2,
        "type": "Crack / ground movement",
        "description": "[DEMO] Retaining wall showing fresh cracks on NH-6 below Sohra. Cracking ~15m span, needs engineering inspection.",
        "lat": 25.378, "lon": 91.729,
        "photo_path": "uploads/demo_ml_wall.jpg",
        "is_spoofed": False,
        "submitted_at": _NOW - timedelta(minutes=25),
    },
]


async def seed_db():
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Ensure all tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:

        # ------------------------------------------------------------------
        # 1. Regions (id-based idempotency)
        # ------------------------------------------------------------------
        regions_added = 0
        for reg_data in REGIONS:
            existing = await session.get(Region, reg_data["id"])
            if existing is None:
                region = Region(
                    id=reg_data["id"],
                    state=reg_data["state"],
                    district=reg_data["district"],
                    corridor_name=reg_data["corridor_name"],
                    center_lat=reg_data["center_lat"],
                    center_lon=reg_data["center_lon"],
                )
                session.add(region)
                regions_added += 1
        if regions_added:
            await session.flush()
        print(f"Regions: {regions_added} inserted, {len(REGIONS) - regions_added} already present.")

        # ------------------------------------------------------------------
        # 2. TerrainGrid — seed / update 100 corridor cells per region
        # ------------------------------------------------------------------
        CORRIDOR_WAYPOINTS = {
            1: [(27.15, 92.40), (27.20, 92.48), (27.28, 92.60)], # AP NH-13
            2: [(27.33, 88.61), (27.37, 88.65), (27.42, 88.70)], # SK NH-10
            3: [(25.57, 91.88), (25.46, 91.82), (25.35, 91.70)], # ML NH-6
        }

        def gen_corridor(waypoints, n_steps=20, n_offsets=5):
            coords_list = []
            segs = []
            for k in range(len(waypoints) - 1):
                p1, p2 = waypoints[k], waypoints[k + 1]
                dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
                segs.append((p1, p2, dist))
            tot_dist = sum(s[2] for s in segs)
            
            for i in range(n_steps):
                target_d = (i / (n_steps - 1)) * tot_dist if n_steps > 1 else 0
                curr_d = 0
                p1, p2 = segs[0][0], segs[0][1]
                for s in segs:
                    if curr_d + s[2] >= target_d:
                        p1, p2 = s[0], s[1]
                        t = (target_d - curr_d) / s[2] if s[2] > 0 else 0
                        break
                    curr_d += s[2]
                else:
                    t = 1.0
                
                lat_c = p1[0] + t * (p2[0] - p1[0])
                lon_c = p1[1] + t * (p2[1] - p1[1])
                
                dlat = p2[0] - p1[0]
                dlon = p2[1] - p1[1]
                length = math.hypot(dlat, dlon) or 1.0
                plat = -dlon / length
                plon = dlat / length
                
                for j in range(n_offsets):
                    off = (j - (n_offsets - 1) / 2) * 0.0035
                    plat_i = lat_c + off * plat
                    plon_i = lon_c + off * plon
                    coords_list.append((round(plat_i, 5), round(plon_i, 5)))
            return coords_list

        grid_added = 0
        grid_updated = 0
        for reg_data in REGIONS:
            reg_id = reg_data["id"]
            corridor_coords = gen_corridor(CORRIDOR_WAYPOINTS.get(reg_id, CORRIDOR_WAYPOINTS[1]))
            
            stmt = select(TerrainGrid).where(TerrainGrid.region_id == reg_id).order_by(TerrainGrid.id)
            res = await session.execute(stmt)
            existing_cells = res.scalars().all()
            
            if existing_cells:
                for idx, cell in enumerate(existing_cells):
                    if idx < len(corridor_coords):
                        c_lat, c_lon = corridor_coords[idx]
                        cell.lat = c_lat
                        cell.lon = c_lon
                        grid_updated += 1
            else:
                cells = []
                for c_lat, c_lon in corridor_coords:
                    aspect = random.uniform(0, 360)
                    cells.append(TerrainGrid(
                        region_id=reg_id,
                        lat=c_lat,
                        lon=c_lon,
                        elevation=random.uniform(500, 1500),
                        slope=random.uniform(5, 45),
                        aspect_sin=math.sin(math.radians(aspect)),
                        aspect_cos=math.cos(math.radians(aspect)),
                        plan_curvature=random.uniform(-0.5, 0.5),
                        profile_curvature=random.uniform(-0.5, 0.5),
                        twi=random.uniform(5.0, 15.0),
                    ))
                session.add_all(cells)
                grid_added += len(cells)

        if grid_added or grid_updated:
            await session.flush()
        print(f"TerrainGrid: {grid_added} cells inserted, {grid_updated} cells updated to corridor path.")

        # ------------------------------------------------------------------
        # 3. IncidentClusters — identity: (region_id, lat, lon)
        # ------------------------------------------------------------------
        cluster_ids = []   # will be populated with actual DB ids
        clusters_added = 0
        for cl in DEMO_CLUSTERS:
            existing = await session.execute(
                select(IncidentCluster).where(
                    IncidentCluster.region_id == cl["region_id"],
                    IncidentCluster.lat == cl["lat"],
                    IncidentCluster.lon == cl["lon"],
                )
            )
            row = existing.scalar_one_or_none()
            if row is None:
                new_cl = IncidentCluster(
                    region_id=cl["region_id"],
                    lat=cl["lat"],
                    lon=cl["lon"],
                    created_at=cl["created_at"],
                    status=cl["status"],
                )
                session.add(new_cl)
                await session.flush()   # so new_cl.id is assigned
                cluster_ids.append(new_cl.id)
                clusters_added += 1
            else:
                cluster_ids.append(row.id)
        print(f"IncidentClusters: {clusters_added} inserted, {len(DEMO_CLUSTERS) - clusters_added} already present.")

        # ------------------------------------------------------------------
        # 4. CitizenReports — identity: (description, region_id)
        # ------------------------------------------------------------------
        reports_added = 0
        for rpt in DEMO_REPORTS:
            existing = await session.execute(
                select(CitizenReport).where(
                    CitizenReport.description == rpt["description"],
                    CitizenReport.region_id == rpt["region_id"],
                )
            )
            row = existing.scalar_one_or_none()
            if row is None:
                cluster_db_id = cluster_ids[rpt["cluster_index"]]
                new_rpt = CitizenReport(
                    region_id=rpt["region_id"],
                    cluster_id=cluster_db_id,
                    type=rpt["type"],
                    description=rpt["description"],
                    lat=rpt["lat"],
                    lon=rpt["lon"],
                    photo_path=rpt["photo_path"],
                    is_spoofed=rpt["is_spoofed"],
                    submitted_at=rpt["submitted_at"],
                )
                session.add(new_rpt)
                reports_added += 1
        if reports_added:
            await session.flush()
        print(f"CitizenReports: {reports_added} inserted, {len(DEMO_REPORTS) - reports_added} already present.")

        # ------------------------------------------------------------------
        # 5. AlertLogs — identity: (message_payload, region_id)
        # ------------------------------------------------------------------
        alerts_added = 0
        for al in DEMO_ALERTS:
            existing = await session.execute(
                select(AlertLog).where(
                    AlertLog.message_payload == al["message_payload"],
                    AlertLog.region_id == al["region_id"],
                )
            )
            row = existing.scalar_one_or_none()
            if row is None:
                new_al = AlertLog(
                    region_id=al["region_id"],
                    audience_tier=al["audience_tier"],
                    severity_tier=al["severity_tier"],
                    channel=al["channel"],
                    recipient=al["recipient"],
                    message_payload=al["message_payload"],
                    status=al["status"],
                    sent_at=al["sent_at"],
                )
                session.add(new_al)
                alerts_added += 1
        if alerts_added:
            await session.flush()
        print(f"AlertLogs: {alerts_added} inserted, {len(DEMO_ALERTS) - alerts_added} already present.")

        await session.commit()
        print("\nSeed complete. Database is ready for demo.")


if __name__ == "__main__":
    asyncio.run(seed_db())
