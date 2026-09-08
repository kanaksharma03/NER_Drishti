# NER-DRISHTI Project Knowledge Base & Summary

This document serves as the comprehensive history, summary, and current state of the **NER-DRISHTI** project. It outlines our core features, Minimum Viable Product (MVP), Unique Selling Proposition (USP), and how our approach differentiates from existing solutions in the market.

## 1. Project Summary & Problem Statement
**NER-DRISHTI** is an AI-powered landslide early-warning and decision-support platform tailored specifically for the North Eastern Region (NER) of India (addressing SIH problem statement 26001). 

The platform aims to answer four critical questions for disaster management authorities and citizens:
1. **What is the risk?** (Predicting probability and severity)
2. **Where is the risk?** (Pinpointing high-risk zones on a GIS map)
3. **Why is it happening?** (Providing interpretable AI explanations)
4. **What should we do?** (Recommending actionable steps based on priority)

Currently, the pilot corridor focuses on **NH-13 (Bomdila to Bhalukpong area)** in Arunachal Pradesh.

## 2. Minimum Viable Product (MVP) Scope
Our MVP has been scoped to prioritize immediate value and functionality without relying on complex, unscalable hardware:
- **Software-Only Approach**: Unlike traditional systems that rely on expensive, easily-damaged physical IoT sensors (tilt-meters, boreholes), our MVP relies purely on data integration. Soil saturation and weather data are dynamically sourced from **ERA5-Land / Open-Meteo**.
- **Single Pilot Corridor**: The MVP is tightly scoped to a ~50km highway corridor to prove efficacy before scaling pan-NER or pan-India.
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

## 7. Next Steps & Technical Debt
- **Database Seeding**: While the frontend is fully capable of rendering live data, the backend SQLite database requires comprehensive seeding (via `seed.py`) with real `TerrainGrid` and `WeatherObservation` rows to maximize the demo's realism.
- **Crowdsourcing Validation Loop**: Further refine the Bayesian-style confidence uplift, where a verified citizen report automatically nudges the nearest XGBoost prediction's confidence score higher.
