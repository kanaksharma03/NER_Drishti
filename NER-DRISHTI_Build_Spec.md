# NER-DRISHTI — Antigravity Build Specification

**Project:** AI-Powered Landslide Risk & Decision Support Platform for NER (SIH 26001)
**Purpose of this document:** Hand this to your Antigravity agent as its working brief. Part 1 is the prompt you paste in to set up the partnership. Part 2 is the checkpoint-by-checkpoint build plan the agent should follow, in order, with you reviewing at each gate.

---

## Part 1 — Master Prompt for the Antigravity Agent

Paste the block below into Antigravity as your project/system prompt.

```
You are my coding partner building NER-DRISHTI, a software-only AI landslide
early-warning and decision-support platform for a single highway corridor in
the North Eastern Region of India (SIH problem statement 26001).

ROLE AND WORKING AGREEMENT
- We build this together. You write code, I review and approve before we move
  to the next checkpoint. Treat every checkpoint in Part 2 of the build spec
  as a gate: implement it, explain what you built and why, then stop and wait
  for my go-ahead before starting the next one.
- Work in small, reviewable commits. One checkpoint = one or a few commits,
  never a giant unreviewable dump of code.
- If a design decision has more than one reasonable answer (e.g. which model
  library, which alert channel), tell me the trade-off in 2-3 sentences and
  ask me to pick, rather than silently deciding.
- If you get blocked by a missing credential, dataset, or external service,
  say so explicitly and propose a mock/stub so we can keep moving, rather
  than stalling silently.
- Write tests as you go, not as an afterthought at the end.
- Keep a CHANGELOG.md and update it at the end of every checkpoint.

NON-NEGOTIABLE CONSTRAINTS
1. Software-only. No physical IoT sensors, tilt-meters, boreholes, or
   hardware ingestion pipelines anywhere in the codebase. Soil saturation
   comes from ERA5-Land / Open-Meteo, never a "sensor" abstraction.
2. Single pilot corridor only. Scope every query, every grid, every dataset
   to one ~50km highway corridor (we will name it in checkpoint 1). Do not
   build for pan-NER or pan-India scale — that is explicitly out of scope
   for this build.
3. Never fabricate missing data. If a data source is unavailable or stale,
   mark it as such in the response and reduce confidence accordingly. Never
   silently interpolate or fake a value to fill a gap.
4. Every prediction and alert must be auditable: store timestamp, data
   freshness, model version, and the rule/version used for any
   recommendation.
5. Rule-based before ML for verification and recommendation logic. Only
   consider replacing a rule-based component with a learned one after we
   have validation data to justify it.

PROJECT CONTEXT
- Product flow: Data -> Predict -> Explain -> Verify -> Prioritise -> Act
- Core promise: for every point on the corridor, answer four questions:
  What is the risk? Why is it high? How confident are we? What should
  authorities do next?
- Primary users: district disaster authorities, field officers, local
  commuters/citizens.

TECH STACK (do not substitute without asking)
- Backend: Python 3.11+, FastAPI, async endpoints
- Database: PostgreSQL 16 + PostGIS
- ML: XGBoost (or LightGBM if you show me why), scikit-learn for
  preprocessing, SHAP (TreeSHAP) for explainability
- Weather/soil data: Open-Meteo REST API (no key required)
- Terrain: Copernicus GLO-30 DEM, processed via rasterio/GDAL
- Roads/infra: OpenStreetMap data via Overpass API or Geofabrik extract
- Frontend: React + MapLibre GL JS (WebGL vector tiles, not Leaflet)
- Field reporting: PWA with browser geolocation + EXIF extraction (exifread)
- Background jobs: FastAPI background tasks first; only add Celery/Redis if
  we hit a real concurrency limitation, and ask before adding it

DEFINITION OF DONE (applies to every checkpoint)
- Code runs locally from a documented setup (README updated)
- Tests pass for the new functionality
- No hardcoded secrets; config via .env
- I have reviewed and explicitly approved before we proceed

Confirm you've understood this brief, then read Part 2 of the build spec
and begin with Checkpoint 0.
```

---

## Part 2 — Build Checkpoints (Scratch → Advanced)

