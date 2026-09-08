import * as API from './api.js';

const $$ = (selector) => document.querySelectorAll(selector);
const navLinks = $$('nav a, [data-go]');
const views = $$('.view');
const title = document.querySelector('#page-title');
const titleMap = { dashboard: 'Command Center', alerts: 'Early Warnings', reports: 'Field Reports', analytics: 'Historical Event Replay', simulation: 'What-if Simulation', 'safe-routes': 'Safe Routes', 'data-sources': 'Data Sources', events: 'Historical Landslide Events' };

function switchView(id) {
  views.forEach(v => v.classList.toggle('active', v.id === id));
  $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.view === id));
  title.innerHTML = titleMap[id] || titleMap.dashboard;
  window.location.hash = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); switchView(link.dataset.view || link.dataset.go); }));

const modal = document.querySelector('#modal');
function showModal(){ modal.classList.add('open'); }
const ackBtn = document.querySelector('#ack-alert');
if (ackBtn) ackBtn.addEventListener('click', showModal);
$$('.ack').forEach(b => b.addEventListener('click', showModal));
$$('.close-modal, .close-action').forEach(b => b.addEventListener('click', () => modal.classList.remove('open')));
modal.addEventListener('click', e => { if(e.target === modal) modal.classList.remove('open'); });

