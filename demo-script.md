# SIH 26001: NER-DRISHTI Demo Script

## Preparation
1. Start Backend: `cd backend && docker-compose up -d`
2. Seed Database: `cd backend && python seed.py`
3. Start Frontend: `cd frontend && npm run dev`
4. Open the UI in Chrome: `http://localhost:5173`

## Scene 1: The Status Quo (1 min)
**Action:** Show the Map Dashboard.
**Script:** "Welcome to NER-DRISHTI, our software-only early warning system for landslides. We don't rely on expensive hardware sensors. We synthesize satellite DEM topology and live Open-Meteo weather grids. As you can see on the map, this is NH-13 in Assam. Currently, conditions are normal (green)."

## Scene 2: Citizen Reporting (1 min)
**Action:** Click 'Switch to Citizen Reporter'. Fill out the form with a photo. Switch back to Dashboard.
**Script:** "Our second layer of defense is the public. If someone spots a blocked drain or a minor rockfall, they can report it offline via our PWA. The backend automatically extracts EXIF data to prevent spoofing, and clusters these reports for officials."

## Scene 3: The Cloudburst Simulator (2 mins)
**Action:** Drag the 'What-If: Cloudburst' slider slowly to the right.
**Script:** "We wanted to build a decision-support tool, not just a map. As an official, I can see a storm is coming. By dragging this slider, I am injecting simulated rainfall directly into our XGBoost machine learning model in real-time. Watch the map. As I increase the rain, the soil saturation exceeds thresholds, and the grid begins turning Amber, then Red, then Critical."

## Scene 4: XAI and Verification (2 mins)
**Action:** Click on one of the glowing red polygons.
**Script:** "When a zone turns critical, we don't just output a blind score. We use SHAP values (Explainable AI) to show the official *why*. Here, you can see Slope and 72-hour Rainfall are driving the risk. Underneath, our Bayesian Verification Engine cross-references this with weather patterns to yield a Confidence Score."

## Scene 5: Action (1 min)
**Action:** Keep the panel open. Wait for an Alert toast to slide in. Click 'Plan Safe Route'.
**Script:** "Because the confidence is high, the system automatically triggers our multi-tier alerting module. It logs the audit trail and dispatches targeted SMS warnings in English, Hindi, and Assamese to the public, while giving us this safe evacuation route around the critical zones."

## Scene 6: Historical Replay (1 min)
**Action:** Click 'Play' on the Event Replay.
**Script:** "Finally, we can look at the past. This replays the catastrophic 2022 Dima Hasao event. As the timeline ticks from T-48 hours to zero, you can see how NER-DRISHTI would have given authorities a two-day head start. Thank you."
