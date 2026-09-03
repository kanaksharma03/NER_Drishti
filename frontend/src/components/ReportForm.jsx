import React, { useState, useEffect } from 'react';
import { openDB } from 'idb';

// Initialize IndexedDB for offline queueing
const dbPromise = openDB('NERDrishtiOffline', 1, {
  upgrade(db) {
    db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
  },
});

export default function ReportForm() {
  const [type, setType] = useState('landslide');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Auto-fetch geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !location) {
      setStatusMsg("Please provide a photo and allow location access.");
      return;
    }

    setIsSubmitting(true);
    setStatusMsg('');

    const formData = new FormData();
    formData.append('type', type);
    formData.append('description', description);
    formData.append('lat', location.lat);
    formData.append('lon', location.lon);
    formData.append('photo', file);

    if (navigator.onLine) {
      try {
        const response = await fetch('http://localhost:8000/api/v1/reports/submit', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        
        if (data.is_spoofed) {
          setStatusMsg("Report flagged for spoofing (Location mismatch).");
        } else {
          setStatusMsg("Report submitted successfully!");
          setDescription('');
          setFile(null);
        }
      } catch (err) {
        setStatusMsg("Failed to submit. Falling back to offline queue.");
        await queueOffline(type, description, location.lat, location.lon, file);
      }
    } else {
      await queueOffline(type, description, location.lat, location.lon, file);
      setStatusMsg("You are offline. Report queued for background sync.");
    }
    
    setIsSubmitting(false);
  };

  const queueOffline = async (t, d, lat, lon, f) => {
    const db = await dbPromise;
    await db.add('reports', {
      type: t,
      description: d,
      lat,
      lon,
      photo: f,
      timestamp: Date.now()
    });
  };

  const syncOffline = async () => {
    if (!navigator.onLine) {
      setStatusMsg("Still offline.");
      return;
    }
    
    const db = await dbPromise;
    const allReports = await db.getAll('reports');
    
    if (allReports.length === 0) {
      setStatusMsg("No offline reports to sync.");
      return;
    }

    setStatusMsg(`Syncing ${allReports.length} reports...`);
    
    for (const rep of allReports) {
      const formData = new FormData();
      formData.append('type', rep.type);
      formData.append('description', rep.description);
      formData.append('lat', rep.lat);
      formData.append('lon', rep.lon);
      formData.append('photo', rep.photo);
      
      try {
        await fetch('http://localhost:8000/api/v1/reports/submit', {
          method: 'POST',
          body: formData
        });
        await db.delete('reports', rep.id);
      } catch (e) {
        console.error("Failed to sync report", rep.id);
      }
    }
    
    setStatusMsg("Offline sync complete!");
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Submit Field Report</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <label>
          Type:
          <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
            <option value="landslide">Landslide / Slip</option>
            <option value="waterlogging">Severe Waterlogging</option>
            <option value="cracks">Road Cracks</option>
          </select>
        </label>

        <label>
          Description:
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>

        <label>
          Photo: (Environment Camera)
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            onChange={handleFileChange} 
            style={{ display: 'block', marginTop: '0.5rem' }}
          />
        </label>

        <div>
          <small>
            Location: {location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : "Fetching..."}
          </small>
        </div>

        <button type="submit" disabled={isSubmitting || !location}>
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </button>
      </form>
      
      {statusMsg && <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#f0f0f0' }}>{statusMsg}</div>}
      
      <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <button onClick={syncOffline}>Sync Offline Queue</button>
      </div>
    </div>
  );
}
