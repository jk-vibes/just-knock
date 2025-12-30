
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { BucketItem, Coordinates } from '../types';
import { calculateDistance } from '../utils/geo';
import { Trophy, Target, MapPin } from 'lucide-react';

interface MapViewProps {
  items: BucketItem[];
  userLocation: Coordinates | null;
  proximityRange: number;
}

export const MapView: React.FC<MapViewProps> = ({ items, userLocation, proximityRange }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [sliderValue, setSliderValue] = useState(0);

  // 1. Calculate Timeline Steps
  const timelineSteps = useMemo(() => {
      const years = new Set<number>();
      items.forEach(i => {
          if (i.completed && i.completedAt) {
              years.add(new Date(i.completedAt).getFullYear());
          }
      });
      // Sort years ascending
      const sortedYears = Array.from(years).sort((a, b) => a - b);
      return ['All', ...sortedYears];
  }, [items]);

  // Ensure slider value doesn't exceed steps if data changes
  useEffect(() => {
      if (sliderValue >= timelineSteps.length) {
          setSliderValue(0);
      }
  }, [timelineSteps.length, sliderValue]);

  const selectedYear = timelineSteps[sliderValue] === 'All' ? null : (timelineSteps[sliderValue] as number);
  const currentLabel = timelineSteps[sliderValue];

  // 2. Filter Items for Map & Stats based on local slider
  const displayItems = useMemo(() => {
      if (selectedYear === null) return items;
      return items.filter(i => {
          // If filtering by year, only show COMPLETED items from that year
          if (!i.completed || !i.completedAt) return false;
          return new Date(i.completedAt).getFullYear() === selectedYear;
      });
  }, [items, selectedYear]);

  // 3. Calculate Stats based on Filtered View
  const stats = useMemo(() => {
    // Current View Stats
    const total = displayItems.length;
    const completedItems = displayItems.filter(i => i.completed);
    const completed = completedItems.length;
    // If a specific year is selected, 'pending' doesn't make much sense in that context usually, 
    // or implies items from that year that aren't done? But items have dates only when completed.
    // So we show 0 pending if specific year is selected, or we could just show total pending in 'All' view.
    const pending = selectedYear === null ? items.filter(i => !i.completed).length : 0; 
    
    // Unique locations in this view
    const locationsCount = new Set(displayItems.map(i => i.locationName).filter(Boolean)).size;

    return { total, completed, pending, locationsCount };
  }, [displayItems, items, selectedYear]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 300);
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.latitude || 20;
      const initialLng = userLocation?.longitude || 0;
      const initialZoom = userLocation ? 12 : 2;

      mapInstanceRef.current = L.map(mapContainerRef.current, {
          zoomControl: false 
      }).setView([initialLat, initialLng], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
      
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Update Markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    
    const userIcon = L.divIcon({
      className: '!bg-transparent border-none',
      html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    if (userLocation) {
        L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 })
         .addTo(map)
         .bindPopup("You are here");
    }

    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.latitude, userLocation.longitude]);

    // Render Markers based on displayItems (Filtered)
    displayItems.forEach(item => {
      if (item.coordinates) {
        const { latitude, longitude } = item.coordinates;
        
        let isNearby = false;
        if (userLocation && !item.completed && selectedYear === null) {
            const dist = calculateDistance(userLocation, item.coordinates);
            if (dist < proximityRange) isNearby = true;
        }

        // Determine Pin Color
        let color = '#3b82f6'; // Standard Blue for Pending
        if (item.completed) {
            color = '#22c55e'; // Green for Completed
        } else if (isNearby) {
            color = '#ef4444'; // Red for Nearby
        }
        
        // Pin SVG
        const pinSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="none" class="w-full h-full filter drop-shadow-sm">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5-2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `;

        let iconHtml;
        if (isNearby) {
            iconHtml = `
              <div class="relative flex items-center justify-center w-full h-full">
                <span class="absolute bottom-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></span>
                <div class="relative z-10 w-full h-full hover:scale-110 transition-transform origin-bottom">${pinSvg}</div>
              </div>
            `;
        } else {
            iconHtml = `<div class="w-full h-full hover:scale-110 transition-transform origin-bottom">${pinSvg}</div>`;
        }

        const icon = L.divIcon({
          className: '!bg-transparent border-none',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24]
        });

        const marker = L.marker([latitude, longitude], { icon }).addTo(map);
        
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
            <a href="${navUrl}" target="_blank" style="display: block; width: 100%; text-align: center; background-color: #3b82f6; color: white; padding: 8px 0; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background-color 0.2s;">
              Navigate to Location
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        bounds.extend([latitude, longitude]);
      }
    });

    if (displayItems.length > 0 || userLocation) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
    map.invalidateSize();

  }, [displayItems, userLocation, proximityRange, selectedYear]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Control Panel - Floating */}
      <div className="absolute top-3 left-3 right-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 z-[500] flex flex-col gap-3">
         
         {/* Compact Slider Row (Top) */}
         {timelineSteps.length > 1 && (
             <div className="relative h-12 w-full flex items-center select-none px-1">
                 {/* Decorative Track */}
                 <div className="absolute left-2 right-2 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600" />
                 
                 {/* The Range Input (Invisible Touch Target) */}
                 <input 
                    type="range" 
                    min="0" 
                    max={timelineSteps.length - 1} 
                    step="1"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                 />

                 {/* The Custom Thumb (Label Embedded) */}
                 <div 
                    className="absolute top-1/2 -translate-y-1/2 h-10 min-w-[70px] px-3 bg-red-600 dark:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xl shadow-red-600/30 z-20 pointer-events-none transition-all duration-150 ease-out transform -translate-x-1/2 border-2 border-white dark:border-gray-800"
                    style={{ 
                        left: `${(sliderValue / (timelineSteps.length - 1)) * 100}%` 
                    }}
                 >
                    {currentLabel}
                 </div>
             </div>
         )}

         {/* Stats Row (Bottom) */}
         <div className="flex justify-between items-center px-2 pt-1 border-t border-gray-100 dark:border-gray-700">
             <div className="flex items-center gap-6">
                 <div className="flex flex-col items-center">
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Done</span>
                     <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100">{stats.completed}</span>
                     </div>
                 </div>
                 <div className="flex flex-col items-center">
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pending</span>
                     <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100">{stats.pending}</span>
                     </div>
                 </div>
             </div>
             
             <div className="flex flex-col items-end">
                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Places</span>
                 <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-sm font-black text-gray-800 dark:text-gray-100">{stats.locationsCount}</span>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
