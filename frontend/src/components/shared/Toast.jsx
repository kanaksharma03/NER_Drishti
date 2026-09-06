import React from 'react';
import { getRiskColor } from '../../design/risk-gradient';

const Toast = ({ toast, onClose }) => {
  const isCritical = toast.type === 'critical';
  const bgColor = isCritical ? `${getRiskColor('Critical')}20` : 'var(--bg-surface-raised)';
  const borderColor = isCritical ? getRiskColor('Critical') : 'var(--border-hairline)';

  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      padding: '1rem',
      borderRadius: '4px',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      minWidth: '300px',
      animation: 'slideIn 0.3s ease-out forwards'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isCritical && <span style={{ color: getRiskColor('Critical'), fontSize: '1.25rem' }}>⚠️</span>}
        <span>{toast.message}</span>
      </div>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '0.25rem'
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
