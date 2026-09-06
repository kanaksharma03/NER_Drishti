# NER-DRISHTI Project Knowledge Base

This document represents the strictly verified, honest state of the NER-DRISHTI project. It distinguishes what is actually working in the codebase from what was merely planned or claimed.

## 1. Project Summary
- **Problem Statement (SIH 26001)**: An early warning system for landslides and terrain hazards in the North Eastern Region. It answers: What is the risk? Where is the risk? Why is it happening? What should we do?
- **Pilot Corridor**: NH-13 (Bomdila to Bhalukpong area). Bounding box/center currently hardcoded in frontend as `[92.4, 27.15]`.
- **Core Constraints**: Software-only (no IoT dependency), offline-first frontend reporting capabilities, strict adherence to a 4-tier semantic risk gradient (`Low`, `Moderate`, `High`, `Critical`).

## 2. Backend Status
*Note: Evaluated against `backend/main.py` and SQLite `nerdrishti.db`.*

- **Checkpoint 1 (Auth)**: **VERIFIED**. `POST /api/v1/token` exists and successfully mints JWTs.
- **Checkpoint 3 (Risk Grid)**: **VERIFIED BROKEN**. `GET /api/v1/risk/grid` is implemented in FastAPI, but the `terrain_cells` table in the database is missing or empty (as evidenced by earlier `test_checkpoint12.py` failures). The endpoint throws a 500/Internal Error.
- **Checkpoint 4 (Explainability/Weather)**: **VERIFIED BROKEN**. `GET /api/v1/risk` and `GET /api/v1/weather/current` exist in the code, but depend on missing/empty DB tables (`TerrainGrid`, `WeatherObservation`).
- **Checkpoint 5 (Alerts)**: **CLAIMED/UNKNOWN**. `GET /api/v1/alerts` is written in `main.py` querying `AlertLog`, but the database population is unverified.
- **Checkpoints 6-11**: **UNSTARTED/MOCKED**. Endpoints like `/api/v1/reports/submit` and `/api/v1/simulate/rain` exist as stubs/mocks in `main.py`, but have no active business logic.

## 3. Frontend Status
*Note: Evaluated against active React components and `api.js`.*

- **Checkpoint 0 (Design Shell)**: **VERIFIED**. Tokens and typography are fully active.
- **Checkpoint 1 (Auth & Routing)**: **VERIFIED**. React Router and JWT `AuthContext` are actively protecting routes.
- **Checkpoint 2 (GIS Core)**: **VERIFIED**. MapLibre rendering OpenFreeMap dark style. NH-13 renders via fallback LineString in `api.js`.
- **Checkpoint 3 (Risk Layer)**: **VERIFIED MOCKED**. The risk grid is **NOT** coming from the backend. Because `/api/v1/risk/grid` fails, `api.js` procedurally generates a 100-cell mock grid in JS memory on every load.
- **Checkpoint 4 (Weather & SHAP)**: **VERIFIED MOCKED**. 
  - SHAP explanation values are **MOCKED** inside `api.js` (`fetchRiskDetails`) because the backend lacks the data.
  - WeatherPanel correctly catches backend failures and renders an explicit "Weather data unavailable" empty state (no fake numbers used).
- **Checkpoint 5 (Alerts)**: **VERIFIED MOCKED**. `AlertCenter` uses mock data. Clicking an alert successfully navigates to `/` and highlights the corresponding risk cell.
- **UI Bugs Deprioritized**: MapLibre base map renders Chinese place labels for certain villages (due to OpenFreeMap `name:nonlatin` fallbacks over disputed borders). This is intentionally deprioritized.

## 4. Design System
*Exact values pulled from `frontend/src/design/tokens.css` and `risk-gradient.js`.*

**Backgrounds & Surfaces**
- `--bg-base`: `#12181C`
- `--bg-surface`: `#1B2329`
- `--bg-surface-raised`: `#232C33`

**UI Chrome & Text**
- `--border-hairline`: `#2E383F`
- `--accent-ui`: `#5FA8D3` (Used for SHAP positive contributions and map selection highlights)
- `--text-primary`: `#E8EDEE`
- `--text-secondary`: `#8FA0A8`

**Risk Gradient (Exclusive for Severity)**
- `Low`: `#4A7C6F`
- `Moderate`: `#C9A24B`
- `High`: `#D9732E`
- `Critical`: `#B23A3A`

**Typography**
- `--font-display`: 'Archivo', sans-serif
- `--font-body`: 'IBM Plex Sans', sans-serif
- `--font-mono`: 'IBM Plex Mono', monospace

## 5. API Contract
*Actual endpoints active in `backend/main.py` right now:*

- `POST /api/v1/token` 
  - Request: `OAuth2PasswordRequestForm` (username, password)
  - Response: `{"access_token": "...", "token_type": "bearer"}`
- `GET /api/v1/risk/grid?rainfall_delta=float`
  - Response: GeoJSON FeatureCollection with polygon geometries and properties `{elevation, slope, probability}`
- `GET /api/v1/weather/current`
  - Response: Array `[{lat, lon, timestamp, rainfall_1h, rainfall_24h_sum, soil_moisture, is_stale}]`
- `GET /api/v1/risk?lat=x&lon=y`
  - Response: `{lat, lon, risk_probability, severity_tier, top_factors: [{feature, contribution, is_positive_driver}]}`
- `GET /api/v1/alerts`
  - Response: Array `[{id, audience, severity, channel, message, sent_at}]`
- `POST /api/v1/reports/submit`
  - Request: Form data (type, description, lat, lon, photo)
  - Response: `{status, is_spoofed, cluster_id}`

## 6. Known Issues / Technical Debt
1. **Broken Backend DB Integration**: The API endpoints exist, but the SQLite schema appears out of sync or unseeded (missing `terrain_cells` / empty `TerrainGrid`). 
2. **Frontend Mock Dependency**: The frontend is heavily reliant on `api.js` catch-blocks generating fake GeoJSON and SHAP arrays to bypass the 500 Internal Server Errors from the backend.
3. **MapLibre Bounding Box**: When selecting an alert from the Alert Center, the dashboard highlights the geometry but does not execute a `flyTo` camera animation because the mock data lacks computed bounding boxes.

## 7. Environment & Setup

**Backend**
```bash
cd backend
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## 8. What's Next
**Checkpoint 6 — Citizen/field reporting**: 
The next feature to build is the crowdsourcing loop. This requires complex frontend work involving the Geolocation API, camera capture, and an IndexedDB queue (`useOfflineQueue.js`) to persist reports when offline and auto-sync when network connectivity returns.

**Human Decision Required**: The backend database must be fixed/seeded so the frontend can remove its mock dependency. Someone needs to run `seed.py` or apply the Alembic/SQLAlchemy migrations to restore the `TerrainGrid` data.
