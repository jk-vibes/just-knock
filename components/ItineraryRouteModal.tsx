
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { ArrowLeft, MapPin, Route, Navigation, Plus, Trash2, Save, Map as MapIcon, List as ListIcon, Sparkles, Loader2, Clock, Footprints, CheckCircle2, RefreshCw, Star, Info, X, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { BucketItem, Coordinates, ItineraryItem } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { getPlaceDetails, generateItineraryForLocation } from '../services/geminiService';

interface TripPlannerProps {
  item: BucketItem | null;
  onClose: () => void;
  onUpdateItem: (updatedItem: BucketItem) => void;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({ item, onClose, onUpdateItem }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Local state for editing itinerary within the planner
  const [currentItinerary, setCurrentItinerary] = useState<ItineraryItem[]>([]);
  const [newPlaceInput, setNewPlaceInput] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list'); // For mobile view toggling
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedStop, setSelectedStop] = useState<ItineraryItem | null>(null);

  // Initialize state when item opens
  useEffect(() => {
      if (item && item.itinerary) {
          setCurrentItinerary([...item.itinerary]);
      } else {
          setCurrentItinerary([]);
      }
      setNewPlaceInput('');
      setIsSaved(false);
      setSelectedStop(null);
  }, [item]);

  // Helper: Deterministic pseudo-random offset for items without coordinates
  const getPseudoCoordinates = (center: Coordinates, seed: string, index: number): Coordinates => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const offsetScale = 0.02; // Roughly 2km spread
    const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
    const dist = ((Math.abs(hash) % 100) / 100) * offsetScale + 0.005;
    
    return {
        latitude: center.latitude + Math.cos(angle + index) * dist,
        longitude: center.longitude + Math.sin(angle + index) * dist
    };
  };

  // Add a new place with Magic Fill (AI Coordinates)
  const handleAddPlace = async () => {
      if (!newPlaceInput.trim()) return;
      setIsAddingPlace(true);

      let newPlace: ItineraryItem;

      // Try AI first
      const aiPlace = await getPlaceDetails(newPlaceInput, item?.locationName);
      
      if (aiPlace) {
          newPlace = aiPlace;
      } else {
          // Fallback if AI fails or no coords found
          newPlace = {
              name: newPlaceInput.trim(),
              completed: false,
              // No coords initially
          };
      }

      const updated = [...currentItinerary, newPlace];
      setCurrentItinerary(updated);
      setNewPlaceInput('');
      setIsAddingPlace(false);
      setIsSaved(false); // Reset save state on modification
      
      // Auto-save changes to parent immediately
      if (item) {
          onUpdateItem({ ...item, itinerary: updated });
      }
  };

  const handleRegenerate = async () => {
      if (!item?.locationName) {
          alert("This item doesn't have a specific location name to generate an itinerary for.");
          return;
      }
      if (currentItinerary.length > 0 && !window.confirm("This will replace your current itinerary list. Continue?")) {
          return;
      }
      
      setIsRegenerating(true);
      const newItems = await generateItineraryForLocation(item.locationName);
      setIsRegenerating(false);
      
      if (newItems.length > 0) {
          setCurrentItinerary(newItems);
          setIsSaved(false);
          onUpdateItem({ ...item, itinerary: newItems });
      } else {
          alert("Could not generate an itinerary for this location. Try adding stops manually.");
      }
  };

  const handleRemovePlace = (index: number) => {
      const updated = [...currentItinerary];
      updated.splice(index, 1);
      setCurrentItinerary(updated);
      setIsSaved(false);
      if (item) {
          onUpdateItem({ ...item, itinerary: updated });
      }
  };

  // Optimize Route using Greedy Nearest Neighbor
  const optimizedRoute = useMemo(() => {
    if (!item || !item.coordinates) return [];
    if (currentItinerary.length === 0) return [];

    // Prepare points
    const points = currentItinerary.map((it, idx) => ({
        ...it,
        originalIndex: idx,
        coords: it.coordinates || getPseudoCoordinates(item.coordinates!, it.name, idx)
    }));

    const route: (typeof points & { distanceFromStart: number })[] = [];
    const unvisited = new Set<number>(points.map((_, i) => i));
    
    let currentCoords = item.coordinates!;

    while (unvisited.size > 0) {
        let nearestIdx = -1;
        let minDist = Infinity;

        unvisited.forEach((idx) => {
            const dist = calculateDistance(currentCoords, points[idx].coords);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = idx;
            }
        });

        if (nearestIdx !== -1) {
            unvisited.delete(nearestIdx);
            
            // Calculate distance from START (Main Location)
            const distanceFromStart = calculateDistance(item.coordinates!, points[nearestIdx].coords);
            
            route.push({
                ...points[nearestIdx],
                distanceFromStart: distanceFromStart // Store for display
            });
            currentCoords = points[nearestIdx].coords;
        } else {
            break; 
        }
    }

    return route;
  }, [item, currentItinerary]);

  const handleSaveRoute = () => {
      if (!item) return;
      
      // Reorder itinerary based on optimized route
      const newItineraryOrder: ItineraryItem[] = optimizedRoute.map(stop => ({
          name: stop.name,
          description: stop.description,
          completed: stop.completed,
          completedAt: stop.completedAt,
          coordinates: stop.coordinates,
          isImportant: stop.isImportant,
          images: stop.images
      }));

      onUpdateItem({ ...item, itinerary: newItineraryOrder });
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
  };

  // Calculate Route Statistics (Total Distance & Time)
  const routeStats = useMemo(() => {
    if (!item?.coordinates || optimizedRoute.length === 0) return { totalDistance: 0, totalTime: 0 };

    let totalDist = 0;
    let currentPos = item.coordinates;

    optimizedRoute.forEach(stop => {
        if (stop.coords) {
            totalDist += calculateDistance(currentPos, stop.coords);
            currentPos = stop.coords;
        }
    });

    const averageSpeedMetersPerMin = 500; 
    const estimatedMinutes = Math.round(totalDist / averageSpeedMetersPerMin);

    return { totalDistance: totalDist, totalTime: estimatedMinutes };
  }, [item, optimizedRoute]);

  const formatTime = (minutes: number) => {
      if (minutes < 1) return '< 1 min';
      if (minutes < 60) return `${minutes} min`;
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs} hr ${mins > 0 ? `${mins} min` : ''}`;
  };

  // Leaflet Map Effect
  useEffect(() => {
    if (!mapContainerRef.current || !item?.coordinates) return;

    if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
            zoomControl: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstanceRef.current);
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    
    // Clean up
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) map.removeLayer(layer);
    });

    const bounds = L.latLngBounds([]);

    // 1. Add Main Location Marker (Start)
    const mainIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    L.marker([item.coordinates.latitude, item.coordinates.longitude], { icon: mainIcon })
     .addTo(map)
     .bindPopup(`<b style="font-family: sans-serif;">Start: ${item.locationName}</b>`);
    
    bounds.extend([item.coordinates.latitude, item.coordinates.longitude]);

    // 2. Add Route Markers & Line
    const latLngs: L.LatLngExpression[] = [
        [item.coordinates.latitude, item.coordinates.longitude]
    ];

    optimizedRoute.forEach((stop, idx) => {
        const { latitude, longitude } = stop.coords;
        latLngs.push([latitude, longitude]);
        bounds.extend([latitude, longitude]);

        // Numbered Icon
        const numIcon = L.divIcon({
            className: 'bg-transparent',
            html: `
                <div style="
                    background-color: ${stop.completed ? '#22c55e' : '#3b82f6'}; 
                    color: white; 
                    width: 28px; 
                    height: 28px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: bold; 
                    font-size: 14px; 
                    border: 2px solid white; 
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    font-family: sans-serif;
                ">
                    ${stop.isImportant ? '<span style="color: #fbbf24; font-size: 10px; position: absolute; top: -8px;">★</span>' : ''}
                    ${idx + 1}
                </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16]
        });

        const marker = L.marker([latitude, longitude], { icon: numIcon })
         .addTo(map);

        // Bind Click event to select stop instead of just popup
        marker.on('click', () => {
             setSelectedStop(stop);
        });

        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'Inter, sans-serif';
        popupContent.style.padding = '4px';
        popupContent.innerHTML = `
            <div style="font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 2px;">
                Stop ${idx + 1} ${stop.isImportant ? '<span style="color: #fbbf24; margin-left:4px;">★ Must See</span>' : ''}
            </div>
            <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${stop.name}</h3>
            ${!stop.coordinates ? '<p style="margin:2px 0 0; font-size:9px; color:#ef4444;">*Approximate location</p>' : ''}
            <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280;">Distance from start: ${formatDistance(stop.distanceFromStart)}</p>
            <button id="view-details-btn-${idx}" style="margin-top: 8px; font-size: 11px; color: #2563eb; background: none; border: none; cursor: pointer; text-decoration: underline;">View Details</button>
        `;
        
        // Leaflet handles HTML strings better than raw DOM for bindPopup usually, but we need event listener.
        // We can cheat by using a string and global event or simple marker click (handled above)
        
        marker.bindPopup(popupContent);
        
    });

    // Draw Polyline
    L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 10',
        lineCap: 'round'
    }).addTo(map);

    // Fit Bounds
    map.fitBounds(bounds, { padding: [50, 50] });
    
    setTimeout(() => map.invalidateSize(), 300);

  }, [item, optimizedRoute, activeTab]);

  if (!item) return null;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 relative">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-20 shrink-0">
            <div className="flex items-center gap-3">
                <button 
                    onClick={onClose}
                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                        <Route className="w-5 h-5 text-blue-500" />
                        Trip Planner
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {item.locationName}
                    </p>
                </div>
            </div>

            {/* View Switcher Icons (Mobile Only) */}
            <div className="flex md:hidden bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`p-2 rounded-md transition-colors ${activeTab === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
                    title="List View"
                >
                    <ListIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setActiveTab('map')}
                    className={`p-2 rounded-md transition-colors ${activeTab === 'map' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
                    title="Map View"
                >
                    <MapIcon className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Content Body - Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Sidebar / List View (Controls) */}
            <div className={`w-full md:w-1/3 bg-gray-50 dark:bg-gray-800/50 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full absolute md:relative z-10 transition-transform duration-300 ${activeTab === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                
                {/* Add Place Input */}
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-yellow-500" />
                            Magic Add Stop
                        </label>
                        <button 
                            onClick={handleRegenerate} 
                            disabled={isRegenerating || isAddingPlace}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                            title="Generate AI Itinerary"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newPlaceInput}
                            onChange={(e) => setNewPlaceInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPlace()}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Place name (e.g. 'Eiffel Tower')..."
                            disabled={isAddingPlace}
                        />
                        <button 
                            onClick={handleAddPlace}
                            disabled={!newPlaceInput.trim() || isAddingPlace}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isAddingPlace ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Sortable List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                    {currentItinerary.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center p-4">
                            {isRegenerating ? (
                                <>
                                    <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-500" />
                                    <p className="text-sm">Dreaming up a route...</p>
                                </>
                            ) : (
                                <>
                                    <MapPin className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-sm">No places added yet.</p>
                                    <button 
                                        onClick={handleRegenerate}
                                        className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <Sparkles className="w-3 h-3" /> Auto-Suggest Itinerary
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        optimizedRoute.map((stop, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedStop(stop)}
                                className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-xl shadow-sm group transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${stop.isImportant ? 'border-yellow-200 dark:border-yellow-900/30 ring-1 ring-yellow-100 dark:ring-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${stop.isImportant ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{stop.name}</h4>
                                        {stop.isImportant && (
                                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" title="Must Visit" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md">
                                            {formatDistance(stop.distanceFromStart)} from start
                                        </span>
                                        {!stop.coordinates && (
                                            <span className="text-[9px] text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 rounded">Approx Loc</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {stop.images && stop.images.length > 0 && (
                                        <ImageIcon className="w-3 h-3 text-purple-400 mr-1" />
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRemovePlace(stop.originalIndex); }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Info & Stats */}
                <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                    <div className="flex justify-around items-center text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center">
                            <Footprints className="w-4 h-4 mb-1 text-blue-500" />
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{formatDistance(routeStats.totalDistance)}</span>
                            <span className="text-[9px] uppercase tracking-wider">Total Dist.</span>
                        </div>
                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex flex-col items-center">
                            <Clock className="w-4 h-4 mb-1 text-orange-500" />
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{formatTime(routeStats.totalTime)}</span>
                            <span className="text-[9px] uppercase tracking-wider">Est. Time</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveRoute}
                        disabled={isSaved || currentItinerary.length === 0}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            isSaved 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90'
                        } ${currentItinerary.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSaved ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Route Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Optimized Route
                            </>
                        )}
                    </button>

                    <div className="text-center">
                        <p className="text-[9px] text-gray-400">Route optimized by shortest distance.</p>
                    </div>
                </div>
            </div>

            {/* Map View */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 h-full relative w-full md:w-2/3">
                <div ref={mapContainerRef} className="w-full h-full z-0" />
            </div>

            {/* STOP DETAILS MODAL */}
            {selectedStop && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80%]">
                        {/* Image Header */}
                        <div className="relative h-48 bg-gray-200 dark:bg-gray-700 shrink-0">
                            {selectedStop.images && selectedStop.images.length > 0 ? (
                                <img 
                                    src={selectedStop.images[0]} 
                                    alt={selectedStop.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                    <MapPin className="w-12 h-12 mb-2 opacity-20" />
                                    <span className="text-xs">No image available</span>
                                    {/* Try to fallback to AI generated URL on fly if missing but name exists */}
                                    <img 
                                        src={`https://image.pollinations.ai/prompt/${encodeURIComponent(selectedStop.name)}?width=600&height=400&nologo=true`}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500"
                                        onLoad={(e) => (e.target as HTMLImageElement).classList.remove('opacity-0')}
                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                    />
                                </div>
                            )}
                            <button 
                                onClick={() => setSelectedStop(null)}
                                className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {selectedStop.isImportant && (
                                <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current" /> Must See
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                                {selectedStop.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                {selectedStop.description || "No description available."}
                            </p>

                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedStop.name + ' ' + (item?.locationName || ''))}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                                <Navigation className="w-4 h-4" />
                                Navigate Here
                            </a>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