let map;
async function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [93.5, 27.5],
    zoom: 6,
    attributionControl: false
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  map.on('load', async () => {
    const gridRes = await API.fetchRiskGrid();
    if (gridRes.data && gridRes.data.features && gridRes.data.features.length > 0) {
      map.addSource('risk-grid', {
        type: 'geojson',
        data: gridRes.data
      });

      map.addLayer({
        id: 'risk-grid-layer',
        type: 'fill',
        source: 'risk-grid',
        paint: {
          'fill-color': [
            'step',
            ['get', 'probability'],
            '#22c55e', 0.3,
            '#f59e0b', 0.6,
            '#f97316', 0.8,
            '#ef4444'
          ],
          'fill-opacity': 0.7,
          'fill-outline-color': '#ffffff'
        }
      });
      
      const bounds = new maplibregl.LngLatBounds();
      gridRes.data.features.forEach(f => {
        if (f.geometry && f.geometry.coordinates) {
          f.geometry.coordinates[0].forEach(coord => {
            bounds.extend(coord);
          });
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50 });
      }

      map.on('click', 'risk-grid-layer', async (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const coords = e.lngLat;
        
        document.querySelector('#site-name').textContent = `Cell ${feature.id || 'Selected'}`;
        document.querySelector('.coordinates').textContent = `${coords.lat.toFixed(3)}° N, ${coords.lng.toFixed(3)}° E`;
        document.querySelector('#risk-probability').textContent = '--%';
        document.querySelector('#risk-level').textContent = '--';
        document.querySelector('.priority').textContent = 'Loading risk analysis...';
        
        const shapContainer = document.querySelector('.shap');
        shapContainer.innerHTML = '<div class="loading-state">Fetching TreeSHAP factors...</div>';
        
        document.querySelector('.risk-drawer').animate([{transform:'translateX(18px)',opacity:.35},{transform:'translateX(0)',opacity:1}],{duration:320,easing:'ease-out'});

        const riskRes = await API.fetchRisk(coords.lat, coords.lng);
        if (riskRes.error) {
          shapContainer.innerHTML = '<div class="error-state">Risk data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
          return;
        }
        
        if (riskRes.data) {
          const riskData = riskRes.data;
          document.querySelector('#risk-probability').textContent = `${(riskData.probability * 100).toFixed(0)}%`;
          document.querySelector('#risk-level').textContent = riskData.severity_tier.toUpperCase();
          document.querySelector('.priority').textContent = riskData.severity_tier === 'Critical' ? 'P1 · IMMEDIATE RESPONSE' : riskData.severity_tier === 'High' ? 'P2 · INSPECTION REQUIRED' : 'P3 · MONITOR';
          
          shapContainer.innerHTML = '<div class="mini-head"><h4>Why is it risky?</h4><span>TreeSHAP Factors</span></div><p style="font-size: 0.8rem; color: #78839a; margin-bottom: 12px; margin-top: -8px;">Red bars increase risk. Green bars decrease risk.</p>';
          
          if (!riskData.top_factors || riskData.top_factors.length === 0) {
            shapContainer.innerHTML += '<div class="empty-state">No specific factors identified.</div>';
          } else {
            const sortedFactors = [...riskData.top_factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
            
            sortedFactors.forEach(f => {
              const factorDiv = document.createElement('div');
              factorDiv.className = 'factor';
              const percent = Math.min(100, Math.abs(f.contribution * 100)).toFixed(0);
              let label = f.feature.replace(/_/g, ' ').replace('sum', '').trim();
              label = label.charAt(0).toUpperCase() + label.slice(1);
              const isPositive = f.contribution > 0;
              const sign = isPositive ? '+' : '';
              const barColor = isPositive ? '#ef4444' : '#22c55e';
              
              factorDiv.innerHTML = `<label>${label} <b style="color:${barColor}">${sign}${f.contribution.toFixed(3)}</b></label><i><em style="width:${percent}%; background:${barColor}"></em></i>`;
              shapContainer.appendChild(factorDiv);
            });
          }
        }
      });
      
      map.on('mouseenter', 'risk-grid-layer', () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', 'risk-grid-layer', () => map.getCanvas().style.cursor = '');
      
      // Layer toggles
      const riskToggle = document.querySelector('#layer-toggle-risk');
      if (riskToggle) {
        riskToggle.addEventListener('change', e => {
          if(map.getLayer('risk-grid-layer')) map.setLayoutProperty('risk-grid-layer', 'visibility', e.target.checked ? 'visible' : 'none');
        });
      }
      const safeToggle = document.querySelector('#layer-toggle-safe-routes');
      if (safeToggle) {
        safeToggle.addEventListener('change', e => {
          if(map.getLayer('safe-routes-layer')) map.setLayoutProperty('safe-routes-layer', 'visibility', e.target.checked ? 'visible' : 'none');
        });
      }
    }
  });
}

async function updateMapGrid(rainfallDelta) {
  if (!map || !map.getSource('risk-grid')) return;
  const gridRes = await API.fetchRiskGrid(rainfallDelta);
  if (gridRes.data && gridRes.data.features) {
    map.getSource('risk-grid').setData(gridRes.data);
  }
}

const slider = document.querySelector('#rain-slider');
slider.addEventListener('input', () => {
  const amount = +slider.value;
  document.querySelector('#rain-value').innerHTML = `+${amount} <small>mm</small>`;
});
document.querySelector('#run-sim').addEventListener('click', async e => { 
  e.currentTarget.innerHTML = 'Running...'; 
  await API.toggleRainSimulation(true);
  await updateMapGrid(+slider.value);
  e.currentTarget.innerHTML = 'Simulation complete <span>✓</span>'; 
  
  let badge = document.querySelector('.sim-active-badge');
  if(!badge) {
    badge = document.createElement('div');
    badge.className = 'sim-active-badge';
    badge.style.cssText = 'position:absolute; top:20px; right:20px; background:#ef4444; color:white; padding:8px 12px; font-size:12px; font-weight:bold; border-radius:4px; z-index:100;';
    badge.textContent = 'SIMULATION: Not an official warning';
    document.querySelector('.map-card').appendChild(badge);
  }
});

navigator.geolocation.getCurrentPosition(
  pos => {
    document.querySelector('#form-lat').value = pos.coords.latitude;
    document.querySelector('#form-lon').value = pos.coords.longitude;
    document.querySelector('#gps-status').textContent = '● GPS ready';
  },
  err => {
    document.querySelector('#form-lat').value = '';
    document.querySelector('#form-lon').value = '';
    document.querySelector('#form-lat').removeAttribute('readonly');
    document.querySelector('#form-lon').removeAttribute('readonly');
    document.querySelector('#gps-status').textContent = '○ GPS unavailable (Enter manually)';
  }
);

document.querySelector('#report-form').addEventListener('submit', async e => { 
  e.preventDefault(); 
  const btn = document.querySelector('#submit-btn');
  const errorEl = document.querySelector('#submit-error');
  const toast = document.querySelector('#report-toast');
  
  btn.innerHTML = 'Submitting...';
  btn.disabled = true;
  errorEl.style.display = 'none';
  
  const formData = new FormData(e.target);
  const res = await API.submitReport(formData);
  
  btn.disabled = false;
  btn.innerHTML = 'Submit secure report <span>→</span>';
  
  if (res.error) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Submission failed. Please try again.';
  } else {
    toast.textContent = `Report queued successfully (Cluster ${res.data.cluster_id || 'N/A'}).`;
    toast.classList.add('show'); 
    e.target.reset();
    setTimeout(() => toast.classList.remove('show'), 4000);
    initReports();
  }
});
document.querySelector('#notify').addEventListener('click',()=>switchView('alerts'));

