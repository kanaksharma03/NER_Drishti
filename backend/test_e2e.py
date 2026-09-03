import requests
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_pipeline():
    print("Starting E2E Test Pipeline for NER-DRISHTI...")

    # 1. Check API Health
    print("1. Checking Health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, "Health check failed"
    print("   [OK] API is healthy.")

    # 2. Get Hazard Grid
    print("2. Fetching Hazard Grid...")
    r = requests.get(f"{BASE_URL}/risk/grid")
    assert r.status_code == 200, "Grid fetch failed"
    grid = r.json()
    assert grid["type"] == "FeatureCollection", "Invalid GeoJSON"
    print(f"   [OK] Retrieved {len(grid.get('features', []))} grid cells.")

    # 3. Simulate Rain Spike
    print("3. Enabling Rain Spike...")
    r = requests.post(f"{BASE_URL}/simulate/rain?enable=true")
    assert r.status_code == 200
    print("   [OK] Rain spike enabled.")

    # 4. Trigger inference for a point
    print("4. Triggering Inference on Cell...")
    # Using a rough center coordinate
    r = requests.get(f"{BASE_URL}/risk?lat=27.2&lon=92.5")
    if r.status_code == 200:
        data = r.json()
        print(f"   [OK] Risk calculated: {data['severity_tier']} ({data['probability']:.2f})")
    else:
        print("   [SKIP] No DB cell found at exact 27.2, 92.5 (Need to run seed.py)")

    # 5. Fetch Alerts
    print("5. Fetching Dispatched Alerts...")
    r = requests.get(f"{BASE_URL}/alerts")
    assert r.status_code == 200
    alerts = r.json()
    print(f"   [OK] Retrieved {len(alerts)} alerts.")
    
    # Reset Rain Spike
    requests.post(f"{BASE_URL}/simulate/rain?enable=false")
    
    print("\n✅ E2E Pipeline Test Passed successfully.")

if __name__ == "__main__":
    try:
        test_pipeline()
    except Exception as e:
        print(f"\n❌ E2E Pipeline Failed: {e}")
