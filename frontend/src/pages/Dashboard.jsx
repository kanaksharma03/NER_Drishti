import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopStatusBar from '../components/layout/TopStatusBar';
import MapView from '../components/map/MapView';
import RiskDetailPanel from '../components/risk/RiskDetailPanel';
import RiskSummaryCards from '../components/risk/RiskSummaryCards';
import WeatherPanel from '../components/weather/WeatherPanel';
import { fetchRiskMap } from '../services/api';

const Dashboard = () => {
  const [selectedZone, setSelectedZone] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.selectedCellId) {
      // Simulate selecting the zone by finding it in the mock grid
      fetchRiskMap().then(data => {
        const feature = data.features.find(f => f.properties.cell_id === location.state.selectedCellId);
        if (feature) {
          setSelectedZone(feature.properties);
        }
      });
    }
  }, [location.state]);

  return (
    <div className="app-shell">
      <TopStatusBar />
      <div className="app-main">
        <div className="map-area" style={{ height: '100%' }}>
          <MapView onZoneSelect={setSelectedZone} highlightedCellId={selectedZone?.cell_id} />
        </div>

        <div className="right-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <RiskSummaryCards />
          <RiskDetailPanel zone={selectedZone} />
          <WeatherPanel />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
