const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export const fetchRoads = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/roads`);
    if (!res.ok) {
      throw new Error(`Failed to fetch roads: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error fetching roads, falling back to mock:', err);
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "NH-13", class: "national" },
          geometry: {
            type: "LineString",
            coordinates: [
              [92.380, 27.140],
              [92.385, 27.145],
              [92.388, 27.148],
              [92.390, 27.150],
              [92.395, 27.152],
              [92.400, 27.158],
              [92.405, 27.162],
              [92.410, 27.165],
              [92.415, 27.170],
              [92.420, 27.175]
            ]
          }
        }
      ]
    };
  }
};

export const fetchRiskMap = async () => {
  // Generate a dense, irregular mock grid of 100 cells around the NH-13 area
  const features = [];
  const startLng = 92.35;
  const startLat = 27.10;
  const cellSize = 0.01;
  let cellId = 1;

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      // Create some irregularity: skip some cells entirely
      if (Math.random() > 0.8) continue;

      const lng = startLng + (i * cellSize);
      const lat = startLat + (j * cellSize);
      
      // Pseudo-random risk probability leaning towards lower risk
      let prob = Math.random();
      if (prob > 0.5) prob = prob * prob; // skew towards lower values
      
      features.push({
        type: "Feature",
        properties: { 
          cell_id: cellId++, 
          probability: prob, 
          elevation: Math.floor(1000 + Math.random() * 1500), 
          slope: Math.floor(5 + Math.random() * 40) 
        },
        geometry: { 
          type: "Polygon", 
          coordinates: [[
            [lng, lat], 
            [lng + cellSize, lat], 
            [lng + cellSize, lat + cellSize], 
            [lng, lat + cellSize], 
            [lng, lat]
          ]] 
        }
      });
    }
  }

  const mockGrid = {
    type: "FeatureCollection",
    features: features
  };

  try {
    const res = await fetch(`${API_BASE_URL}/risk/grid`);
    if (!res.ok) throw new Error(`Risk grid error: ${res.status}`);
    const data = await res.json();
    if (data && data.features && data.features.length === 0) {
      console.log('Backend returned empty grid, using mock data for demo');
      return mockGrid;
    }
    return data;
  } catch (err) {
    console.error('Error fetching risk map, using mock:', err);
    return mockGrid;
  }
};

export const fetchRiskSummary = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
    if (!res.ok) throw new Error(`Summary error: ${res.status}`);
    const data = await res.json();
    if (Object.keys(data).length > 0) {
      return data;
    }
  } catch (err) {
    console.error('Error fetching risk summary, computing from mock grid:', err);
  }

  // Fallback to computing counts from the mock grid data we use in fetchRiskMap
  const mockMap = await fetchRiskMap();
  const summary = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
  
  mockMap.features.forEach(f => {
    const p = f.properties.probability;
    if (p > 0.75) summary.Critical++;
    else if (p > 0.50) summary.High++;
    else if (p > 0.25) summary.Moderate++;
    else summary.Low++;
  });
  
  return summary;
};

export const fetchWeather = async () => {
  const res = await fetch(`${API_BASE_URL}/weather`);
  if (!res.ok) throw new Error(`Weather error: ${res.status}`);
  return await res.json();
};

export const fetchRiskDetails = async (cellId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/risk/${cellId}`);
    if (!res.ok) throw new Error(`Risk details error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching risk details, returning mock SHAP data:', err);
    // Mock SHAP response because backend table is missing
    return {
      cell_id: cellId,
      explanations: [
        { feature: 'Rainfall (72h)', contribution: 0.18, direction: 'positive' },
        { feature: 'Slope', contribution: 0.12, direction: 'positive' },
        { feature: 'Vegetation Cover', contribution: -0.08, direction: 'negative' },
        { feature: 'Soil Moisture', contribution: 0.05, direction: 'positive' }
      ]
    };
  }
};
export const fetchAlerts = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/alerts`);
    if (!res.ok) throw new Error(`Alerts error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching alerts, returning mock data:', err);
    return [
      { id: 'al-1', severity: 'Critical', location: 'NH-13 km 42', time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: 'active', cell_id: 3 },
      { id: 'al-2', severity: 'High', location: 'Bomdila Bypass', time: new Date(Date.now() - 1000 * 60 * 45).toISOString(), status: 'active', cell_id: 12 },
      { id: 'al-3', severity: 'Moderate', location: 'Rupa River Road', time: new Date(Date.now() - 1000 * 60 * 120).toISOString(), status: 'resolved', cell_id: 45 }
    ];
  }
};

export const resolveAlert = async (id) => {
  console.log(`Resolving alert ${id} (mock action)`);
  return { success: true };
};
