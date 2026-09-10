import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.sql import func
from geoalchemy2.elements import WKTElement
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import CitizenReport, IncidentCluster
from services.exif import check_for_spoofing

async def process_report(
    session: AsyncSession,
    report_type: str,
    description: str,
    lat: float,
    lon: float,
    photo_path: str,
    region_id: int = None
) -> CitizenReport:
    """
    1. Checks for spoofing.
    2. Finds a nearby active IncidentCluster (within 300m, last 12h) or creates a new one.
    3. Saves the CitizenReport.
    """
    is_spoofed = check_for_spoofing(photo_path, lat, lon)

    if is_spoofed:
        # We still save it for auditing but don't cluster it with genuine reports
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

    # Look for an active cluster within ~300 meters
    # Using PostGIS ST_DWithin. 4326 is degrees, so we cast to geography for meters distance.
    point_geom = f"SRID=4326;POINT({lon} {lat})"
    
    twelve_hours_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=12)
    
    stmt = select(IncidentCluster).where(
        and_(
            IncidentCluster.status == "active",
            IncidentCluster.created_at >= twelve_hours_ago,
            func.ST_DWithin(
                func.ST_GeographyFromText(func.ST_AsText(IncidentCluster.geom)),
                func.ST_GeographyFromText(point_geom),
                300  # meters
            )
        )
    ).order_by(IncidentCluster.created_at.desc()).limit(1)

    result = await session.execute(stmt)
    cluster = result.scalars().first()

    if not cluster:
        cluster = IncidentCluster(
            region_id=region_id,
            geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
            lat=lat,
            lon=lon,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            status="active"
        )
        session.add(cluster)
        await session.flush() # flush to get cluster.id

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
    point_geom = f"SRID=4326;POINT({lon} {lat})"
    twenty_four_hours_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=24)
    
    stmt = select(IncidentCluster).where(
        and_(
            IncidentCluster.status == "active",
            IncidentCluster.created_at >= twenty_four_hours_ago,
            func.ST_DWithin(
                func.ST_GeographyFromText(func.ST_AsText(IncidentCluster.geom)),
                func.ST_GeographyFromText(point_geom),
                radius_meters
            )
        )
    )
    result = await session.execute(stmt)
    return result.scalars().all()
