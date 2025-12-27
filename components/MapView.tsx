
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { BucketItem, Coordinates } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { Trophy, Target, Navigation, Map as MapIcon, Calendar, History, MapPin } from 'lucide-react';

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

  // 2. Filter Items for Map & Stats
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
    const pending = selectedYear === null ? total - completed : 0; // No pending in history view
    
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
        
        // Pin SVG (Smaller, cleaner, no thick white stroke)
        const pinSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="none" class="w-full h-full filter drop-shadow-sm">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `;

        let iconHtml;
        if (isNearby) {
            // Pulse effect for nearby (Red)
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
          className: '!bg-transparent border-none', // Override default leaflet white square
          html: iconHtml,
          iconSize: [24, 24], // Smaller size
          iconAnchor: [12, 24], // Center bottom
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
    <div className="h-[calc(100vh-180px)] min-h-[350px] w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Control Panel - Moved to Top with Compact Design */}
      <div className="absolute top-2 left-2 right-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-[500] animate-in slide-in-from-top-2 fade-in">
         
         {/* Top Row: Year and Stats */}
         <div className="flex justify-between items-center mb-4">
             {/* Year Badge */}
             <div className="flex items-center gap-2">
                 <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-800/30">
                     {selectedYear || 'All Time'}
                 </span>
             </div>

             {/* Small Stats */}
             <div className="flex gap-4">
                 <div className="flex flex-col items-end">
                     <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100">{stats.completed}</span>
                     </div>
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Done</span>
                 </div>
                 
                 <div className="flex flex-col items-end">
                     <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100">{stats.pending}</span>
                     </div>
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pending</span>
                 </div>

                 <div className="flex flex-col items-end">
                     <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100">{stats.locationsCount}</span>
                     </div>
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Places</span>
                 </div>
             </div>
         </div>

         {/* Timeline Slider with Year Labels */}
         {timelineSteps.length > 0 && (
             <div className="relative pt-2 pb-5 px-1">
                 {/* The Slider */}
                 <input 
                    type="range" 
                    min="0" 
                    max={timelineSteps.length - 1} 
                    step="1"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 relative z-20 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                 />

                 {/* Year Labels / Ticks */}
                 <div className="absolute left-0 right-0 top-4 flex justify-between px-0.5 pointer-events-none z-10">
                     {timelineSteps.map((step, idx) => (
                         <div key={idx} className="flex flex-col items-center justify-center w-8">
                             {/* Small Tick */}
                             <div className={`w-0.5 h-1.5 mb-1 transition-colors ${idx === sliderValue ? 'bg-indigo-500 h-2' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                             {/* Label */}
                             <span className={`text-[9px] font-medium transition-colors whitespace-nowrap ${idx === sliderValue ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-110' : 'text-gray-400 dark:text-gray-500'}`}>
                                 {step === 'All' ? 'All' : step}
                             </span>
                         </div>
                     ))}
                 </div>
                 
                 {/* Visual Track Dots (Decorative) */}
                 <div className="absolute left-0 right-0 top-2.5 flex justify-between px-0.5 pointer-events-none z-10">
                      {timelineSteps.map((_, idx) => (
                          <div key={idx} className="flex justify-center w-8">
                            <div className={`w-1 h-1 rounded-full ${idx === sliderValue ? 'bg-transparent' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                          </div>
                      ))}
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