async function initDashboard() {
  const health = await API.fetchHealth();
  const statusEl = document.querySelector('#system-status');
  if (health.data && health.data.status === 'ok') {
    statusEl.innerHTML = `SYSTEM: <span>ONLINE</span>`;
    statusEl.className = 'system-status online';
  } else {
    statusEl.innerHTML = `SYSTEM: <span>OFFLINE / DEGRADED</span>`;
    statusEl.className = 'system-status offline';
  }

  const [gridRes, weatherRes, reportsRes] = await Promise.all([
    API.fetchRiskGrid(),
    API.fetchCurrentWeather(),
    API.fetchReports()
  ]);

  if (gridRes.data && gridRes.data.features) {
    const features = gridRes.data.features;
    let criticalCount = 0;
    let activeZones = 0;
    features.forEach(f => {
      const prob = f.properties.probability;
      if (prob >= 0.6) activeZones++;
      if (prob >= 0.8) criticalCount++;
    });
    document.querySelector('#kpi-active-zones').textContent = activeZones;
    document.querySelector('#kpi-critical-sites').textContent = criticalCount;
    document.querySelector('#kpi-critical-action').textContent = `${criticalCount} require`;
  }

  initMap();

  if (weatherRes.data && weatherRes.data.length > 0) {
    const latest = weatherRes.data[0];
    document.querySelector('#kpi-rain').innerHTML = `${latest.rainfall_24h_sum !== null ? latest.rainfall_24h_sum : 'N/A'} <small>mm</small>`;
  } else {
    document.querySelector('#kpi-rain').innerHTML = `N/A <small>mm</small>`;
  }

  if (reportsRes.data) {
    document.querySelector('#kpi-open-reports').textContent = reportsRes.data.length;
  } else {
    document.querySelector('#kpi-open-reports').textContent = 'N/A';
  }
}

async function initAlerts() {
  const container = document.querySelector('#alert-container');
  container.innerHTML = '<div class="loading-state">Loading active alerts...</div>';
  
  const alertsRes = await API.fetchAlerts();
  
  if (alertsRes.error) {
    container.innerHTML = '<div class="error-state">Warning data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
    return;
  }
  
  const alerts = alertsRes.data;
  
  const notifyBtn = document.querySelector('#notify');
  if (notifyBtn) {
    notifyBtn.innerHTML = alerts && alerts.length > 0 ? `♧<span style="position:absolute; top:-2px; right:-2px; background:#ef4444; width:8px; height:8px; border-radius:50%;"></span>` : `♧`;
  }

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '<div class="empty-state">No active warnings</div>';
    return;
  }
  
  container.innerHTML = '';
  alerts.forEach(alert => {
    const isCritical = alert.severity === 'Critical';
    const isHigh = alert.severity === 'High';
    const article = document.createElement('article');
    
    let rowClass = 'alert-row';
    let sevClass = 'severity';
    let px = 'P3';
    let actionBtn = '<button class="outline small">View detail</button>';
    
    if (isCritical) {
      rowClass += ' critical-alert';
      px = 'P1';
      actionBtn = '<button class="primary small ack">Acknowledge</button>';
    } else if (isHigh) {
      sevClass += ' high-severity';
      px = 'P2';
    } else {
      sevClass += ' med-severity';
    }
    
    article.className = rowClass;
    
    const timeString = new Date(alert.sent_at).toLocaleString();
    
    article.innerHTML = `
      <div class="${sevClass}">${px}<br><small>${alert.severity}</small></div>
      <div>
        <h3>${alert.message}</h3>
        <p>Audience: ${alert.audience} · Channel: ${alert.channel} · Sent: ${timeString}</p>
      </div>
      <span>Action required based on severity</span>
      ${actionBtn}
    `;
    
    container.appendChild(article);
  });
  
  $$('.ack').forEach(b => b.addEventListener('click', showModal));
}

