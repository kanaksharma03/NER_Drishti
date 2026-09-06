import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAlerts, resolveAlert } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getRiskColor } from '../../design/risk-gradient';

const AlertCenter = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active, resolved, all
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const canResolve = user?.role === 'Authority/Admin' || user?.role === 'Field Officer';

  useEffect(() => {
    fetchAlerts().then(data => {
      // Sort critical to top, then by time
      const sorted = data.sort((a, b) => {
        if (a.severity === 'Critical' && b.severity !== 'Critical') return -1;
        if (b.severity === 'Critical' && a.severity !== 'Critical') return 1;
        return new Date(b.time) - new Date(a.time);
      });
      setAlerts(sorted);
      setLoading(false);
    });
  }, []);

  const handleResolve = async (id, e) => {
    e.stopPropagation();
    await resolveAlert(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
  };

  const handleAlertClick = (cellId) => {
    if (cellId) {
      navigate('/', { state: { selectedCellId: cellId } });
    }
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.status === filter);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading alerts...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '800px' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {['active', 'resolved', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--bg-surface-raised)' : 'transparent',
              border: `1px solid ${filter === f ? 'var(--border-hairline)' : 'transparent'}`,
              color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)'
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div style={{ color: 'var(--text-secondary)' }}>No alerts found.</div>
      )}

      {filteredAlerts.map(alert => {
        const isCritical = alert.severity === 'Critical';
        const isResolved = alert.status === 'resolved';
        
        return (
          <div 
            key={alert.id}
            onClick={() => handleAlertClick(alert.cell_id)}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: `1px solid ${isCritical && !isResolved ? getRiskColor('Critical') : 'var(--border-hairline)'}`,
              borderRadius: '4px',
              padding: '1rem',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: isResolved ? 0.6 : 1,
              transition: 'transform 0.1s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  color: getRiskColor(alert.severity),
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  {isCritical && '⚠️ '} {alert.severity.toUpperCase()}
                </span>
                <span className="mono-data" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {new Date(alert.time).toLocaleString()}
                </span>
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                {alert.location}
              </div>
            </div>

            {canResolve && !isResolved && (
              <button
                onClick={(e) => handleResolve(alert.id, e)}
                style={{
                  background: 'var(--bg-surface-raised)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-hairline)',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem'
                }}
              >
                Acknowledge / Resolve
              </button>
            )}
            
            {isResolved && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Resolved</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AlertCenter;
