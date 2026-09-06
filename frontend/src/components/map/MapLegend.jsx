import React from 'react';
import { getRiskColor } from '../../design/risk-gradient';

const MapLegend = () => {
  const tiers = ['Low', 'Moderate', 'High', 'Critical'];

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'var(--bg-surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: '4px',
      padding: '0.75rem',
      zIndex: 1,
      minWidth: '150px'
    }}>
      <h3 style={{ 
        fontFamily: 'var(--font-display)', 
        fontSize: '0.875rem', 
        marginBottom: '0.75rem',
        marginTop: 0
      }}>
        Risk Severity
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tiers.map(tier => (
          <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: getRiskColor(tier),
              borderRadius: '2px'
            }} />
            <span style={{ 
              fontFamily: 'var(--font-body)', 
              fontSize: '0.75rem', 
              color: 'var(--text-primary)' 
            }}>
              {tier}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapLegend;
