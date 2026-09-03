import React from 'react';
import { X, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export default function SidePanel({ data, onClose }) {
  if (!data) return null;

  const isCritical = data.severity_tier === 'Critical';

  return (
    <div className="side-panel glass-panel">
      <button className="close-btn" onClick={onClose}><X /></button>
      
      <div className="panel-header">
        <h2>Risk Assessment</h2>
        <div className={`badge ${isCritical ? 'badge-critical' : 'badge-warning'}`}>
          {isCritical ? <AlertTriangle size={16} /> : <Info size={16} />}
          {data.severity_tier} Risk
        </div>
      </div>

      <div className="panel-section">
        <h3>Probability</h3>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${data.probability * 100}%`, background: isCritical ? '#ef4444' : '#f97316' }}></div>
        </div>
        <p className="prob-text">{(data.probability * 100).toFixed(1)}% Likelihood</p>
      </div>

      <div className="panel-section">
        <h3>Top Driving Factors (SHAP)</h3>
        <ul className="factors-list">
          {data.top_factors.map((f, i) => (
            <li key={i}>
              <span className="factor-name">{f.feature_name}</span>
              <span className={`factor-val ${f.is_positive_driver ? 'val-pos' : 'val-neg'}`}>
                {f.is_positive_driver ? '+' : '-'}{Math.abs(f.contribution_value).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {data.verification && (
        <div className="panel-section verification-section">
          <h3>Verification Status</h3>
          <div className="flex-row">
            <ShieldCheck size={20} color="#22c55e" />
            <span>Confidence: {(data.verification.confidence_score * 100).toFixed(0)}%</span>
          </div>
          {Object.values(data.verification.supporting_signals).map((s,i) => <p key={i} className="text-sm text-green">{s}</p>)}
          {Object.values(data.verification.missing_signals).map((s,i) => <p key={i} className="text-sm text-yellow">{s}</p>)}
        </div>
      )}

      {data.recommendation && (
        <div className="panel-section recommendation-section">
          <h3>Recommended Action</h3>
          <h4 className="text-highlight">{data.recommendation.priority}</h4>
          <p>{data.recommendation.action}</p>
        </div>
      )}

    </div>
  );
}
