from sqlalchemy import Column, Integer, String, Float, MetaData, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import declarative_base

metadata = MetaData()
Base = declarative_base(metadata=metadata)

class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String, nullable=False)       # "Arunachal Pradesh", "Sikkim", "Meghalaya"
    district = Column(String, nullable=False)    # "West Kameng", "East Sikkim", "East Khasi Hills"
    corridor_name = Column(String)               # "NH-13 Bomdila–Bhalukpong", "NH-10 Gangtok Corridor", etc.
    center_lat = Column(Float, nullable=False)
    center_lon = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

class TerrainGrid(Base):
    __tablename__ = "terrain_grid"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    elevation = Column(Float)
    slope = Column(Float)
    aspect_sin = Column(Float)
    aspect_cos = Column(Float)
    plan_curvature = Column(Float)
    profile_curvature = Column(Float)
    twi = Column(Float)

class Road(Base):
    __tablename__ = "roads"
    
    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    highway_class = Column(String)
    name = Column(String)

from sqlalchemy import DateTime, Boolean, ForeignKey

class WeatherObservation(Base):
    __tablename__ = "weather_observations"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    lat = Column(Float)
    lon = Column(Float)
    timestamp = Column(DateTime(timezone=True), index=True)
    rainfall_1h = Column(Float)
    rainfall_24h_sum = Column(Float)
    rainfall_72h_sum = Column(Float)
    rainfall_24h_forecast = Column(Float)
    soil_moisture = Column(Float)
    is_stale = Column(Boolean, default=False)

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    lat = Column(Float)
    lon = Column(Float)
    timestamp = Column(DateTime(timezone=True), index=True)
    probability = Column(Float)
    severity_tier = Column(String)
    model_version = Column(String)

class RiskExplanation(Base):
    __tablename__ = "risk_explanations"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("risk_predictions.id"))
    feature_name = Column(String)
    contribution_value = Column(Float)
    is_positive_driver = Column(Boolean)

class VerificationResult(Base):
    __tablename__ = "verification_results"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("risk_predictions.id"))
    confidence_score = Column(Float)
    supporting_signals = Column(JSON)
    missing_signals = Column(JSON)

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("risk_predictions.id"))
    priority = Column(String)
    recommended_action = Column(String)
    rule_version = Column(String)

class IncidentCluster(Base):
    __tablename__ = "incident_clusters"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    lat = Column(Float)
    lon = Column(Float)
    created_at = Column(DateTime)
    status = Column(String, default="active")

class CitizenReport(Base):
    __tablename__ = "citizen_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("incident_clusters.id"))
    type = Column(String)
    description = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    photo_path = Column(String)
    is_spoofed = Column(Boolean)
    submitted_at = Column(DateTime)

class AlertLog(Base):
    __tablename__ = "alert_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    audience_tier = Column(String)  # public, authority
    severity_tier = Column(String)
    channel = Column(String)        # in_app, sms, telegram
    recipient = Column(String)
    message_payload = Column(String)
    status = Column(String)
    sent_at = Column(DateTime)

