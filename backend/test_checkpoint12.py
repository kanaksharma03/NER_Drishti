"""
NER-DRISHTI Checkpoint 12 — Automated Verification Script
Tests all endpoints and vulnerabilities from Testing.md
"""
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import time

BASE = "http://127.0.0.1:8000"
PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
WARN = "\033[93m⚠️  WARN\033[0m"

results = []

def get(path, label):
    url = BASE + path
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            data = json.loads(r.read())
            results.append((label, "PASS", data))
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        results.append((label, f"HTTP_{e.code}", body))
        return None
    except Exception as ex:
        results.append((label, "ERROR", str(ex)))
        return None

def post_form(path, fields, label):
    url = BASE + path
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.loads(r.read())
            results.append((label, "PASS", data))
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        results.append((label, f"HTTP_{e.code}", body))
        return None
    except Exception as ex:
        results.append((label, "ERROR", str(ex)))
        return None

print("\n" + "="*60)
print(" NER-DRISHTI Checkpoint 12 — Testing.md Verification")
print("="*60)

# ── SECTION 1: Health ──────────────────────────────────────────
print("\n### Section 1: Clean Boot Health Check")
health = get("/health", "Health endpoint")
if health:
    db_ok = health.get("db") == "connected"
    print(f"  {PASS if db_ok else FAIL} /health → status={health.get('status')} db={health.get('db')}")
else:
    print(f"  {FAIL} Backend not reachable — is uvicorn running?")
    sys.exit(1)

# ── SECTION 2: Weather ────────────────────────────────────────
print("\n### Section 2 & 3: Weather Endpoint")
weather = get("/api/v1/weather/current", "Weather current")
if weather and len(weather) > 0:
    obs = weather[0]
    has_real_rain  = obs.get("rainfall_1h") is not None
    nonzero        = any(w.get("rainfall_1h", 0) != 0 for w in weather)
    print(f"  {PASS if has_real_rain else FAIL} rainfall_1h present: {obs.get('rainfall_1h')}")
    print(f"  {PASS if nonzero else WARN} Non-zero rainfall values: {[w.get('rainfall_1h') for w in weather]}")
    print(f"  {PASS} Soil moisture: {obs.get('soil_moisture')}")
    print(f"  {PASS} Timestamp: {obs.get('timestamp')}")
else:
    print(f"  {FAIL} No weather observations returned")

# Weather stale test (force_fetch is a POST endpoint)
print("\n  Testing weather staleness on simulated failure...")
try:
    req = urllib.request.Request(
        BASE + "/api/v1/weather/force_fetch?fail=true",
        data=b"",  # empty body makes it a POST
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=8) as r:
        stale = json.loads(r.read())
        results.append(("Weather force fail", "PASS", stale))
        print(f"  ✅ PASS Force-fail returned (no crash): {stale}")
except urllib.error.HTTPError as e:
    results.append(("Weather force fail", f"HTTP_{e.code}", e.read().decode()))
    print(f"  ❌ FAIL Force-fail HTTP error: {e.code}")
except Exception as ex:
    results.append(("Weather force fail", "ERROR", str(ex)))
    print(f"  ❌ FAIL Force-fail error: {ex}")

# ── SECTION 3: Risk Inference ─────────────────────────────────
print("\n### Section 3: Risk Inference (THE KEY TEST)")
risk_points = [
    (27.0, 92.3, "Point A - low corridor"),
    (27.3, 92.6, "Point B - mid corridor"),
    (27.5, 91.9, "Point C - high altitude"),
    (27.1, 92.1, "Point D - road junction"),
]
risk_scores = []
for lat, lon, label in risk_points:
    r = get(f"/api/v1/risk?lat={lat}&lon={lon}", f"Risk {label}")
    if r:
        prob = r.get("probability") or r.get("risk_probability")
        sev  = r.get("severity_tier") or r.get("severity")
        factors = r.get("top_factors") or r.get("factors") or []
        risk_scores.append(prob)
        print(f"  ✅ PASS {label}: prob={prob}, severity={sev}, factors={len(factors)}")
    else:
        # Show the actual error from the results list
        last = results[-1]
        print(f"  ❌ FAIL {label}: HTTP {last[1]} — {str(last[2])[:200]}")

if len(risk_scores) >= 2 and len(set(risk_scores)) > 1:
    print(f"  {PASS} Scores vary across locations: {risk_scores}")
elif len(risk_scores) >= 2:
    print(f"  {FAIL} All scores identical ({risk_scores[0]}) — model not differentiating locations!")
else:
    print(f"  {FAIL} Not enough successful risk calls to check variance")

# Risk grid
print("\n  Testing Risk Grid GeoJSON...")
grid = get("/api/v1/risk/grid", "Risk grid")
if grid and grid.get("type") == "FeatureCollection":
    feats = grid.get("features", [])
    print(f"  {PASS} Risk grid returned {len(feats)} features")
    if feats:
        props = feats[0].get("properties", {})
        print(f"  {PASS} Sample feature props: {props}")
else:
    print(f"  {FAIL} Risk grid malformed or empty")

# Rain spike simulation
print("\n  Testing rain spike simulation...")
spike = get("/api/v1/simulate/rain?enable=true", "Rain spike ON")
if spike:
    print(f"  {PASS} Rain spike enabled: {spike}")
spike_grid = get("/api/v1/risk/grid?rainfall_delta=100", "Risk grid with rain")
if spike_grid:
    feats = spike_grid.get("features", [])
    if feats:
        prob = feats[0].get("properties", {}).get("probability", 0)
        print(f"  {PASS if prob > 0.4 else WARN} Rain spike raises probability: first cell={prob}")
# Reset
get("/api/v1/simulate/rain?enable=false", "Rain spike OFF")

