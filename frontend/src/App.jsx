import React, { useState } from 'react'
import MapDashboard from './components/MapDashboard'
import ReportForm from './components/ReportForm'
import './App.css'

function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'report'

  return (
    <div className="App">
      {view === 'dashboard' ? (
        <MapDashboard />
      ) : (
        <div className="form-container glass-panel">
          <ReportForm />
        </div>
      )}
      
      <div className="mode-switcher glass-panel" style={{ padding: '0.5rem' }}>
        <button 
          className="btn-primary" 
          onClick={() => setView(view === 'dashboard' ? 'report' : 'dashboard')}
        >
          Switch to {view === 'dashboard' ? 'Citizen Reporter' : 'Authority Dashboard'}
        </button>
      </div>
    </div>
  )
}

export default App
