# NER-Drishti Backend Knowledge Base

Welcome to the backend documentation for the NER-Drishti Early Warning System! This file explains how the backend works in very simple terms so that anyone with basic programming knowledge can understand it.

## 1. What the Backend Is
The backend is the "brain" of the NER-Drishti application. It is a web server that handles requests from the user interface (frontend), fetches weather data, runs the landslide risk calculations, processes citizen reports, and sends out alerts. It acts as the bridge between the database, the predictive model, and the users.

## 2. Backend Folder Structure
The backend code lives inside the `backend/` folder. Here are the most important files and folders:
- **`main.py`**: The entry point of the server. It contains all the API endpoints (URLs) that the frontend can call.
- **`models.py`**: Defines the structure of the database. It tells the system what tables exist and what columns they have (like a spreadsheet blueprint).
- **`database.py`**: Handles the connection to the database.
- **`requirements.txt`**: A list of all the external Python tools and libraries the project needs to run.
- **`services/`**: A folder containing the core logic separated into different files:
  - `weather.py`: Fetches and processes weather data.
  - `inference.py`: Runs the landslide risk prediction.
  - `reports.py`: Handles citizen incident reports and grouping them.
  - `verification.py`: Cross-checks predictions with real-world signals.
  - `alerts.py`: Handles sending notifications.
  - `exif.py`: Checks photos for fake/spoofed locations.

## 3. How the Backend Starts/Runs
The backend runs using a tool called **Uvicorn**, which is a fast server for Python applications. When the server starts up (by running `main.py`), it also creates the database tables if they don't exist and launches a background task that automatically fetches weather data every 1 minute.

## 4. Technologies and Libraries Used
- **Python**: The main programming language.
- **FastAPI**: The web framework used to create the API endpoints quickly and securely.
- **Uvicorn**: The server that runs the FastAPI application.
- **SQLAlchemy (Async)** & **aiosqlite**: Tools to interact with the database using Python code instead of raw SQL queries.
- **HTTPX**: A library to make requests to external services (like the Open-Meteo weather API).
- **PyJWT**: For creating secure "tokens" for user logins.
- **ExifRead**: To read hidden location data inside uploaded photos.

## 5. Database and Tables/Models
The project uses **SQLite**, a lightweight database stored in a single file (`nerdrishti.db`), perfect for a demo. The database has several tables (models):
- **`TerrainGrid`**: Stores land information (elevation, slope) for different map coordinates.
- **`Road`**: Stores highway information.
- **`WeatherObservation`**: Stores past and current weather data like rainfall and soil moisture.
- **`RiskPrediction`**: Saves the results of the landslide risk calculations.
- **`RiskExplanation`**: Stores the reasons *why* a certain risk was predicted (SHAP values).
- **`IncidentCluster`**: Groups nearby citizen reports together.
- **`CitizenReport`**: Stores details and photos uploaded by users.
- **`VerificationResult`**: Stores confidence scores that check if a risk prediction is realistic.
- **`Recommendation`**: Stores automated suggestions (like "Deploy field officer").
- **`AlertLog`**: A history of warning messages sent out.

## 6. Important API Endpoints
Endpoints are specific URLs the frontend calls to perform actions.

### Get Landslide Risk Prediction
- **Purpose**: Calculates the current landslide risk for a specific location.
- **Method**: `GET`
- **Endpoint**: `/api/v1/risk`
- **Input**: Latitude (`lat`) and Longitude (`lon`).
- **Output**: The probability of a landslide, a severity tier (Low, Moderate, High, Critical), and the top factors causing the risk.
- **What happens internally**: It fetches terrain data for that spot, gets the latest weather (last 72 hours of rain), calculates a heuristic risk score, generates explanations, saves everything to the database, and returns the result.

### Submit Citizen Report
- **Purpose**: Allows users to report incidents like fallen trees or minor slips.
- **Method**: `POST`
- **Endpoint**: `/api/v1/reports/submit`
- **Input**: Report type, description, latitude, longitude, and an image file (`photo`).
- **Output**: Success status, whether the photo was flagged as fake, and a cluster ID.
- **What happens internally**: It checks the photo's hidden data (EXIF) to ensure the photo's location matches the reported location (spoof detection). If valid, it looks for other recent reports within 300 meters and groups them together into a "Cluster".

### Get Hazard Grid
- **Purpose**: Provides data to draw a colored risk map on the frontend.
- **Method**: `GET`
- **Endpoint**: `/api/v1/risk/grid`
- **Input**: `rainfall_delta` (optional, to simulate a sudden cloudburst).
- **Output**: A list of geographic shapes (GeoJSON) with risk probabilities for each area.
- **What happens internally**: It grabs up to 200 terrain points, calculates a quick risk score based on slope, elevation, and the simulated rainfall, and packages them as small map squares.

### Authentication (Login)
- **Purpose**: Gives users a secure token to prove who they are.
- **Method**: `POST`
- **Endpoint**: `/api/v1/token`
- **Input**: Username and Password.
- **Output**: An access token.
- **What happens internally**: For the demo, if you use "admin" and "password", you get "authority" privileges. Otherwise, you get "public" access.

