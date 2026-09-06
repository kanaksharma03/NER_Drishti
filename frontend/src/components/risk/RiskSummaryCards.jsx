import React, { useEffect, useState } from 'react';
import { fetchRiskSummary } from '../../services/api';
import { getRiskColor } from '../../design/risk-gradient';

const RiskSummaryCards = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchRiskSummary().then(data => {
      if (mounted) setSummary(data);
    });
    return () => mounted = false;
  }, []);

  if (!summary) return <div style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Loading summary...</div>;

  const tiers = ['Critical', 'High', 'Moderate', 'Low'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '1rem' }}>
      {tiers.map(tier => (
        <div key={tier} style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '4px',
          padding: '0.75rem',
          textAlign: 'center',
          borderTop: `3px solid ${getRiskColor(tier)}`
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            {summary[tier] || 0}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {tier}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RiskSummaryCards;
