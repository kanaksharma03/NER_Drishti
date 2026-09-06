import React from 'react';
import TopStatusBar from '../components/layout/TopStatusBar';
import AlertCenter from '../components/alerts/AlertCenter';

const Alerts = () => {
  return (
    <div className="app-shell">
      <TopStatusBar />
      <div className="app-main" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', margin: '0 0 0.5rem 0' }}>Alerts Center</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage and respond to critical hazard alerts.</p>
        </div>
        <AlertCenter />
      </div>
    </div>
  );
};

export default Alerts;
