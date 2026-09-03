# Checkpoint 12 — End-to-End Testing & Verification

**Status coming in:** All 11 build checkpoints are marked complete in `NER-DRISHTI_Build_Spec.md`.
**Reality check:** Almost none of checkpoints 1–11 were verified by you directly — you approved based on the agent's own walkthroughs. This checkpoint exists to close that gap. Nothing in the spec should be trusted as "done" until it passes here.

**Rule for this checkpoint:** if a test fails, don't let the agent patch it inline and declare victory. Have it explain *why* it failed first — a wrong assumption in Checkpoint 3 or 4 might mean re-doing work downstream, not just silencing an error.

---

## 0. Known red flags to specifically re-test

Pulled directly from the agent's own changelog language — these are not hypothetical:

| # | Claim in changelog | Why it's suspect |
|---|---|---|
| 1 | Checkpoint 4: "the inference endpoint threw a localized test error... but the service logic is structurally complete" | An endpoint that errors is not done. This must return real data now, not just "should work in theory." |
| 2 | Checkpoint 3: model trained on "a static proxy for weather" instead of real historical weather at each event | The build spec required joining static terrain + **historical weather** at each event. A static proxy is a materially weaker model — confirm what this actually means before trusting the backtest numbers. |
| 3 | Checkpoint 1: `richdem` was dropped for "standard numpy gradients" on Windows | Reasonable substitution, but confirm terrain outputs (slope/curvature) still look geologically sane, not just numerically present. |
| 4 | Checkpoint 7: "hardcoding a demo user" was an open question | Confirm what was actually decided — a real login flow vs. a permanent bypass are very different for a judge who tries to break auth. |
| 5 | Checkpoint 9/11: SMS/Telegram are console stubs (disclosed in README) | Acceptable, but confirm the stub actually fires on the right trigger condition, not just that the function exists. |
| 6 | Checkpoint 10: safe routing is "a dynamic mathematical arc," not real `pgRouting` (disclosed) | Confirm the arc never visually crosses a Critical polygon — an arc that ignores geometry would be worse than no routing feature. |
| 7 | Checkpoint 11: seed data is "100 distinct terrain cells" | Confirm this is actually derived from the real DEM/grid pipeline, not a separate synthetic dataset that bypasses Checkpoints 1–4 entirely. |

---

## 1. Clean-slate reset

Don't test on a container that's accumulated state across 11 checkpoints of live edits.

```bash
docker compose down -v          # -v wipes the DB volume too
docker compose up --build
```

- [ ] All three containers start with no errors in logs
- [ ] `curl http://localhost:8000/health` → `{"status":"ok","db":"connected"}`

---

## 2. Seed and inspect the database directly

Don't trust API responses alone — look at the raw rows.

```bash
docker exec -it nerdrishti-backend-1 python seed.py
docker exec -it nerdrishti-db-1 psql -U postgres -d ner_drishti
```

Inside psql:
```sql
SELECT count(*) FROM terrain_grid;      -- expect ~100 per seed.py
SELECT count(*) FROM roads;             -- expect > 0, real NH-13 geometry
SELECT elevation, slope, aspect_sin FROM terrain_grid LIMIT 5;  -- sanity: slope 0-90, not NULL/0 everywhere
SELECT * FROM weather_observations ORDER BY timestamp DESC LIMIT 3;
```

- [ ] `terrain_grid` rows have varying, non-zero slope values (flat 0 everywhere = fake data)
- [ ] `roads` table has real linestring geometry, not placeholder points
- [ ] `weather_observations` has a recent timestamp and non-null rainfall/soil values

---

## 3. Layer-by-layer API verification

Test each endpoint directly with `curl`, independent of the frontend. If the frontend "looks right" but the API is broken, the frontend is silently using stale/mock data.

**Terrain (Checkpoint 1)**
```bash
curl http://localhost:8000/api/v1/terrain
```
- [ ] Returns a real GeoJSON `FeatureCollection` with >1 feature, each with slope/elevation properties

**Weather (Checkpoint 2)**
```bash
curl http://localhost:8000/api/v1/weather/current
curl "http://localhost:8000/api/v1/weather/force_fetch?fail=true"
```
- [ ] First call returns live-looking numbers, not zeros
- [ ] Second call correctly marks the observation stale rather than crashing or faking a value

