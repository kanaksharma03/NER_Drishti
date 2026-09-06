import React, { useEffect } from 'react';
import { fetchRiskMap } from '../../services/api';
import { getRiskColor } from '../../design/risk-gradient';

const RiskLayer = ({ map, onZoneSelect, highlightedCellId }) => {
  useEffect(() => {
    if (!map) return;

    let isMounted = true;

    const loadRiskData = async () => {
      const data = await fetchRiskMap();
      if (!isMounted || !data) return;

      if (!map.getSource('risk-grid')) {
        console.log('Adding risk grid source to map:', data);
        map.addSource('risk-grid', {
          type: 'geojson',
          data: data
        });

        console.log('Adding risk layer fill...');
        map.addLayer({
          id: 'risk-layer-fill',
          type: 'fill',
          source: 'risk-grid',
          paint: {
            'fill-color': [
              'case',
              ['>', ['get', 'probability'], 0.75], getRiskColor('Critical'),
              ['>', ['get', 'probability'], 0.50], getRiskColor('High'),
              ['>', ['get', 'probability'], 0.25], getRiskColor('Moderate'),
              getRiskColor('Low')
            ],
            'fill-opacity': 0.6
          }
        });

        console.log('Adding risk layer lines...');
        map.addLayer({
          id: 'risk-layer-line',
          type: 'line',
          source: 'risk-grid',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'cell_id'], highlightedCellId || -1], '#5FA8D3', // --accent-ui
              '#2E383F'
            ],
            'line-width': [
              'case',
              ['==', ['get', 'cell_id'], highlightedCellId || -1], 3,
              2
            ]
          }
        });

        map.on('click', 'risk-layer-fill', (e) => {
          console.log('Clicked risk layer!', e.features);
          if (e.features.length > 0 && onZoneSelect) {
            onZoneSelect(e.features[0].properties);
          }
        });

        map.on('mouseenter', 'risk-layer-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'risk-layer-fill', () => {
          map.getCanvas().style.cursor = '';
        });
        
        console.log('Risk layers added successfully!');
      } else {
        console.log('Updating existing risk grid data');
        map.getSource('risk-grid').setData(data);
      }
    };

    loadRiskData().catch(err => console.error("RiskLayer error:", err));

    return () => {
      isMounted = false;
    };
  }, [map, onZoneSelect]); // intentionally omit highlightedCellId from this initialization effect

  // Separate effect to update highlight dynamically without reloading source
  useEffect(() => {
    if (!map || !map.getLayer('risk-layer-line')) return;
    map.setPaintProperty('risk-layer-line', 'line-color', [
      'case',
      ['==', ['get', 'cell_id'], highlightedCellId || -1], '#5FA8D3',
      '#2E383F'
    ]);
    map.setPaintProperty('risk-layer-line', 'line-width', [
      'case',
      ['==', ['get', 'cell_id'], highlightedCellId || -1], 3,
      2
    ]);
    
    // Also fly to it
    if (highlightedCellId) {
      const src = map.getSource('risk-grid');
      // If we could access the data, we'd fly to its bbox, but for now we just rely on visual highlight
    }
  }, [map, highlightedCellId]);

  return null;
};

export default RiskLayer;