Work through these in order. Do not skip ahead. Each checkpoint lists a goal, the tasks, and what "done" looks like.

### Checkpoint 0 — Repo & environment scaffolding
**Goal:** A clean, runnable skeleton before any real logic exists.
- [x] Initialize repo structure: `/backend`, `/frontend`, `/data`, `/ml`, `/docs`
- [x] `backend/`: FastAPI app skeleton, `.env.example`, `requirements.txt`, Dockerfile (optional but recommended)
- [x] PostgreSQL + PostGIS running locally (Docker Compose recommended)
- [x] `frontend/`: React app skeleton with MapLibre GL loaded and rendering a blank base map
- [x] `README.md` with setup steps a stranger could follow
- **Done when:** `docker compose up` (or equivalent) brings up backend, DB, and frontend all talking to each other with a health-check endpoint returning 200.

### Checkpoint 1 — Corridor definition & static terrain layer
**Goal:** One real geographic corridor, with real elevation-derived features in the database.
- [x] Choose and hardcode the pilot corridor bounding box (e.g. NH-13 Bhalukpong–Tawang, or your chosen highway) with lat/lon bounds
- [x] Download/clip the Copernicus GLO-30 DEM tile for that box
- [x] Compute slope, aspect (sin/cos), plan/profile curvature, TWI via rasterio
- [x] Create `terrain_grid` PostGIS table (30m grid cells) and populate it
- [x] Ingest OSM roads for the corridor into a `roads` table, tagged by class
- **Done when:** A GET endpoint returns the terrain grid as GeoJSON and it renders correctly as a heatmap-shaped overlay on the MapLibre frontend.

### Checkpoint 2 — Dynamic weather & soil ingestion
**Goal:** Live, real environmental data flowing into the database on a schedule.
- [x] Build the Open-Meteo ingestion service (async, non-blocking) per corridor grid centroid or a representative set of sample points
- [x] Compute rolling sums: 1h, 24h, 72h rainfall; 24h forecast; surface soil moisture
- [x] Create `weather_observations` table, write a scheduled job (every 1-3h) to populate it
- [x] Add a staleness check: if the last successful fetch is older than a threshold, flag it
- **Done when:** Querying the DB shows real, current rainfall/soil numbers for the corridor, updating on schedule, and a deliberately-broken API call correctly marks data as stale rather than failing silently.

### Checkpoint 3 — Baseline ML model
**Goal:** A real, validated (even if simple) landslide susceptibility model.
- [x] Source historical landslide points for the corridor region (NASA GLC / ISRO open atlas / equivalent)
- [x] Generate negative (pseudo-absence) samples from stable terrain at a documented ratio (e.g. 1:4)
- [x] Build the feature matrix joining static terrain + historical weather at each event
- [x] Train XGBoost classifier with spatial (not random) cross-validation to avoid leakage
- [x] Report and save accuracy/recall/precision honestly, including where it fails
- [x] Serialize the model artifact with a version tag
- **Done when:** You can show me a backtest report — not just "it trained" — with real numbers, and the model artifact loads and predicts on a held-out sample.

### Checkpoint 4 — Inference + explainability service
**Goal:** Turn the model into a live scoring service that also explains itself.
- [x] Inference endpoint/service: joins current terrain + latest weather → feature vector → probability
- [x] Severity tiering (Low/Moderate/High/Critical) with documented thresholds
- [x] TreeSHAP integration: return top 3 contributing factors per prediction
- [x] `risk_predictions` and `risk_explanations` tables, storing every prediction with model version
- **Done when:** `GET /api/v1/risk?lat=&lon=` returns probability, tier, and a human-readable factor breakdown for a real corridor point.

### Checkpoint 5 — Verification & action recommendation engine
**Goal:** Turn a raw probability into something an official can act on and trust.
- [x] Implement rule-based multi-signal verification: combine available independent signals into a confidence score; explicitly record missing signals
- [x] Implement rule-based priority/action mapping (P1/P2/P3 + recommended actions), with a rule-version identifier stored per decision
- [x] `verification_results` and `recommendations` tables
- [x] Document every threshold you use and why, in `docs/decision-logic.md` — these are not scientific truth, they're a v1 to be tuned
- **Done when:** A high-probability prediction with strong supporting signals correctly comes out "VERIFIED HIGH RISK / P1", and one with missing signals correctly downgrades to "NEEDS VERIFICATION".

