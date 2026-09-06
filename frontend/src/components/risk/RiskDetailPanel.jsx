import React from 'react';
import { getRiskColor } from '../../design/risk-gradient';
import ShapCard from './ShapCard';

const RiskDetailPanel = ({ zone }) => {
  if (!zone) {
    return (
      <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Risk Details
        </h2>
        <p style={{ fontSize: '0.875rem' }}>Select a risk zone on the map to view details.</p>
      </div>
    );
  }

  const { cell_id, probability, elevation, slope } = zone;
  const severity = probability > 0.75 ? 'Critical' : probability > 0.5 ? 'High' : probability > 0.25 ? 'Moderate' : 'Low';
  const color = getRiskColor(severity);

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
        Risk Details
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Severity Tier</span>
          <span style={{ 
            color: color, 
            fontFamily: 'var(--font-body)', 
            fontWeight: 600,
            backgroundColor: `${color}20`,
            padding: '0.25rem 0.75rem',
            borderRadius: '12px'
          }}>
            {severity.toUpperCase()}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Probability</span>
          <span className="mono-data" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            {(probability * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'var(--bg-base)', 
        padding: '1rem', 
        borderRadius: '4px',
        border: '1px solid var(--border-hairline)'
      }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>
          Terrain Context
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Elevation</div>
            <div className="mono-data" style={{ color: 'var(--text-primary)' }}>{Math.round(elevation)}m</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Slope</div>
            <div className="mono-data" style={{ color: 'var(--text-primary)' }}>{slope.toFixed(1)}°</div>
          </div>
        </div>
      </div>

      <ShapCard cellId={cell_id} />
      
      <div style={{ 
        marginTop: 'auto',
        fontSize: '0.75rem', 
        color: 'var(--text-secondary)',
        borderTop: '1px solid var(--border-hairline)',
        paddingTop: '0.5rem'
      }}>
        Last updated: {new Date().toISOString()}
      </div>
    </div>
  );
};

export default RiskDetailPanel;
