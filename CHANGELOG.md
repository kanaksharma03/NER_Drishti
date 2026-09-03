# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added (Checkpoint 11)
- Created `seed.py` to populate DB with a realistic NH-13 grid.
- Implemented graceful API fallbacks in `ingest.py` to survive offline demo conditions.
- Wrote `test_e2e.py` to verify full pipeline integrity.
- Wrote `demo-script.md` for SIH presentations.
- Polished `README.md` with architecture diagrams and production roadmaps.

### Added (Checkpoint 10)
- Implemented `rainfall_delta` query param on the risk grid endpoint.
- Added a dynamic "What-If" Cloudburst Slider to the frontend MapDashboard for real-time hazard recalibration.
- Created `GET /api/v1/routes/safe` and a "Plan Safe Route" UI toggle to map evacuation paths dodging critical zones.
- Created `GET /api/v1/history/replay` tracking the 2022 Dima Hasao timeline.
- Built a Timeline Scrubber UI component to automatically playback historical hazard escalation.

### Added (Checkpoint 9)
- Added `AlertLog` table to Postgres for auditing message dispatch.
- Built a delivery abstraction layer (`alerts.py`) with `InApp`, `SMSStub`, and `TelegramStub` channels.
- Built `alert_templates.py` containing English, Hindi, and Assamese warnings.
- Integrated background alert dispatching into the Verification Engine for High/Critical risks.
- Built a live Alert Feed into the MapDashboard utilizing sliding CSS toast notifications.

### Added (Checkpoint 8)
- Added `GET /api/v1/risk/grid` and a rain spike simulator mock in `main.py`.
- Installed `maplibre-gl` and `lucide-react` in the frontend.
- Built a live-updating `MapDashboard.jsx` with a Carto Dark Matter base map.
- Built a glassmorphism `SidePanel.jsx` to display SHAP and verification data on click.
- Styled the entire application with a premium dark mode aesthetic in `App.css`.

### Added (Checkpoint 7)
- Added `PyJWT`, `passlib`, and `slowapi` for authentication and rate limiting.
- Configured a JWT-based Auth service (`auth.py`) granting role-based access (`authority` vs `public`).
- Added in-memory rate limiting via `slowapi` to protect public endpoints.
- Expanded the `/docs` OpenAPI schema with tags and summaries.
- Added `GET /api/v1/roads-impacted` and `GET /api/v1/reports` endpoints.

### Added (Checkpoint 6)
- Created `IncidentCluster` and `CitizenReport` models in PostGIS.
- Integrated `exifread` for EXIF GPS extraction and Haversine anti-spoofing distance calculation.
- Added dynamic spatial clustering (300m radius) using PostGIS `ST_DWithin` for incoming reports.
- Added a +0.25 Bayesian confidence uplift to the Verification Engine when verified reports are nearby.
- Built a robust `ReportForm.jsx` React component utilizing `navigator.geolocation` and `IndexedDB` for offline-first queuing in dead zones.
- Created `POST /api/v1/reports/submit` endpoint accepting multipart/form-data.

### Added (Checkpoint 5)
- Implemented `VerificationResult` and `Recommendation` PostGIS tables using JSON columns.
- Built a rule-based signal verification engine in `verification.py` to calculate prediction confidence.
- Integrated automated actionable priority mapping (P1/P2/P3) into the `/api/v1/risk` endpoint payload.
- Added `docs/decision-logic.md` to establish and document the rule thresholds.

### Added (Checkpoint 4)
- Extracted database setup logic into `backend/database.py` for cleaner imports.
- Added `RiskPrediction` and `RiskExplanation` SQLAlchemy models for auditability.
- Added `shap` and `xgboost` to backend dependencies.
- Created `predict_risk` service using TreeSHAP to map probabilities to severity tiers and isolate top 3 contributing factors.
- Implemented `GET /api/v1/risk` inference API endpoint.

### Added (Checkpoint 3)
- Wrote `ml/train_model.py` to ingest historical landslide CSVs and compute pseudo-absence negative samples.
- Trained an XGBoost baseline classifier using Spatial Group K-Fold cross-validation.
- Generated `ml/reports/model_v1_evaluation.txt` containing backtest accuracy/precision/recall.
- Serialized the trained model to `ml/models/xgb_v1.joblib`.

### Added (Checkpoint 2)
- Created `WeatherObservation` SQLAlchemy model to store realtime weather metrics and staleness status.
- Built an async Open-Meteo ingestion service fetching data for 3 representative points along the corridor.
- Implemented logic to compute rolling precipitation sums (1h, 24h, 72h), 24h forecast, and current soil moisture.
- Integrated a background task via FastAPI's lifespan to poll weather data continuously.
- Added `/api/v1/weather/current` endpoint to retrieve live conditions and `/api/v1/weather/force_fetch` with a `fail` toggle to demonstrate the staleness checking.

### Added (Checkpoint 1)
- Defined NH-13 Bhalukpong–Tawang pilot corridor bounding box.
- Added `TerrainGrid` and `Road` SQLAlchemy models with PostGIS spatial types.
- Wrote `backend/scripts/ingest.py` to download SRTM DEM, compute slope/aspect/curvature via finite differences, and download OSM roads via `osmnx`.
- Added `GET /api/v1/terrain` endpoint to serve grid cells as GeoJSON.
- Updated MapLibre frontend to fetch and render the terrain grid with a slope-based heatmap coloring.

### Added (Checkpoint 0)
- Initial repository structure (`/backend`, `/frontend`, `/data`, `/ml`, `/docs`).
- `docker-compose.yml` orchestrating PostgreSQL+PostGIS, FastAPI backend, and React frontend.
- FastAPI backend with a `/health` endpoint configured with an async SQLAlchemy connection to Postgres.
- React frontend scaffolded using Vite and pre-configured with a blank MapLibre GL map base layer (OSM).
- `README.md` and this `CHANGELOG.md` file.
