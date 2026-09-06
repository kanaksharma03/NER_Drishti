import React from 'react';
import TopStatusBar from '../components/layout/TopStatusBar';

const Reports = () => {
  return (
    <div className="app-shell">
      <TopStatusBar />
      <div className="app-main" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontFamily: 'var(--font-display)' }}>Citizen & Field Reports</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Placeholder for Reports</p>
      </div>
    </div>
  );
};

export default Reports;
