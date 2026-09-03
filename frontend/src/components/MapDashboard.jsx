import React, { useEffect, useState, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import SidePanel from './SidePanel';
import { CloudRain, Navigation, History, Play, Pause, FastForward } from 'lucide-react';

export default function MapDashboard() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [reports, setReports] = useState([]);
  
  // New features state
  const [rainDelta, setRainDelta] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [routeActive, setRouteActive] = useState(false);
  
  // History playback state
  const [historyFrames, setHistoryFrames] = useState([]);
  const [playingHistory, setPlayingHistory] = useState(false);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [92.5, 27.2],
      zoom: 12
    });

    map.current.on('load', async () => {
      // Hazard Grid Layer
      map.current.addSource('hazard-grid', {
        type: 'geojson',
        data: `http://localhost:8000/api/v1/risk/grid?rainfall_delta=0`
      });

      map.current.addLayer({
        id: 'hazard-grid-layer',
        type: 'fill',
        source: 'hazard-grid',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'probability'],
            0.0, '#22c55e', 
            0.3, '#eab308', 
            0.6, '#f97316', 
            0.8, '#ef4444', 
            1.0, '#991b1b'
          ],
          'fill-opacity': 0.6,
          'fill-outline-color': 'rgba(255,255,255,0.1)'
        }
      });

      // Safe Route Layer
      map.current.addSource('safe-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'safe-route-layer',
        type: 'line',
        source: 'safe-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 4,
          'line-dasharray': [0, 2] // Dashed line
        }
      });

      fetchReports();
      fetchAlerts();

      map.current.on('click', 'hazard-grid-layer', async (e) => {
        if (e.features.length > 0) {
          const feature = e.features[0];
          const lat = e.lngLat.lat;
          const lon = e.lngLat.lng;
          setSelectedCell({ lat, lon, props: feature.properties });
          
          try {
            const res = await fetch(`http://localhost:8000/api/v1/risk?lat=${lat}&lon=${lon}`);
            const data = await res.json();
            setRiskData(data);
          } catch(err) {
            console.error(err);
          }
        }
      });

      map.current.on('mouseenter', 'hazard-grid-layer', () => map.current.getCanvas().style.cursor = 'pointer');
      map.current.on('mouseleave', 'hazard-grid-layer', () => map.current.getCanvas().style.cursor = '');
      
      // Load History Data
      fetch('http://localhost:8000/api/v1/history/replay')
        .then(r => r.json())
        .then(d => setHistoryFrames(d.frames));
    });

    const interval = setInterval(() => {
      if (!playingHistory) {
        fetchReports();
        fetchAlerts();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Update map when rainDelta changes (if not playing history)
  useEffect(() => {
    if (map.current && map.current.getSource('hazard-grid') && !playingHistory) {
      map.current.getSource('hazard-grid').setData(`http://localhost:8000/api/v1/risk/grid?rainfall_delta=${rainDelta}`);
    }
  }, [rainDelta]);

  // Handle History Playback
  useEffect(() => {
    let timer;
    if (playingHistory && historyFrames.length > 0) {
      const frame = historyFrames[currentFrameIdx];
      
      // We simulate the history frame by injecting its risk modifier as rainfall delta equivalent
      if (map.current && map.current.getSource('hazard-grid')) {
        map.current.getSource('hazard-grid').setData(`http://localhost:8000/api/v1/risk/grid?rainfall_delta=${frame.risk_modifier * 200}`);
      }

      timer = setTimeout(() => {
        if (currentFrameIdx < historyFrames.length - 1) {
          setCurrentFrameIdx(prev => prev + 1);
        } else {
          setPlayingHistory(false);
        }
      }, 3000); // 3 seconds per frame
    }
    return () => clearTimeout(timer);
  }, [playingHistory, currentFrameIdx, historyFrames]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/alerts');
      const data = await res.json();
      setAlerts(data);
    } catch(err) {}
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/reports');
      const data = await res.json();
      setReports(data);
    } catch(err) {}
  };

  const toggleSafeRoute = async () => {
    if (routeActive) {
      map.current.getSource('safe-route').setData({ type: 'FeatureCollection', features: [] });
      setRouteActive(false);
    } else {
      const res = await fetch('http://localhost:8000/api/v1/routes/safe');
      const data = await res.json();
      map.current.getSource('safe-route').setData(data);
      setRouteActive(true);
    }
  };

  const startReplay = () => {
    setCurrentFrameIdx(0);
    setPlayingHistory(true);
  };

  return (
    <div className="dashboard-container">
      <div ref={mapContainer} className="map-container" />
      
      {/* Top Bar with Multiple Controls */}
      <div className="top-bar-complex">
        
        {/* Title & Routing */}
        <div className="top-panel glass-panel">
          <h1>NER-DRISHTI Control</h1>
          <button className={`btn-primary ${routeActive ? 'active' : ''}`} onClick={toggleSafeRoute}>
            <Navigation size={18} /> {routeActive ? 'Clear Route' : 'Plan Safe Route'}
          </button>
        </div>

        {/* Cloudburst Simulator */}
        <div className="top-panel glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CloudRain size={18} color="#60a5fa" />
            <h3 style={{fontSize: '0.9rem', margin: 0}}>What-If: Cloudburst</h3>
          </div>
          <input 
            type="range" 
            min="0" max="200" step="10" 
            value={rainDelta} 
            onChange={(e) => setRainDelta(e.target.value)} 
            disabled={playingHistory}
            style={{width: '100%'}}
          />
          <div style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem'}}>
            Simulated Rain Delta: +{rainDelta} mm/h
          </div>
        </div>

        {/* Historical Replay */}
        <div className="top-panel glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <History size={18} color="#a78bfa" />
            <h3 style={{fontSize: '0.9rem', margin: 0}}>Event Replay (Dima Hasao)</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-icon" onClick={playingHistory ? () => setPlayingHistory(false) : startReplay}>
              {playingHistory ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <div style={{ flex: 1, fontSize: '0.8rem', color: '#f8fafc' }}>
              {playingHistory ? historyFrames[currentFrameIdx]?.time + " - " + historyFrames[currentFrameIdx]?.description : "Ready"}
            </div>
          </div>
        </div>

      </div>

      {alerts.length > 0 && (
        <div className="alerts-feed">
          {alerts.map(a => (
            <div key={a.id} className={`alert-toast ${a.severity === 'Critical' ? 'alert-critical' : 'alert-high'}`}>
              <strong>{a.severity} Alert</strong> - {a.message}
            </div>
          ))}
        </div>
      )}

      <SidePanel data={riskData} onClose={() => { setSelectedCell(null); setRiskData(null); }} />
    </div>
  );
}
