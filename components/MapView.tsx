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

    // YTD Logic (Only for All Time view)
    const currentYear = new Date().getFullYear();
    const completedYTD = selectedYear === null ? items.filter(i => {
        if (!i.completed || !i.completedAt) return false;
        return new Date(i.completedAt).getFullYear() === currentYear;
    }).length : 0;
    
    // Nearest (Only for All Time view, and valid pending items)
    let nearest = null;
    if (selectedYear === null && userLocation) {
        let minDist = Infinity;
        items.filter(i => !i.completed).forEach(item => { // Look at ALL pending items for nearest
            if (item.coordinates) {
                const d = calculateDistance(userLocation, item.coordinates);
                if (d < minDist) {
                    minDist = d;
                    nearest = { title: item.title, distance: d };
                }
            }
        });
    }

    return { total, completed, completedYTD, pending, nearest, locationsCount };
  }, [displayItems, items, userLocation, selectedYear]);

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
      
      L.control.zoom({ position: 'topright' }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Update Markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    
    const userIcon = L.divIcon({
      className: 'user-div-icon',
      html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
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

        const color = item.completed ? '#22c55e' : '#ef4444';
        const baseStyle = `background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);`;
        
        let iconHtml;
        if (isNearby) {
            iconHtml = `
              <div class="relative flex items-center justify-center w-full h-full">
                <span class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
                <div style="${baseStyle} position: relative; z-index: 10;"></div>
              </div>
            `;
        } else {
            iconHtml = `<div style="${baseStyle}"></div>`;
        }

        const icon = L.divIcon({
          className: 'custom-div-icon bg-transparent border-none',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
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
            <a href="${navUrl}" target="_blank" style="display: block; width: 100%; text-align: center; background-color: #ef4444; color: white; padding: 8px 0; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background-color 0.2s;">
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
      
      {/* Stats Overlay - Compacted */}
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-[500] landscape:hidden animate-in slide-in-from-bottom-2 fade-in">
         <div className="flex items-center justify-between gap-2">
             
             {/* Dynamic Stats Cards */}
             {selectedYear !== null ? (
                // --- TIME TRAVEL MODE ---
                <>
                    {/* Year Indicator */}
                    <div className="flex flex-col items-center flex-1 p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                        <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 mb-0.5">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Year</span>
                        </div>
                        <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 leading-none">{selectedYear}</span>
                    </div>

                    {/* Count in that year */}
                    <div className="flex flex-col items-center flex-1 p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-0.5">
                            <Trophy className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Done</span>
                        </div>
                        <span className="text-lg font-black text-green-700 dark:text-green-300 leading-none">{stats.completed}</span>
                    </div>

                    {/* Locations Count */}
                    <div className="flex flex-col items-center flex-1 p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/30">
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 mb-0.5">
                            <MapPin className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Places</span>
                        </div>
                        <span className="text-lg font-black text-orange-700 dark:text-orange-300 leading-none">{stats.locationsCount}</span>
                    </div>
                </>
             ) : (
                // --- ALL TIME MODE ---
                <>
                    <div className="flex flex-col items-center flex-1 p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-0.5">
                            <Trophy className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Done</span>
                        </div>
                        <span className="text-lg font-black text-green-700 dark:text-green-300 leading-none">{stats.completed}</span>
                        {stats.completedYTD > 0 && (
                            <span className="text-[8px] font-semibold text-green-600/80 dark:text-green-400/80 mt-0.5 leading-none">
                                {stats.completedYTD} this year
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col items-center flex-1 p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-0.5">
                            <Target className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">To Go</span>
                        </div>
                        <span className="text-lg font-black text-red-700 dark:text-red-300 leading-none">{stats.pending}</span>
                    </div>

                    {stats.nearest ? (
                        <div className="flex flex-col items-center flex-[1.5] p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 overflow-hidden">
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-0.5">
                                <Navigation className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Nearest</span>
                            </div>
                            <div className="flex flex-col items-center w-full">
                                <span className="text-base font-black text-blue-700 dark:text-blue-300 leading-none">
                                    {formatDistance(stats.nearest.distance)}
                                </span>
                                <span className="text-[8px] text-blue-500/80 truncate w-full text-center mt-0.5 font-medium">
                                    {stats.nearest.title}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center flex-[1.5] p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-600 overflow-hidden">
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mb-0.5">
                                <MapIcon className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Total</span>
                            </div>
                            <span className="text-lg font-black text-gray-600 dark:text-gray-300 leading-none">{stats.total}</span>
                        </div>
                    )}
                </>
             )}
         </div>

         {/* Timeline Slider Control */}
         {timelineSteps.length > 1 && (
             <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                 <div className="flex items-center justify-between gap-1.5 mb-1 px-1">
                    <div className="flex items-center gap-1 opacity-60">
                        <History className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timeline</span>
                    </div>
                    {selectedYear && (
                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-full animate-in fade-in">
                            {selectedYear}
                        </span>
                    )}
                 </div>
                 
                 <div className="relative px-1 pb-0.5">
                     {/* Ticks Visual */}
                     <div className="absolute top-1 left-2 right-2 flex justify-between pointer-events-none">
                         {timelineSteps.map((step, idx) => (
                             <div key={idx} className={`w-0.5 h-1.5 rounded-full transition-colors ${idx === sliderValue ? 'bg-indigo-500 h-2' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                         ))}
                     </div>
                     
                     <input 
                        type="range" 
                        min="0" 
                        max={timelineSteps.length - 1} 
                        step="1"
                        value={sliderValue}
                        onChange={(e) => setSliderValue(parseInt(e.target.value))}
                        className="w-full h-4 bg-transparent appearance-none cursor-pointer z-10 relative [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-gray-200 [&::-webkit-slider-runnable-track]:dark:bg-gray-700 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                     />
                     
                     <div className="flex justify-between mt-0.5 text-[8px] font-semibold text-gray-400 dark:text-gray-500 px-1">
                         <span>All Time</span>
                         <span>{timelineSteps[timelineSteps.length - 1]}</span>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};