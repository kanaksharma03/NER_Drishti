import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapLegend from './MapLegend';
import RoadLayer from './RoadLayer';
import RiskLayer from './RiskLayer';

const MapView = ({ onZoneSelect, highlightedCellId }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(92.4);
  const [lat] = useState(27.15);
  const [zoom] = useState(10);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleJson, setStyleJson] = useState(null);

  useEffect(() => {
    // 1. Fetch the raw style JSON
    fetch('https://tiles.openfreemap.org/styles/dark')
      .then(res => res.json())
      .then(json => {
        // 2. Permanently mutate the style to force English/Latin labels
        if (json.layers) {
          json.layers.forEach(layer => {
            if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
              layer.layout['text-field'] = [
                'coalesce',
                ['get', 'name:en'],
                ['get', 'name_en'],
                ['get', 'name:latin'],
                ['get', 'name_latin'],
                ['get', 'name_int'],
                ['get', 'name']
              ];
            }
          });
        }
        setStyleJson(json);
      })
      .catch(err => console.error("Failed to load map style", err));
  }, []);

  useEffect(() => {
    if (!styleJson || map.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleJson, // Pass the pre-mutated JSON object directly
      center: [lng, lat],
      zoom: zoom
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      console.log('MapLibre load event fired!');
      setMapLoaded(true);
    });
    
    // Fallback if load event was missed
    if (map.current.isStyleLoaded()) {
      console.log('Style was already loaded synchronously');
      setMapLoaded(true);
    } else {
      map.current.on('styledata', () => {
        if (map.current.isStyleLoaded() && !mapLoaded) {
          setMapLoaded(true);
        }
      });
    }

  }, [lng, lat, zoom, styleJson, mapLoaded]);

  const handleZoomToCorridor = () => {
    if (map.current) {
      map.current.flyTo({ center: [92.4, 27.15], zoom: 11 });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'var(--bg-base)' }}>
      {/* Search & Controls Overlay */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 1, 
        display: 'flex', 
        gap: '0.5rem',
        backgroundColor: 'var(--bg-surface-raised)',
        padding: '0.5rem',
        borderRadius: '4px',
        border: '1px solid var(--border-hairline)'
      }}>
        <input 
          type="text" 
          placeholder="Search location..." 
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-primary)',
            padding: '0.25rem 0.5rem',
            fontFamily: 'var(--font-body)'
          }}
        />
        <button 
          onClick={handleZoomToCorridor}
          style={{
            background: 'var(--accent-ui)',
            color: '#000',
            border: 'none',
            padding: '0.25rem 0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)'
          }}
        >
          Zoom to NH-13
        </button>
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      {mapLoaded && (
        <>
          <RiskLayer map={map.current} onZoneSelect={onZoneSelect} highlightedCellId={highlightedCellId} />
          <RoadLayer map={map.current} />
        </>
      )}
      <MapLegend />
    </div>
  );
};

export default MapView;
