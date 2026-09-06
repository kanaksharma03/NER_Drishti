import React from 'react';

const TopStatusBar = () => {
  return (
    <div style={{
      height: '40px',
      backgroundColor: 'var(--bg-surface-raised)',
      borderBottom: '1px solid var(--border-hairline)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      fontSize: '0.875rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-ui)' }}>
          NER-DRISHTI
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          System Status: <span style={{ color: 'var(--risk-low)' }}>Online</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)' }}>
        <span className="mono-data">Updated: {new Date().toISOString().split('T')[0]}</span>
        <span>Alerts: 0</span>
      </div>
    </div>
  );
};

export default TopStatusBar;
