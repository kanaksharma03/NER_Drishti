# NER-DRISHTI Decision Logic (v1.0)

> [!NOTE]
> These thresholds and rules are a v1 baseline meant to be iteratively tuned with domain experts and geologists. They are not absolute scientific truths.

## 1. Raw Probability and Severity Tiering
The XGBoost model outputs a raw probability P (0.0 to 1.0) indicating the likelihood of a landslide occurring at a given 30m grid cell under the current weather conditions.

- **Critical (P > 0.8)**: Extremely high likelihood of failure based on historical patterns.
- **High (0.6 <= P <= 0.8)**: Significant risk, typical of intense monsoon periods on steep slopes.
- **Moderate (0.3 <= P < 0.6)**: Elevated risk, usually triggered by moderate continuous rainfall.
- **Low (P < 0.3)**: Stable terrain or dry conditions.

## 2. Confidence Scoring
To prevent false alarms caused by sensor drift, missing data, or model over-extrapolation, we compute a `confidence_score` starting at 1.0.

- **Data Freshness (-0.3)**: If the weather data is stale (e.g. API failed to fetch recently), confidence drops by 0.3. We cannot trust a high-risk score if we don't know the current rainfall.
- **Soil Corroboration (-0.3)**: Landslides rarely happen in dry soil. If P > 0.5 but soil moisture is <= 0.7, we penalize confidence by 0.3.
- **Rainfall Corroboration (-0.2)**: If P > 0.5 but there has been <= 50mm of rain in the last 24h, we penalize confidence by 0.2.

## 3. Priority and Recommendation Mapping
We map the (Probability, Confidence) pair to an actionable Priority level (P1, P2, P3).

- **P1: VERIFIED HIGH RISK**
  - **Condition**: P > 0.8 AND Confidence > 0.7
  - **Rationale**: The ML model predicts critical risk, and secondary environmental signals (wet soil, heavy rain, fresh data) corroborate this prediction.
  - **Action**: Initiate immediate evacuation protocols and halt highway traffic.

- **P2: NEEDS VERIFICATION**
  - **Condition**: P > 0.8 AND Confidence <= 0.7
  - **Rationale**: The ML model predicts critical risk, but we are missing secondary signals (e.g., the soil looks dry, or data is stale). This could be a false positive or an edge case (e.g., an earthquake trigger, which we don't track).
  - **Action**: Deploy a field officer to visually verify conditions. Do not auto-close the highway yet.

- **P2: MODERATE RISK**
  - **Condition**: 0.5 < P <= 0.8
  - **Rationale**: The baseline risk is elevated enough to warrant caution, but not immediate closure.
  - **Action**: Issue advisory warning to commuters.

- **P3: ROUTINE**
  - **Condition**: P <= 0.5
  - **Rationale**: Normal operating conditions.
  - **Action**: Continue routine monitoring.
