const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let token = null;

async function getToken() {
  if (token) return token;
  try {
    const formData = new FormData();
    formData.append('username', 'admin');
    formData.append('password', 'password');
    const res = await fetch(`${BASE_URL}/api/v1/token`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) return null;
    const data = await res.json();
    token = data.access_token;
    return token;
  } catch (e) {
    return null;
  }
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const t = await getToken();
    const headers = options.headers || {};
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
    }
    const finalOptions = { ...options, headers };
    
    const res = await fetch(`${BASE_URL}${endpoint}`, finalOptions);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return { data: await res.json(), error: null };
  } catch (error) {
    console.error(`API Fetch Error (${endpoint}):`, error);
    return { data: null, error };
  }
}

export async function fetchHealth() {
  return fetchAPI('/health');
}

export async function fetchRiskGrid(rainfallDelta = null) {
  const url = rainfallDelta !== null ? `/api/v1/risk/grid?rainfall_delta=${rainfallDelta}` : '/api/v1/risk/grid';
  return fetchAPI(url);
}

export async function fetchCurrentWeather() {
  return fetchAPI('/api/v1/weather/current');
}

export async function fetchRisk(lat, lon) {
  return fetchAPI(`/api/v1/risk?lat=${lat}&lon=${lon}`);
}

export async function fetchReports() {
  return fetchAPI('/api/v1/reports');
}

export async function submitReport(formData) {
  return fetchAPI('/api/v1/reports/submit', {
    method: 'POST',
    body: formData
  });
}

export async function fetchRoadsImpacted() {
  // Mocking token if necessary, normally we would add Authorization header
  return fetchAPI('/api/v1/roads-impacted');
}

export async function fetchAlerts() {
  return fetchAPI('/api/v1/alerts');
}

export async function fetchHistoryReplay() {
  return fetchAPI('/api/v1/history/replay');
}

export async function fetchSafeRoutes() {
  return fetchAPI('/api/v1/routes/safe');
}

export async function toggleRainSimulation(enable) {
  return fetchAPI(`/api/v1/simulate/rain?enable=${enable}`, { method: 'POST' });
}