**Risk inference (Checkpoint 4) — THE ONE THAT PREVIOUSLY ERRORED**
```bash
curl "http://localhost:8000/api/v1/risk?lat=27.0&lon=92.3"
```
- [ ] Returns 200 with `risk_probability`, `severity`, and non-empty `top_factors`
- [ ] Try 3–4 different lat/lon pairs within the corridor — confirm scores actually vary (a model returning the same score everywhere is not really scoring)
- [ ] If this still errors, **stop here** — nothing downstream (verification, alerts, dashboard) can be trusted until this is real

**Verification & recommendation (Checkpoint 5)**
```bash
curl "http://localhost:8000/api/v1/risk?lat=27.0&lon=92.3"   # inspect verification_status + priority in payload
```
- [ ] A point you know is high-slope + high recent rain returns `VERIFIED HIGH RISK` / `P1`
- [ ] Manually force a missing-signal case (e.g. stop the weather job) and confirm it downgrades to `NEEDS VERIFICATION`, not a silent pass

**Citizen reports (Checkpoint 6)**
```bash
curl -X POST http://localhost:8000/api/v1/reports/submit \
  -F "hazard_type=crack" -F "lat=27.0" -F "lon=92.3" \
  -F "photo=@test_photo.jpg"
```
- [ ] Submit a photo with EXIF GPS >500m from the submitted lat/lon → confirm it's flagged as spoofed, not silently accepted
- [ ] Submit two reports within 300m within a few hours of each other → confirm they cluster into one `IncidentCluster`, not two separate ones
- [ ] Confirm the nearby prediction's confidence actually moves after a verified report (query `/api/v1/risk` before and after)

**Auth & rate limiting (Checkpoint 7)**
```bash
curl http://localhost:8000/api/v1/roads-impacted        # should 401/403 without token
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/roads-impacted
```
- [ ] Confirm what "demo user" actually means — ask the agent directly: is this a real login with a seeded password, or an unconditional bypass?
- [ ] Hit `POST /api/v1/reports/submit` 6+ times in a minute → confirm the 6th request is actually rate-limited (429), not just documented as limited

**Alerts (Checkpoint 9)**
- [ ] Trigger a genuinely critical prediction (via the rain-spike simulator) and confirm an `AlertLog` row is written with the right severity/audience
- [ ] Check backend console output for the SMS/Telegram stub firing — confirm it fires on the *same* event the in-app toast does, not a separate/disconnected code path

---

## 4. Frontend verification (do this with dev tools open)

```bash
cd frontend && npm run dev
```
Open `http://localhost:5173`, open browser console (F12), and:

- [ ] Map loads with real terrain-derived coloring — reload the page and confirm colors match what you queried directly from the API in section 3, not a cached/mock layer
- [ ] Click a hazard polygon → side panel shows SHAP factors that match the `/api/v1/risk` response for that same point
- [ ] Drag the rain-spike slider → confirm a **network request** fires in the dev tools Network tab each time (not just a local CSS/color animation with no backend round-trip)
- [ ] Trigger "Plan Safe Route" → visually confirm the route line does not cross any Critical-tier polygon
- [ ] Submit a citizen report through the PWA form with network throttled to "Offline" in dev tools → confirm it queues, then goes through when you re-enable network
- [ ] Zero red errors in the console throughout all of the above

---

## 5. Run the agent's own end-to-end test

```bash
docker exec -it nerdrishti-backend-1 python test_e2e.py
```
- [ ] Actually read the output, don't just check exit code — confirm it's asserting real conditions (e.g. `assert risk_probability > 0`) and not just checking that functions don't throw
- [ ] Ask the agent to show you `test_e2e.py` directly and walk through what each assertion actually proves

---

## 6. Full demo dry run

Follow `demo-script.md` exactly, script in hand, timing yourself.

- [ ] Every scene works without an unscripted error, restart, or "let me just refresh"
- [ ] Time the full run — if it's over ~10 minutes, decide now what to trim, not on stage
- [ ] Have a teammate who hasn't seen the code try to break it: click things out of order, submit garbage into the report form, spam the rain slider

---

## 7. Sign-off

Only check this once every section above is genuinely green, not "mostly working":

- [ ] Section 1 — clean boot
- [ ] Section 2 — real data in DB
- [ ] Section 3 — every endpoint independently verified
- [ ] Section 4 — frontend matches backend, no console errors
- [ ] Section 5 — e2e test assertions actually mean something
- [ ] Section 6 — full demo run-through survives unscripted probing

**If anything in Section 0's red-flag table is still unresolved when you reach here, do not consider the build submission-ready** — go back to the relevant checkpoint with the agent and fix it properly rather than patching around it.