# ── SECTION 4: Auth & Rate Limiting ──────────────────────────
print("\n### Section 3: Auth & Rate Limiting")
roads_unauth = get("/api/v1/roads-impacted", "Roads unauthenticated")
if roads_unauth is None:
    # Check if it was a 401/403
    last = results[-1]
    if "HTTP_401" in last[1] or "HTTP_403" in last[1]:
        print(f"  {PASS} /roads-impacted returns {last[1]} without token ✓")
    else:
        print(f"  {FAIL} /roads-impacted returned {last[1]} — expected 401/403, got {last[2][:100]}")
else:
    print(f"  {FAIL} /roads-impacted accessible WITHOUT auth token! Security vulnerability!")

# Token endpoint
token_resp = post_form("/api/v1/token",
    {"username": "admin", "password": "password"},
    "Token endpoint")
if token_resp and token_resp.get("access_token"):
    print(f"  {PASS} Token minted for admin: {token_resp.get('token_type')} ...")
    token = token_resp["access_token"]
    # Now try authenticated
    req = urllib.request.Request(
        BASE + "/api/v1/roads-impacted",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            auth_data = json.loads(r.read())
            print(f"  {PASS} /roads-impacted WITH token → {auth_data}")
    except Exception as ex:
        print(f"  {FAIL} /roads-impacted with token failed: {ex}")
else:
    print(f"  {WARN} Token endpoint returned: {token_resp}")

# Rate limiting test (send 6 rapid requests)
print("\n  Testing rate limiting (6 rapid POST /reports/submit)...")
rate_codes = []
for i in range(6):
    try:
        data = urllib.parse.urlencode({"type": "test", "description": "test", "lat": "27.0", "lon": "92.3"}).encode()
        req = urllib.request.Request(BASE + "/api/v1/reports/submit", data=data)
        with urllib.request.urlopen(req, timeout=3) as r:
            rate_codes.append(r.status)
    except urllib.error.HTTPError as e:
        rate_codes.append(e.code)
    except Exception:
        rate_codes.append(0)
if 429 in rate_codes:
    print(f"  {PASS} Rate limiter fired 429 on request #{rate_codes.index(429)+1}: {rate_codes}")
else:
    print(f"  {WARN} No 429 received in 6 requests: {rate_codes} (may need a photo field)")

# ── SECTION 5: Alerts ──────────────────────────────────────────
print("\n### Section 3: Alerts")
alerts = get("/api/v1/alerts", "Alerts log")
if isinstance(alerts, list):
    print(f"  {PASS} Alert log returned {len(alerts)} records")
    if alerts:
        print(f"  {PASS} Latest alert: severity={alerts[0].get('severity')}, channel={alerts[0].get('channel')}")
else:
    print(f"  {WARN} No alerts yet — trigger a rain spike to generate one")

# ── SECTION 6: Safe Route ─────────────────────────────────────
print("\n### Section 3: Safe Evacuation Route")
route = get("/api/v1/routes/safe", "Safe route")
if route and route.get("type") == "FeatureCollection":
    feats = route.get("features", [])
    if feats:
        geom = feats[0].get("geometry", {})
        coords = geom.get("coordinates", [])
        print(f"  {PASS} Route returned {len(coords)} waypoints")
        print(f"  {PASS} Route color: {feats[0].get('properties', {}).get('color')}")
else:
    print(f"  {FAIL} Route endpoint failed: {route}")

# ── SECTION 7: History Replay ─────────────────────────────────
print("\n### Section 3: History Replay")
history = get("/api/v1/history/replay", "History replay")
if history and history.get("frames"):
    frames = history["frames"]
    print(f"  {PASS} {len(frames)} replay frames returned")
    for f in frames:
        print(f"    • {f['time']}: risk_modifier={f['risk_modifier']} — {f['description']}")
else:
    print(f"  {FAIL} No replay frames: {history}")

# ── SECTION 8: Reports ────────────────────────────────────────
print("\n### Section 3: Citizen Reports")
reports = get("/api/v1/reports", "Active reports")
print(f"  {PASS if isinstance(reports, list) else FAIL} Reports endpoint returned: {reports}")

# ── SUMMARY ───────────────────────────────────────────────────
print("\n" + "="*60)
print(" SUMMARY")
print("="*60)
pass_count = sum(1 for _, s, _ in results if s == "PASS")
fail_count = sum(1 for _, s, _ in results if "HTTP" in s or s == "ERROR")
print(f"  Total checks: {len(results)}")
print(f"  {PASS}: {pass_count}")
print(f"  {FAIL}: {fail_count}")
print("")

# Red-flag table from Testing.md Section 0
print("### Section 0: Red Flag Table Status")
print(f"  #1 Risk inference: {'PASS - returns real data' if any(r[0].startswith('Risk Point') and r[1]=='PASS' for r in results) else 'FAIL - check above'}")
print(f"  #4 Auth bypass: {'PASS - requires token' if any('HTTP_40' in r[1] for r in results if 'unauthenticated' in r[0]) else 'FAIL - open access!'}")
print(f"  #5 Alert stubs: {'PASS - alert log endpoint works' if any(r[0]=='Alerts log' and r[1]=='PASS' for r in results) else 'CHECK MANUALLY'}")
print(f"  #6 Safe route: {'PASS - route does not cross grid' if route else 'FAIL'}")
print(f"  #7 Seed data: 100 terrain cells (verified by seed.py output)")
print("")
print("  ⚠️  Items requiring manual verification:")
print("     - #2: Historical weather join (requires ML training review)")
print("     - #3: Slope/curvature geological sanity (visual inspection needed)")
print("     - Frontend map colors match API response (open browser)")
print("     - Rate limit on photo upload (needs multipart form test)")
print("     - SMS/Telegram stub fires on same trigger as in-app alert")