### Checkpoint 6 — Citizen/field reporting
**Goal:** A working crowdsourced verification loop, with anti-spoofing.
- [x] `citizen_reports` table + `POST /api/v1/reports/submit` (multipart: type, description, lat/lon, photo)
- [x] EXIF extraction from uploaded photo; flag mismatch if EXIF GPS deviates >500m from submitted coordinates
- [x] Spatial clustering: auto-group reports within ~300m / few hours into one incident
- [x] Bayesian-style confidence uplift: a verified report nudges the nearest prediction's confidence (document the exact formula used)
- [x] Basic PWA form on the frontend: camera capture + browser geolocation, with offline queuing (IndexedDB) that syncs when back online
- **Done when:** Submitting a report from the PWA with a spoofed location is correctly flagged, and a genuine report visibly changes the corresponding road segment's status on the dashboard.

### Checkpoint 7 — Core REST API surface
**Goal:** Stable, documented contracts the frontend (and future consumers) rely on.
- [x] Finalize and document (OpenAPI/Swagger) all endpoints: risk grid, risk history, explanation, verification, recommendations, roads-impacted, reports, alerts-trigger
- [x] Add auth (JWT) and basic role separation (public vs authority) even if simplified for the demo
- [x] Add rate limiting on public-facing endpoints
- **Done when:** Swagger docs are complete and every endpoint has at least one automated test.

### Checkpoint 8 — GIS dashboard frontend
**Goal:** The thing evaluators/officials actually look at.
- [x] MapLibre GL rendering the hazard grid as color-coded polygons (Green/Amber/Red/Critical) from live API data, not mock data
- [x] Road segments colored by intersected risk tier
- [x] Click-through panel: risk score, SHAP factor breakdown, confidence, recommended action
- [x] Citizen report pins with status (pending/verified)
- **Done when:** Changing the underlying data (e.g. simulate a rain spike) visibly updates the map without a page reload.

### Checkpoint 9 — Multi-tier alerting
**Goal:** The right message to the right audience.
- [x] Alert event model: severity tier x audience tier (authority / field officer / public)
- [x] Delivery abstraction layer so channels (web push, Telegram, SMS/email stub) can be swapped without touching business logic
- [x] Multilingual content templates for the public-facing tier
- [x] `alerts` table logging every dispatched alert with recipients, channel, status
- **Done when:** A verified critical prediction triggers a correctly-tiered alert visible in-app, with the full audit trail in the DB.

### Checkpoint 10 — Advanced differentiator features
**Goal:** The features that separate this from a generic dashboard. Only start once 0–9 are solid.
- [x] "What-if" cloudburst simulation endpoint + frontend slider (inject rainfall delta, recompute, show live)
- [x] Safe-corridor routing that avoids Critical-tier road segments (Turf.js / pgRouting)
- [x] Historical event replay: pick a past event, replay the risk timeline leading up to it
- **Done when:** Each feature has a working demo path you can walk a judge through end to end.

### Checkpoint 11 — Hardening & demo readiness
**Goal:** Make it survive being poked at by a skeptical evaluator.
- [x] Load a realistic seed dataset covering the whole pilot corridor, not just one test point
- [x] Handle external API failure gracefully everywhere (Open-Meteo down, DEM missing, etc.) — never a raw 500
- [x] Write an end-to-end test script that exercises the full pipeline: ingest → predict → explain → verify → recommend → alert
- [x] Prepare a scripted demo walkthrough in `demo-script.md`
- [x] Final README pass: setup, architecture diagram, known limitations, next steps for real-world deployment
- **Done when:** A person who has never seen the project can run the setup steps and reproduce the full demo unaided.

---

## How to use this with me

At each checkpoint boundary, bring me: what was built, what decisions were made, what's still rough, and any blockers. I'll review before you tell the agent to proceed to the next checkpoint — that's the supervision loop this whole document is designed around.
