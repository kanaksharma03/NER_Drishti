# NER-DRISHTI: AI Landslide Early-Warning Platform

<div align="center">
  <img src="https://img.shields.io/badge/Status-SIH%20Ready-success" alt="Status" />
  <img src="https://img.shields.io/badge/Problem%20Statement-26001-blue" alt="SIH 26001" />
  <img src="https://img.shields.io/badge/Version-1.0.0-purple" alt="Version" />
</div>

## 📌 Overview
**NER-DRISHTI** (North Eastern Region - Dynamic Risk Intelligence System for Hazard Tracking and Intervention) is a highly advanced, software-only early warning system designed for the NH-13 corridor in Assam/Arunachal Pradesh. 

Built for Smart India Hackathon (SIH) Problem Statement 26001, this platform entirely eliminates the need for expensive, localized physical IoT hardware (tilt-meters, boreholes). Instead, it synthesizes satellite topology data, live meteorological grids, and crowdsourced intelligence through a powerful XGBoost machine learning pipeline to predict landslides before they happen.

---

## 🏗️ System Architecture

NER-DRISHTI operates on a 5-stage pipeline, leveraging a modern asynchronous Python backend and a reactive React/MapLibre frontend.

```mermaid
graph TD
    subgraph Data Sources
        A[Open-Meteo API] -->|Live Weather & Soil| B(Ingestion Engine)
        C[SRTM DEM .tif] -->|Elevation, Slope, Aspect| B
        D[Citizen Reporter PWA] -->|Crowdsourced Reports| B
    end

    subgraph Backend Core (FastAPI)
        B --> E{XGBoost Model}
        E -->|Probability Score| F(Explainable AI / SHAP)
        F --> G{Bayesian Verification Engine}
        D -->|EXIF Anti-Spoofed Data| G
        G -->|Confidence & Priority| H[Alerting Router]
    end

    subgraph Output & Delivery
        H -->|Multilingual SMS| I(Public)
        H -->|Technical Dashboards| J(Authorities / NDMA)
        H -->|Safe Evacuation Routes| K(Field Officers)
    end
```

---

## ⚡ Core Workflows & Features

### 1. Dynamic Risk Prediction (ML)
Instead of static maps, NER-DRISHTI generates a living hazard grid. The backend constantly polls meteorological APIs to assess 72-hour cumulative rainfall and soil saturation. This is fed into an **XGBoost Classifier** trained on regional topographical data to yield a localized risk probability.

### 2. Explainable AI (XAI)
When a sector turns "Critical", authorities need to know *why* before deploying resources. The system uses **SHAP (SHapley Additive exPlanations)** to break down the "black box" prediction, highlighting exact driving factors (e.g., "Steep Slope + Heavy Soil Saturation").

### 3. Bayesian Verification & Citizen Reporting
To reduce false positives, the ML prediction is cross-referenced in a Bayesian Verification Engine. This engine also integrates crowdsourced reports filed by citizens via the Progressive Web App (PWA). All photos uploaded by citizens are scrubbed for EXIF metadata to prevent GPS spoofing or using old photos.

### 4. Agentic Multi-Tier Alerting
Once verified, the system autonomously routes alerts based on severity and audience:
- **Public:** Receives simple, localized warnings in English, Hindi, and Assamese via SMS/Telegram.
- **Authorities:** Receive detailed technical dashboards including SHAP breakdowns and confidence scores.

### 5. Advanced Decision Support (What-If & Routing)
- **Cloudburst Simulator:** A live UI slider allows officials to inject theoretical rainfall deltas into the model to see when safe zones tip into critical zones.
- **Safe Evacuation Routing:** Dynamically generates evacuation corridors that actively map around the current high-risk polygons.

---

## 🛠️ Technology Stack

### Backend
- **Framework:** Python 3.11, FastAPI (Async)
- **Database:** PostgreSQL + PostGIS extension
- **ORM & Data:** SQLAlchemy, GeoAlchemy2, asyncpg
- **Machine Learning:** XGBoost, Scikit-learn, SHAP
- **Security & Rate Limiting:** PyJWT, Passlib, SlowAPI

### Frontend
- **Framework:** React.js, Vite
- **Mapping:** MapLibre GL JS, Carto Basemaps
- **Styling:** Custom Vanilla CSS (Glassmorphism, Dark Theme)
- **Icons:** Lucide-React

---

## 🚀 Setup & Installation Guide

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+

### 1. Database Setup
```bash
cd backend
# Spin up the PostGIS container in the background
docker-compose up -d
```

### 2. Backend Initialization
```bash
cd backend
# Install dependencies
pip install -r requirements.txt

# Seed the database with the realistic NH-13 grid dataset
python seed.py

# Start the FastAPI server
fastapi dev main.py
```
*The backend API will be available at `http://localhost:8000`*

### 3. Frontend Initialization
```bash
cd frontend
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The dashboard will be available at `http://localhost:5173`*

---

## 🧪 Testing

We have provided a robust end-to-end test script to verify the health of the entire pipeline programmatically.
```bash
cd backend
python test_e2e.py
```
This script will ingest mock data, simulate a rain spike, trigger an ML inference, and ensure alerts are successfully dispatched.

---

## 🛣️ Path to Production (Post-SIH)
While this build perfectly addresses the SIH problem statement constraints, scaling to production across pan-NER will require:
1. **Weather Upgrades:** Replacing the Open-Meteo API with high-resolution, localized IMD (Indian Meteorological Department) mesh grids.
2. **Topology Upgrades:** Swapping the coarse SRTM DEM for high-res 30m Cartosat/ALOS data.
3. **Alert Integration:** Hooking the current Alert Delivery Abstraction layer directly into the national CAP (Common Alerting Protocol) for broadcast SMS.
