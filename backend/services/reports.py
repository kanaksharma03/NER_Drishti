import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import CitizenReport, IncidentCluster
from services.exif import check_for_spoofing, haversine_distance

async def process_report(
    session: AsyncSession,
    report_type: str,
    description: str,
    lat: float,
    lon: float,
    photo_path: str = None,
    region_id: int = None
) -> CitizenReport:
    """
    1. Checks for spoofing.
    2. Finds a nearby active IncidentCluster (within 300m, last 12h) or creates a new one.
    3. Saves the CitizenReport.
    """
    is_spoofed = check_for_spoofing(photo_path, lat, lon)

    if is_spoofed:
        report = CitizenReport(
            region_id=region_id,
            type=report_type,
            description=description,
            lat=lat,
            lon=lon,
            photo_path=photo_path,
            is_spoofed=True,
            submitted_at=datetime.datetime.now(datetime.timezone.utc)
        )
        session.add(report)
        await session.commit()
        return report

    twelve_hours_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=12)
    
    stmt = select(IncidentCluster).where(
        and_(
            IncidentCluster.status == "active",
            IncidentCluster.created_at >= twelve_hours_ago
        )
    ).order_by(IncidentCluster.created_at.desc())

    result = await session.execute(stmt)
    clusters = result.scalars().all()

    cluster = None
    for c in clusters:
        if haversine_distance(lat, lon, c.lat, c.lon) <= 300:
            cluster = c
            break

    if not cluster:
        cluster = IncidentCluster(
            region_id=region_id,
            lat=lat,
            lon=lon,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            status="active"
        )
        session.add(cluster)
        await session.flush()

    report = CitizenReport(
        region_id=region_id,
        cluster_id=cluster.id,
        type=report_type,
        description=description,
        lat=lat,
        lon=lon,
        photo_path=photo_path,
        is_spoofed=False,
        submitted_at=datetime.datetime.now(datetime.timezone.utc)
    )
    session.add(report)
    await session.commit()
    
    return report

async def get_recent_clusters(session: AsyncSession, lat: float, lon: float, radius_meters: float = 1000):
    """Used by the Verification engine to find nearby active clusters"""
    twenty_four_hours_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
    
    stmt = select(IncidentCluster).where(
        and_(
            IncidentCluster.status == "active",
            IncidentCluster.created_at >= twenty_four_hours_ago
        )
    )
    result = await session.execute(stmt)
    clusters = result.scalars().all()
    return [c for c in clusters if haversine_distance(lat, lon, c.lat, c.lon) <= radius_meters]
