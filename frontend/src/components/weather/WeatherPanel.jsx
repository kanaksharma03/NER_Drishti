import React, { useEffect, useState } from 'react';
import { fetchWeather } from '../../services/api';

const WeatherPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    fetchWeather()
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading weather context...</div>;
    }

    if (error || !data) {
      return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Weather data unavailable.</div>;
    }

    // Check for stale data (e.g. older than 1 hour)
    const lastUpdated = new Date(data.last_updated);
    const now = new Date();
    const isStale = (now - lastUpdated) > 60 * 60 * 1000;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {isStale && (
          <div style={{ 
            backgroundColor: 'rgba(217, 115, 46, 0.1)', 
            border: '1px solid var(--accent-ui)', // Spec allows distinct styling, using orange tone
            borderColor: '#D9732E', 
            color: '#D9732E', 
            padding: '0.5rem', 
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>⚠️ STALE DATA</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current Rainfall</div>
            <div className="mono-data" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {data.current_rainfall_mm}mm
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Forecast (24h)</div>
            <div className="mono-data" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {data.forecast_24h_mm}mm
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Accumulation (72h)</div>
            <div className="mono-data" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {data.accumulation_72h_mm}mm
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Soil Moisture</div>
            <div className="mono-data" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {data.soil_moisture_pct}%
            </div>
          </div>
        </div>

        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: '0.5rem',
          marginTop: '0.5rem'
        }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      padding: '1.5rem',
      borderRadius: '4px',
      border: '1px solid var(--border-hairline)'
    }}>
      <h2 style={{ 
        fontFamily: 'var(--font-display)', 
        fontSize: '1.25rem', 
        margin: '0 0 1.25rem 0', 
        color: 'var(--text-primary)' 
      }}>
        Meteorological Context
      </h2>
      {renderContent()}
    </div>
  );
};

export default WeatherPanel;