async function initWeather() {
  const container = document.querySelector('#weather-container');
  const tsEl = document.querySelector('#weather-timestamp');
  
  const weatherRes = await API.fetchCurrentWeather();
  
  if (weatherRes.error) {
    container.innerHTML = '<div class="error-state" style="padding:12px; color:#ef4444; background:#fef2f2; border-radius:6px; font-size:0.875rem;">Weather data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
    return;
  }
  
  if (!weatherRes.data || weatherRes.data.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:12px; color:#78839a; background:#f1f5f9; border-radius:6px; font-size:0.875rem;">No weather data available.</div>';
    return;
  }
  
  const latest = weatherRes.data[0];
  tsEl.textContent = `Updated: ${new Date(latest.timestamp).toLocaleString()}`;
  
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
      <div>
        <span style="font-size:0.75rem; font-weight:700; color:#78839a; letter-spacing:1px; display:block; margin-bottom:4px;">24H RAINFALL</span>
        <strong style="font-size:2rem; line-height:1; color:#18223d;">${latest.rainfall_24h_sum !== null ? latest.rainfall_24h_sum : 'N/A'}<small style="font-size:1rem; color:#78839a; margin-left:4px;">mm</small></strong>
      </div>
      <div style="text-align:right;">
        <span style="font-size:0.75rem; font-weight:700; color:#78839a; letter-spacing:1px; display:block; margin-bottom:4px;">SOIL MOISTURE</span>
        <strong style="font-size:1.5rem; line-height:1; color:#18223d;">${latest.soil_moisture !== null ? (latest.soil_moisture * 100).toFixed(0) : 'N/A'}<small style="font-size:1rem; color:#78839a; margin-left:4px;">%</small></strong>
      </div>
    </div>
    <div style="display:grid; grid-template-columns: 1fr; gap: 12px; margin-top: 8px;">
      <div>
        <span style="font-size:0.65rem; color:#78839a; display:block;">1H INTENSITY</span>
        <b style="font-size:0.875rem; color:#18223d;">${latest.rainfall_1h !== null ? latest.rainfall_1h + ' mm/h' : 'N/A'}</b>
      </div>
    </div>
  `;
}

async function initInfrastructure() {
  const container = document.querySelector('#infra-container');
  
  const infraRes = await API.fetchRoadsImpacted();
  
  if (infraRes.error) {
    container.innerHTML = '<div class="error-state" style="padding:12px; color:#ef4444; background:#fef2f2; border-radius:6px; font-size:0.875rem;">Infrastructure data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
    return;
  }
  
  if (!infraRes.data || !infraRes.data.impacted_segments || infraRes.data.impacted_segments.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:12px; color:#78839a; background:#f1f5f9; border-radius:6px; font-size:0.875rem;">No impacted infrastructure reported.</div>';
    return;
  }
  
  container.innerHTML = '';
  infraRes.data.impacted_segments.forEach(seg => {
    const isCritical = seg.risk_level === 'Critical';
    const color = isCritical ? '#ef4444' : (seg.risk_level === 'High' ? '#f97316' : '#f59e0b');
    
    const div = document.createElement('div');
    div.style.cssText = `padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; flex-direction: column; gap: 8px;`;
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin: 0; font-size: 1rem; color: #18223d;">${seg.name} <small style="font-weight: normal; color: #78839a;">(${seg.highway_class})</small></h4>
        <span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">${seg.risk_level}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

async function initReports() {
  const container = document.querySelector('#incidents-container');
  container.innerHTML = '<div class="loading-state">Loading incidents...</div>';
  
  const reportsRes = await API.fetchReports();
  
  if (reportsRes.error) {
    container.innerHTML = '<div class="error-state">Report data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
    return;
  }
  
  if (!reportsRes.data || reportsRes.data.length === 0) {
    container.innerHTML = '<div class="empty-state">No field reports submitted.</div>';
    return;
  }
  
  container.innerHTML = '';
  reportsRes.data.slice(0, 3).forEach(report => {
    const div = document.createElement('div');
    div.className = 'incident';
    const date = new Date(report.created_at).toLocaleString();
    div.innerHTML = `
      <div class="incident-icon red-bg">▰</div>
      <p><b>Incident #${report.id || 'N/A'}</b>
      <span>Lat: ${report.lat.toFixed(3)}, Lon: ${report.lon.toFixed(3)} · ${date}</span></p>
      <em>ACTIVE</em>
    `;
    container.appendChild(div);
  });
}

async function initHistoricalReplay() {
  const container = document.querySelector('#replay-container');
  container.innerHTML = '<div class="loading-state">Loading historical event...</div>';
  
  const replayRes = await API.fetchHistoryReplay();
  
  if (replayRes.error) {
    container.innerHTML = '<div class="error-state">Historical data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
    return;
  }
  
  if (!replayRes.data || !replayRes.data.frames) {
    container.innerHTML = '<div class="empty-state">No historical replay data available.</div>';
    return;
  }
  
  const eventData = replayRes.data;
  let currentFrame = 0;
  
  const uiHTML = `
    <div style="background:#f8fafc; border-radius:8px; padding:16px;">
      <h4 style="margin:0 0 12px 0; font-size:1rem; color:#18223d;">Event: ${eventData.event}</h4>
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:12px;">
        <strong id="replay-time" style="font-size:1.5rem; color:#724dff;">${eventData.frames[0].time}</strong>
        <button id="replay-play-btn" class="primary small" style="min-width:80px;">Play</button>
      </div>
      <div>
        <span style="font-size:0.75rem; color:#78839a; display:block; margin-bottom:4px;">STATUS</span>
        <b id="replay-desc" style="font-size:0.875rem; color:#18223d;">${eventData.frames[0].description}</b>
      </div>
      <div style="margin-top:12px; font-size:0.75rem; color:#ef4444;" id="replay-risk-indicator">
        Risk Modifier: ${(eventData.frames[0].risk_modifier * 100).toFixed(0)}%
      </div>
    </div>
  `;
  container.innerHTML = uiHTML;
  
  const playBtn = document.querySelector('#replay-play-btn');
  const timeEl = document.querySelector('#replay-time');
  const descEl = document.querySelector('#replay-desc');
  const riskEl = document.querySelector('#replay-risk-indicator');
  
  let isPlaying = false;
  
  playBtn.addEventListener('click', async () => {
    if (isPlaying) return;
    isPlaying = true;
    playBtn.textContent = 'Playing...';
    playBtn.disabled = true;
    
    if (map) switchView('dashboard');
    
    for (let i = 0; i < eventData.frames.length; i++) {
      currentFrame = i;
      const frame = eventData.frames[i];
      timeEl.textContent = frame.time;
      descEl.textContent = frame.description;
      riskEl.textContent = `Risk Modifier: ${(frame.risk_modifier * 100).toFixed(0)}%`;
      
      await updateMapGrid(frame.risk_modifier * 200);
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    isPlaying = false;
    playBtn.textContent = 'Replay';
    playBtn.disabled = false;
    await updateMapGrid(0);
  });
}

initDashboard();
initAlerts();
initWeather();
initInfrastructure();
initReports();
initHistoricalReplay();
initSafeRoutes();

async function initSafeRoutes() {
  const container = document.querySelector('#safe-route-status');
  if(!container) return;
  container.innerHTML = '<div class="loading-state">Fetching safe route data...</div>';

  const routeRes = await API.fetchSafeRoutes();

  if (routeRes.error) {
    container.innerHTML = '<div class="error-state">Route data unavailable.<br><button class="outline small" onclick="window.location.reload()">Retry</button></div>';
    return;
  }

  const data = routeRes.data;
  if (!data || !data.features || data.features.length === 0) {
    container.innerHTML = '<div class="empty-state">No safe evacuation routes currently calculated.</div>';
    return;
  }

  const feature = data.features[0];
  const hasGeometry = feature.geometry && feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
      <h3 style="margin: 0; font-size: 16px; color: #0f172a;">${feature.properties?.name || 'Safe Corridor'}</h3>
      <p style="margin: 0; font-size: 13px; color: #64748b;">This route dodges identified high-risk landslide zones.</p>
      ${hasGeometry ? '<p style="margin: 0; font-size: 13px; font-weight: 600; color: #0f766e;">Geometry mapped successfully.</p>' : '<p style="margin: 0; font-size: 13px; font-weight: 600; color: #f97316;">Note: Visual geometry unavailable for this route.</p>'}
      ${hasGeometry ? '<button id="btn-view-route" class="primary" style="align-self: flex-start; padding: 6px 12px; font-size: 12px;">View on Map</button>' : ''}
    </div>
  `;

  if (hasGeometry && map) {
    const addRoute = () => {
      if (map.getSource('safe-routes')) {
        map.getSource('safe-routes').setData(data);
      } else {
        map.addSource('safe-routes', { type: 'geojson', data: data });
        map.addLayer({
          id: 'safe-routes-layer',
          type: 'line',
          source: 'safe-routes',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#22c55e',
            'line-width': 4
          }
        });
      }
    };
    
    if (map.isStyleLoaded()) {
      addRoute();
    } else {
      map.once('load', addRoute);
    }
    
    document.querySelector('#btn-view-route').addEventListener('click', () => {
      switchView('dashboard');
      const bounds = new maplibregl.LngLatBounds();
      feature.geometry.coordinates.forEach(coord => {
        bounds.extend(coord);
      });
      map.fitBounds(bounds, { padding: 50 });
      const toggle = document.querySelector('#layer-toggle-safe-routes');
      if (toggle) toggle.checked = true;
      if (map.getLayer('safe-routes-layer')) map.setLayoutProperty('safe-routes-layer', 'visibility', 'visible');
    });
  }
}

if(location.hash) switchView(location.hash.slice(1));