## 7. Request and Response Data in Simple Language
When the frontend asks the backend a question (Request), it usually sends small bits of text, like `lat=27.02&lon=92.65`.
The backend answers (Response) using **JSON**, which looks like a simple dictionary.
For example, a risk response looks like this:
"Latitude 27.02, Longitude 92.65 has an 85% probability of a landslide. This is a CRITICAL severity. The biggest reason is the heavy rainfall over the last 72 hours."

## 8. Authentication/JWT Flow
When a user logs in, the backend checks their credentials and hands them a **JSON Web Token (JWT)**. This token is like a digital ID card. For any protected endpoint (like viewing sensitive authority data), the frontend must show this ID card to the backend to get access.

## 9. Risk Prediction/ML Model
For this demo, the backend uses a **Heuristic Model** (a smart rule-based calculation) instead of a heavy neural network. 
It calculates risk by combining:
1. **Slope**: Steeper hills increase risk.
2. **Rainfall**: The amount of rain over the last 72 hours increases risk.
3. A tiny bit of random noise to make the demo feel realistic.
It clamps the final probability between 0% and 100% and assigns a tier: Low (<30%), Moderate (<60%), High (<80%), or Critical (80%+).

## 10. SHAP/TreeSHAP Explanation
SHAP values answer the question: *"Why did the model make this prediction?"* 
Instead of just saying "High Risk", the backend calculates "Contribution Values" for different factors. It might say:
- Historical Rain added +40% to the risk.
- Steep Slope added +30% to the risk.
- High Elevation reduced the risk by -5%.
These explanations are saved in the database and sent to the frontend so the user can understand the "Why".

## 11. Weather Data Flow
1. Every 1 minute, a background task automatically wakes up.
2. It reaches out to the free **Open-Meteo API** to get weather forecasts and history for 3 specific locations in Arunachal Pradesh.
3. It calculates how much rain fell in the last 1 hour, 24 hours, and 72 hours.
4. It saves this fresh data into the `WeatherObservation` table so the predictive model always has the latest numbers.

## 12. Risk Grid Generation
When the frontend needs to show the map, the backend takes a grid of terrain points. It looks at the slope and elevation of each point, applies the current (or simulated) rainfall, calculates a live risk score for every single point, and sends back geographic coordinates to draw colored boxes (green, yellow, red) on the map.

## 13. Alerts
If the system detects a High or Critical risk, the **Verification Engine** kicks in. If it's confident it's a real threat, the `alerts.py` service creates a log entry detailing who needs to be warned (public vs. authorities), the severity, and the message payload (e.g., SMS or in-app notification).

## 14. Roads Impacted / Safe Routes
- **Impacted Roads**: The backend can identify which highways intersect with critical risk zones. (Currently mocks a return showing NH-13 is impacted).
- **Safe Routes**: Provides coordinates for a safe path that dodges the high-risk areas so people can evacuate safely.

## 15. Citizen Reports
Users can snap a photo of a minor landslide or blocked road and submit it. The backend saves this report. Because one fallen tree might be reported by 10 different drivers, the backend groups reports that are within 300 meters of each other and submitted within the last 12 hours into a single "Incident Cluster".

## 16. Verification/Spoof Detection
- **Spoof Detection**: When a photo is uploaded, the `exif.py` script reads the hidden GPS coordinates embedded in the image file. If the photo's internal location is way off from where the user claims to be, it marks the report as "spoofed" (fake).
- **Verification Engine**: Before sounding a massive alarm, the backend checks: "Is the weather data fresh?", "Is the soil actually saturated?", "Are there citizen reports nearby?". This increases or decreases the "Confidence Score" of the prediction.

## 17. How Frontend Communicates with Backend
They talk over the internet using standard HTTP protocols. The frontend sends a `GET` request to retrieve data (like viewing the risk) or a `POST` request to send data (like uploading a photo). The backend has **CORS (Cross-Origin Resource Sharing)** enabled, which allows the frontend website to safely request data from the backend server.

## 18. Environment Variables/Configuration
Sensitive settings and configurations (like database links) are kept out of the main code. They are stored in a `.env` file. The backend reads this file when it starts up.

## 19. Important Dependencies
- `fastapi` & `uvicorn`: For the web server.
- `sqlalchemy` & `aiosqlite`: For talking to the SQLite database asynchronously.
- `httpx`: For downloading external weather data.
- `ExifRead`: For catching fake photo uploads.
- `PyJWT`: For handling secure logins.

---

## 20. Backend Workflow in One View

```text
[ BACKGROUND PROCESS ]
External Weather API ──(fetches every 1 min)──> Backend ──(calculates 72h rain sums)──> Database

[ CITIZEN REPORT FLOW ]
Mobile App User ──(uploads photo + location)──> Backend ──(checks EXIF for spoofing)──> Groups into Clusters ──> Database

[ MAIN PREDICTION FLOW ]
Frontend Map ──(sends latitude/longitude)──> Backend API
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
