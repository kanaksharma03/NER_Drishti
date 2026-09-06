import React, { useEffect } from 'react';
import { fetchRoads } from '../../services/api';

const RoadLayer = ({ map }) => {
  useEffect(() => {
    if (!map) return;

    let isMounted = true;

    const loadRoads = async () => {
      const data = await fetchRoads();
      if (!isMounted) return;

      // Add source if it doesn't exist
      if (!map.getSource('roads')) {
        map.addSource('roads', {
          type: 'geojson',
          data: data
        });

        // Add line layer for the road
        map.addLayer({
          id: 'road-layer',
          type: 'line',
          source: 'roads',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#8FA0A8', // Fixed: MapLibre doesn't support var()
            'line-width': 4
          }
        });
      } else {
        // Update data if source already exists
        map.getSource('roads').setData(data);
      }
    };

    loadRoads();

    return () => {
      isMounted = false;
      // Cleanup layer on unmount if needed, though often kept if map persists
      if (map.getLayer('road-layer')) map.removeLayer('road-layer');
      if (map.getSource('roads')) map.removeSource('roads');
    };
  }, [map]);

  return null; // This component doesn't render DOM elements, only map layers
};

export default RoadLayer;
