# NER-DRISHTI Project Knowledge Base & Summary

This document serves as the comprehensive history, summary, and current state of the **NER-DRISHTI** project. It outlines our core features, Minimum Viable Product (MVP), Unique Selling Proposition (USP), and how our approach differentiates from existing solutions in the market.

## 1. Project Summary & Problem Statement
**NER-DRISHTI** is an AI-powered landslide early-warning and decision-support platform tailored specifically for the North Eastern Region (NER) of India (addressing SIH problem statement 26001). 

The platform aims to answer four critical questions for disaster management authorities and citizens:
1. **What is the risk?** (Predicting probability and severity)
2. **Where is the risk?** (Pinpointing high-risk zones on a GIS map)
3. **Why is it happening?** (Providing interpretable AI explanations)
4. **What should we do?** (Recommending actionable steps based on priority)

Currently, the system supports multiple pilot regions including **Arunachal Pradesh (NH-13)**, **Sikkim (NH-10)**, and **Meghalaya (NH-6)**, with architecture in place to scale pan-NER.

## 2. Minimum Viable Product (MVP) Scope
Our MVP has been scoped to prioritize immediate value and functionality without relying on complex, unscalable hardware:
- **Software-Only Approach**: Unlike traditional systems that rely on expensive, easily-damaged physical IoT sensors (tilt-meters, boreholes), our MVP relies purely on data integration. Soil saturation and weather data are dynamically sourced from **ERA5-Land / Open-Meteo**.
- **Multi-Region Scalability**: The MVP supports switching between multiple states and districts dynamically, proving efficacy across varied terrains before scaling pan-India.
- **Rule-Based to ML Pipeline**: We verify learned predictions using rule-based heuristics before promoting them to authorities, ensuring trust and explainability.

## 3. Core Features & Capabilities
We have successfully implemented the following core functional areas:
1. **Dynamic Risk GIS Map**: A MapLibre-powered dashboard rendering a dynamic hazard grid colored strictly by model severity tiers (Low, Moderate, High, Critical).
2. **"What-If" Simulation**: A cloudburst simulator allowing authorities to inject artificial rainfall deltas (+50mm, +100mm) to foresee potential risk escalations instantly without corrupting live data.
3. **Safe Evacuation Routing**: Dynamic routing that intelligently avoids "Critical-tier" road segments, ensuring evacuation paths are actually safe.
4. **Citizen Reporting Pipeline (PWA)**: A secure pipeline for locals to submit field reports (with photos, coordinates, and descriptions) to crowdsource verification.
5. **Historical Event Replay**: The ability to playback historical landslide events (e.g., Dima Hasao 2022) to study the timeline of risk modifiers leading up to a disaster.
6. **Multi-tier Alerting**: Dispatched alerts categorized by severity (P1, P2, P3) and audience (Authority vs. Public).

## 4. Unique Selling Proposition (USP) & Market Differentiation
### How We Differ from Existing Products
Most existing landslide warning systems rely heavily on expensive, hyper-localized IoT networks that are difficult to maintain in the harsh terrain of North East India. 
- **No Hardware Dependency**: By leveraging satellite telemetry (Copernicus DEM) and global weather models (Open-Meteo), we drastically reduce deployment and maintenance costs.
- **Offline-First Resilience**: Our citizen reporting PWA uses an IndexedDB queue to persist reports when offline, auto-syncing when connectivity returns—vital for the notoriously poor network zones in the NER.
- **Explainable AI (XAI)**: We don't just output a "Red Alert." We provide the *why*. 

## 5. The Machine Learning Model & Differences
- **Model Choice**: We utilize an **XGBoost classifier** (over generic neural networks) because tabular spatial data (slope, elevation, historical rainfall) heavily benefits from tree-based ensembles.
- **TreeSHAP Integration**: Every risk prediction is passed through a SHAP (SHapley Additive exPlanations) explainer. The frontend explicitly shows authorities the top contributing factors (e.g., *24H Rainfall contributed +0.15*, *Slope contributed +0.10*). This turns a "black box" prediction into an auditable, transparent recommendation.
- **Spatial Cross-Validation**: To prevent data leakage (a common flaw in geospatial ML where nearby training points falsely inflate accuracy), we train using strict spatial blocking techniques.

## 6. Project History & Milestones Achieved
- **Phase 1 (Scaffolding)**: Successfully initialized the FastAPI backend, SQLite database, and Vite/React frontend with MapLibre GL.
- **Phase 2 (Design Overhaul)**: Transitioned the UI from a generic SaaS look to a professional, dark-sidebar "Command Center" aesthetic suitable for government and emergency operations.
- **Phase 3 (GIS & Data Integration)**: Connected the frontend directly to the FastAPI endpoints (`/api/v1/risk/grid`, `/api/v1/weather/current`, `/api/v1/reports`). 
- **Phase 4 (Functional Audit)**: Removed all frontend mock data. Ensured all KPI counts, map colors, drawer data, and infrastructure logs strictly mirror the actual Python backend logic. Implemented robust Loading, Empty, and Error states across all panels.
- **Phase 5 (Multi-Region Support)**: Re-architected the backend and database to support dynamic region switching (Arunachal Pradesh, Sikkim, Meghalaya) and seeded the database with region-specific terrain and weather data.

## 7. System Architecture
The NER-DRISHTI system follows a decoupled, API-driven client-server architecture:
- **Frontend (Client)**: Built with React, Vite, and MapLibre GL. It acts as the "Command Center" dashboard for authorities and the PWA for citizen reporting. It is entirely stateless and relies on the backend for all data and ML insights.
- **Backend (Server)**: Built with Python and FastAPI. It exposes RESTful API endpoints (`/api/v1/*`) to serve risk predictions, process citizen reports, and distribute alerts. It uses a SQLite database (via SQLAlchemy and aiosqlite) for MVP storage.
- **External Integrations**: The backend continuously polls the Open-Meteo API to ingest live weather data (precipitation, soil moisture) into the database, keeping the ML predictions fresh.

## 8. Frontend and Backend Workflow System

```text
[ BACKGROUND PROCESS ]
External Weather API ──(fetches every 1 min)──> Backend ──(calculates 72h rain sums)──> Database

[ CITIZEN REPORT FLOW ]
Mobile App User ──(uploads photo + location)──> Backend ──(checks EXIF for spoofing)──> Groups into Clusters ──> Database

[ MAIN PREDICTION FLOW ]
Frontend Map ──(sends latitude/longitude & region_id)──> Backend API
                                                              │
                                                              ▼
                                    1. Fetch Terrain & Weather from Database for that location
                                                              │
                                                              ▼
                                    2. Heuristic ML Model calculates probability (0-100%)
                                                              │
                                                              ▼
                                    3. SHAP Engine determines the "Why" (top contributing factors)
                                                              │
                                                              ▼
                                    4. Verification Engine cross-checks with Citizen Reports & Soil Moisture
                                                              │
                                                              ▼
                                    5. If Critical + Confident ──> Trigger Alerts
                                                              │
                                                              ▼
Frontend Dashboard <──(Returns JSON with Probability, Severity, and SHAP explanations)── Backend API
```

## 9. Next Steps & Technical Debt
- **Crowdsourcing Validation Loop**: Further refine the Bayesian-style confidence uplift, where a verified citizen report automatically nudges the nearest XGBoost prediction's confidence score higher.
- **Scale Database**: Migrate from SQLite to PostgreSQL with PostGIS extensions to handle larger, pan-India datasets natively and perform complex spatial queries more efficiently.
