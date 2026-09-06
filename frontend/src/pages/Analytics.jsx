import React from 'react';
import TopStatusBar from '../components/layout/TopStatusBar';

const Analytics = () => {
  return (
    <div className="app-shell">
      <TopStatusBar />
      <div className="app-main" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontFamily: 'var(--font-display)' }}>Analytics & History</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Placeholder for Analytics</p>
      </div>
    </div>
  );
};

export default Analytics;
