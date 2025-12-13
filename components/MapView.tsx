import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { BucketItem, Coordinates } from '../types';

interface MapViewProps {
  items: BucketItem[];
  userLocation: Coordinates | null;
}

export const MapView: React.FC<MapViewProps> = ({ items, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Handle resize/orientation changes to ensure map renders correctly
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Slight delay to allow layout to settle
    const timer = setTimeout(handleResize, 300);

    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not already initialized
    if (!mapInstanceRef.current) {
      // Default to a world view or user location if available
      const initialLat = userLocation?.latitude || 20;
      const initialLng = userLocation?.longitude || 0;
      const initialZoom = userLocation ? 12 : 2;

      mapInstanceRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Red Icon (Incomplete)
    const redIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Green Icon (Completed)
    const greenIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    // User Location Icon (Blue Dot)
    const userIcon = L.divIcon({
      className: 'user-div-icon',
      html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Add User Location Marker
    if (userLocation) {
        L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 })
         .addTo(map)
         .bindPopup("You are here");
    }

    // Add Bucket Item Markers
    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.latitude, userLocation.longitude]);

    items.forEach(item => {
      if (item.coordinates) {
        const { latitude, longitude } = item.coordinates;
        // Choose icon based on completion status
        const icon = item.completed ? greenIcon : redIcon;
        const marker = L.marker([latitude, longitude], { icon }).addTo(map);
        
        // Navigation URL
        const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

        const popupContent = `
          <div style="font-family: 'Inter', sans-serif; min-width: 220px; padding: 4px;">
            <h3 style="font-weight: 700; margin: 0 0 4px 0; color: #1f2937; font-size: 14px; line-height: 1.2;">${item.title}</h3>
            <p style="font-size: 11px; color: #9ca3af; margin: 0 0 8px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.025em;">
              ${item.locationName || 'Location'}
              ${item.completed ? '<span style="color: #22c55e; margin-left: 6px;">● Completed</span>' : ''}
            </p>
            <p style="font-size: 12px; color: #4b5563; margin: 0 0 12px 0; line-height: 1.4;">
              ${item.description}
            </p>
            <a href="${navUrl}" target="_blank" style="display: block; width: 100%; text-align: center; background-color: #ef4444; color: white; padding: 8px 0; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background-color 0.2s;">
              Navigate to Location
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        bounds.extend([latitude, longitude]);
      }
    });

    // Fit bounds if there are markers
    if (items.length > 0 || userLocation) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    // Invalidate size immediately to ensure correct rendering on load
    map.invalidateSize();

  }, [items, userLocation]);

  return (
    <div className="h-[calc(100vh-180px)] min-h-[350px] w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};