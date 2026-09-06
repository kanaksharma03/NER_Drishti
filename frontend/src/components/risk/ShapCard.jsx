import React, { useEffect, useState } from 'react';
import { fetchRiskDetails } from '../../services/api';

const ShapCard = ({ cellId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cellId) return;
    
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchRiskDetails(cellId)
      .then(res => {
        if (isMounted) {
          setData(res.explanations || []);
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
  }, [cellId]);

  if (!cellId) return null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-base)',
      padding: '1rem',
      borderRadius: '4px',
      border: '1px solid var(--border-hairline)',
      marginTop: '1rem'
    }}>
      <h3 style={{ 
        fontFamily: 'var(--font-body)', 
        fontSize: '0.875rem', 
        margin: '0 0 1rem 0', 
        color: 'var(--text-secondary)' 
      }}>
        Key Risk Factors (SHAP)
      </h3>

      {loading && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading explanations...</div>}
      {error && <div style={{ color: 'var(--accent-ui)', fontSize: '0.875rem' }}>Error loading data.</div>}
      
      {!loading && !error && data && data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {data.map((item, i) => {
            const isPositive = item.direction === 'positive';
            const barColor = isPositive ? 'var(--accent-ui)' : '#8FA0A8'; // Using neutral for negative
            const absContribution = Math.abs(item.contribution);
            
            // Normalize width somewhat for visualization (assuming max contribution is ~0.5 for scaling)
            const widthPct = Math.min(100, Math.max(5, (absContribution / 0.3) * 100));

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{item.feature}</span>
                  <span className="mono-data" style={{ 
                    color: isPositive ? 'var(--accent-ui)' : 'var(--text-secondary)' 
                  }}>
                    {isPositive ? '+' : '-'}{absContribution.toFixed(2)}
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '4px', 
                  backgroundColor: 'var(--bg-surface-raised)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${widthPct}%`, 
                    height: '100%', 
                    backgroundColor: barColor,
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {!loading && !error && (!data || data.length === 0) && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No explanation data available.</div>
      )}
    </div>
  );
};

export default ShapCard;
