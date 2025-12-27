
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { ArrowLeft, MapPin, Route, Navigation, Plus, Trash2, Save, Map as MapIcon, List as ListIcon, Sparkles, Loader2, Clock, Footprints, CheckCircle2, RefreshCw, Star, Info, X, ExternalLink, Image as ImageIcon, Car, Flag, Zap } from 'lucide-react';
import { BucketItem, Coordinates, ItineraryItem, RoadTripDetails } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { getPlaceDetails, generateItineraryForLocation, generateRoadTripStops, reverseGeocode, optimizeRouteOrder } from '../services/geminiService';

interface TripPlannerProps {
  item: BucketItem | null;
  onClose: () => void;
  onUpdateItem: (updatedItem: BucketItem) => void;
  userLocation?: Coordinates | null;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({ item, onClose, onUpdateItem, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Tab State: 'destination' (City Itinerary) vs 'roadtrip' (Road Trip Stops)
  const [plannerMode, setPlannerMode] = useState<'destination' | 'roadtrip'>('destination');

  // Local state for editing itinerary within the planner
  const [currentItinerary, setCurrentItinerary] = useState<ItineraryItem[]>([]);
  const [newPlaceInput, setNewPlaceInput] = useState('');
  
  // Road Trip State
  const [roadTripStops, setRoadTripStops] = useState<ItineraryItem[]>([]);
  const [startLocationName, setStartLocationName] = useState<string>('');
  const [startCoordinates, setStartCoordinates] = useState<Coordinates | undefined>(undefined);
  const [isSettingStart, setIsSettingStart] = useState(false);

  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list'); // For mobile view toggling
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedStop, setSelectedStop] = useState<ItineraryItem | null>(null);

  // Initialize state when item opens
  useEffect(() => {
      if (item) {
          if (item.itinerary) {
              setCurrentItinerary([...item.itinerary]);
          } else {
              setCurrentItinerary([]);
          }

          // Initialize Road Trip Data
          if (item.roadTrip) {
              setRoadTripStops([...item.roadTrip.stops]);
              setStartLocationName(item.roadTrip.startLocation || '');
              setStartCoordinates(item.roadTrip.startCoordinates);
          } else {
              setRoadTripStops([]);
              // Default to user location if available
              if (userLocation) {
                  setStartCoordinates(userLocation);
                  setStartLocationName("Resolving location...");
                  // Try to reverse geocode the user location to get a city name for the trip planner
                  reverseGeocode(userLocation.latitude, userLocation.longitude).then(name => {
                      setStartLocationName(name);
                  });
              } else {
                  setStartLocationName("");
                  setStartCoordinates(undefined);
              }
          }
      }
      setNewPlaceInput('');
      setIsSaved(false);
      setSelectedStop(null);
  }, [item?.id]); // Only re-run if item ID changes, not when item content updates to avoid loops

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

  // Add a new place (either to Destination Itinerary or Road Trip Stops)
  const handleAddPlace = async () => {
      if (!newPlaceInput.trim()) return;
      setIsAddingPlace(true);

      let contextLoc = item?.locationName;
      
      // If adding to road trip, context is less specific, but we can try to use start location if known
      if (plannerMode === 'roadtrip' && startLocationName) {
          contextLoc = undefined; // Let Gemini search globally or imply route
      }

      // Try AI first
      const aiPlace = await getPlaceDetails(newPlaceInput, contextLoc);
      
      let newPlace: ItineraryItem;
      if (aiPlace) {
          newPlace = aiPlace;
      } else {
          newPlace = {
              name: newPlaceInput.trim(),
              completed: false,
          };
      }

      if (plannerMode === 'destination') {
          const updated = [...currentItinerary, newPlace];
          setCurrentItinerary(updated);
          if (item) onUpdateItem({ ...item, itinerary: updated });
      } else {
          // Road Trip Mode
          const updatedStops = [...roadTripStops, newPlace];
          setRoadTripStops(updatedStops);
          if (item) updateRoadTripData(startLocationName, startCoordinates, updatedStops);
      }

      setNewPlaceInput('');
      setIsAddingPlace(false);
      setIsSaved(false); 
  };

  const handleSetStartLocation = async () => {
      if (!startLocationName.trim()) return;
      setIsSettingStart(true);
      const details = await getPlaceDetails(startLocationName);
      if (details && details.coordinates) {
          setStartCoordinates(details.coordinates);
          setStartLocationName(details.name); // Normalize name
          if (item) updateRoadTripData(details.name, details.coordinates, roadTripStops);
      } else {
          alert("Could not find coordinates for this starting location.");
      }
      setIsSettingStart(false);
  };

  const updateRoadTripData = (startName: string, startCoords: Coordinates | undefined, stops: ItineraryItem[]) => {
      if (!item) return;
      const newRoadTrip: RoadTripDetails = {
          startLocation: startName,
          startCoordinates: startCoords,
          stops: stops
      };
      onUpdateItem({ ...item, roadTrip: newRoadTrip });
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

  const handleSuggestRoadTrip = async () => {
      if (!startLocationName || !item?.locationName) {
          alert("Please ensure both a Starting Point and a Destination are set.");
          return;
      }
      if (roadTripStops.length > 0 && !window.confirm("This will replace your current road trip stops. Continue?")) {
          return;
      }

      setIsRegenerating(true);
      const stops = await generateRoadTripStops(startLocationName, item.locationName);
      setIsRegenerating(false);

      if (stops.length > 0) {
          setRoadTripStops(stops);
          updateRoadTripData(startLocationName, startCoordinates, stops);
      } else {
          alert("Could not suggest stops for this route.");
      }
  };

  const handleOptimizeRoute = async () => {
      if (plannerMode !== 'destination' || currentItinerary.length < 2) return;
      if (!item?.locationName) return;

      setIsRegenerating(true);
      const names = currentItinerary.map(i => i.name);
      const orderedNames = await optimizeRouteOrder(item.locationName, names);
      
      // Reconstruct itinerary based on new order
      const newItinerary: ItineraryItem[] = [];
      const itemMap = new Map<string, ItineraryItem>(currentItinerary.map(i => [i.name, i]));
      
      orderedNames.forEach(name => {
          const original = itemMap.get(name);
          if (original) newItinerary.push(original);
      });
      
      // Add any missing ones (fallback)
      currentItinerary.forEach(i => {
          if (!newItinerary.includes(i)) newItinerary.push(i);
      });

      setCurrentItinerary(newItinerary);
      setIsRegenerating(false);
      setIsSaved(false);
      if (item) onUpdateItem({ ...item, itinerary: newItinerary });
  };

  const handleRemovePlace = (index: number) => {
      if (plannerMode === 'destination') {
          const updated = [...currentItinerary];
          updated.splice(index, 1);
          setCurrentItinerary(updated);
          if (item) onUpdateItem({ ...item, itinerary: updated });
      } else {
          const updated = [...roadTripStops];
          updated.splice(index, 1);
          setRoadTripStops(updated);
          if (item) updateRoadTripData(startLocationName, startCoordinates, updated);
      }
      setIsSaved(false);
  };

  // Route with Details (Coordinates + Distance calculation respecting CURRENT order)
  const routeWithDetails = useMemo(() => {
    if (!item || !item.coordinates || plannerMode !== 'destination') return [];
    
    // We strictly follow currentItinerary order now
    const points = currentItinerary.map((it, idx) => ({
        ...it,
        originalIndex: idx,
        coords: it.coordinates || getPseudoCoordinates(item.coordinates!, it.name, idx),
        distanceFromStart: 0 // Will calculate below
    }));

    // Calculate cumulative distances
    let currentCoords = item.coordinates;
    const finalRoute = points.map(point => {
        const dist = calculateDistance(currentCoords, point.coords);
        currentCoords = point.coords;
        return { ...point, distanceFromStart: dist };
    });

    return finalRoute;
  }, [item, currentItinerary, plannerMode]);

  // Route for Road Trip Mode (Linear: Start -> Stops -> End)
  const roadTripRoute = useMemo(() => {
      if (plannerMode !== 'roadtrip' || !item?.coordinates) return [];
      
      const stopsWithCoords = roadTripStops.map((stop, idx) => ({
          ...stop,
          originalIndex: idx,
          coords: stop.coordinates 
            // Fallback: If no coords, place them on line between start and end? 
            // Or just give them pseudo coords near destination for now.
            || (item.coordinates ? getPseudoCoordinates(item.coordinates, stop.name, idx) : undefined)
      }));

      return stopsWithCoords;

  }, [roadTripStops, item, plannerMode, startCoordinates]);

  const handleSaveRoute = () => {
      if (!item) return;
      if (plannerMode === 'destination') {
        // Save the current order (which might be AI optimized)
        const newItineraryOrder: ItineraryItem[] = currentItinerary.map(stop => ({
            name: stop.name,
            description: stop.description,
            completed: stop.completed,
            coordinates: stop.coordinates,
            isImportant: stop.isImportant,
            images: stop.images
        }));
        onUpdateItem({ ...item, itinerary: newItineraryOrder });
      } else {
         updateRoadTripData(startLocationName, startCoordinates, roadTripStops);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
  };

  const handleStartNavigation = () => {
    if (!item?.coordinates) return;

    let origin = '';
    let destination = '';
    let waypoints = '';

    if (plannerMode === 'destination') {
        // Origin: Current User Location (if available) or let Google decide
        if (userLocation) {
            origin = `${userLocation.latitude},${userLocation.longitude}`;
        }
        
        // Destination: The item location
        destination = `${item.coordinates.latitude},${item.coordinates.longitude}`;
        
        // Waypoints: All stops in the itinerary (Up to 9 for URL limit safety)
        waypoints = routeWithDetails
            .filter(stop => stop.coords)
            .map(stop => `${stop.coords!.latitude},${stop.coords!.longitude}`)
            .slice(0, 9)
            .join('|');

    } else {
        // Road Trip
        // Origin: Explicit Start Point or User Location
        if (startCoordinates) {
            origin = `${startCoordinates.latitude},${startCoordinates.longitude}`;
        } else if (userLocation) {
            origin = `${userLocation.latitude},${userLocation.longitude}`;
        }

        // Destination: The item location
        destination = `${item.coordinates.latitude},${item.coordinates.longitude}`;
        
        // Waypoints: The stops
        waypoints = roadTripRoute
            .filter(stop => stop.coords)
            .map(stop => `${stop.coords!.latitude},${stop.coords!.longitude}`)
            .slice(0, 9)
            .join('|');
    }

    let url = `https://www.google.com/maps/dir/?api=1`;
    if (origin) url += `&origin=${origin}`;
    if (destination) url += `&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    url += `&travelmode=driving`;

    window.open(url, '_blank');
  };

  // Calculate Route Statistics
  const routeStats = useMemo(() => {
    if (!item?.coordinates) return { totalDistance: 0, totalTime: 0 };

    let totalDist = 0;
    
    if (plannerMode === 'destination') {
        if (routeWithDetails.length === 0) return { totalDistance: 0, totalTime: 0 };
        let currentPos = item.coordinates;
        routeWithDetails.forEach(stop => {
            if (stop.coords) {
                totalDist += calculateDistance(currentPos, stop.coords);
                currentPos = stop.coords;
            }
        });
    } else {
        // Road Trip Stats
        if (!startCoordinates) return { totalDistance: 0, totalTime: 0 };
        let currentPos = startCoordinates;
        
        roadTripRoute.forEach(stop => {
            if (stop.coords) {
                totalDist += calculateDistance(currentPos, stop.coords);
                currentPos = stop.coords;
            }
        });
        
        // Add final leg to destination
        totalDist += calculateDistance(currentPos, item.coordinates);
    }

    // Avg speed: 500m/min for city, 1500m/min (90km/h) for road trip
    const speed = plannerMode === 'destination' ? 500 : 1300;
    const estimatedMinutes = Math.round(totalDist / speed);

    return { totalDistance: totalDist, totalTime: estimatedMinutes };
  }, [item, routeWithDetails, roadTripRoute, plannerMode, startCoordinates]);

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

    // 1. Destination Marker (Always shown)
    const destIcon = L.divIcon({
        className: 'bg-transparent',
        html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    L.marker([item.coordinates.latitude, item.coordinates.longitude], { icon: destIcon })
     .addTo(map)
     .bindPopup(`<b style="font-family: sans-serif;">Destination: ${item.locationName}</b>`);
    
    bounds.extend([item.coordinates.latitude, item.coordinates.longitude]);

    const latLngs: L.LatLngExpression[] = [];

    if (plannerMode === 'destination') {
        // Destination Itinerary Logic
        latLngs.push([item.coordinates.latitude, item.coordinates.longitude]);

        routeWithDetails.forEach((stop, idx) => {
            const { latitude, longitude } = stop.coords;
            latLngs.push([latitude, longitude]);
            bounds.extend([latitude, longitude]);

            const numIcon = L.divIcon({
                className: 'bg-transparent',
                html: `
                    <div style="background-color: ${stop.completed ? '#22c55e' : '#3b82f6'}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); font-family: sans-serif;">
                        ${stop.isImportant ? '<span style="color: #fbbf24; font-size: 10px; position: absolute; top: -8px;">★</span>' : ''}
                        ${idx + 1}
                    </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -16]
            });

            const marker = L.marker([latitude, longitude], { icon: numIcon }).addTo(map);
            marker.on('click', () => setSelectedStop(stop));
        });
    } else {
        // Road Trip Logic
        
        // Start Point
        if (startCoordinates) {
            const startIcon = L.divIcon({
                className: 'bg-transparent',
                html: `<div style="display:flex; justify-content:center; align-items:center; font-size:24px;">🏁</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });
            L.marker([startCoordinates.latitude, startCoordinates.longitude], { icon: startIcon })
             .addTo(map)
             .bindPopup(`<b>Start: ${startLocationName || 'Start Point'}</b>`);
            
            latLngs.push([startCoordinates.latitude, startCoordinates.longitude]);
            bounds.extend([startCoordinates.latitude, startCoordinates.longitude]);
        }

        // Stops
        roadTripRoute.forEach((stop, idx) => {
            if (stop.coords) {
                const { latitude, longitude } = stop.coords;
                latLngs.push([latitude, longitude]);
                bounds.extend([latitude, longitude]);

                // Car Icon for Stops
                const carIcon = L.divIcon({
                    className: 'bg-transparent',
                    html: `
                        <div style="background-color: #f97316; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                        </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                    popupAnchor: [0, -18]
                });

                const marker = L.marker([latitude, longitude], { icon: carIcon }).addTo(map);
                marker.on('click', () => setSelectedStop(stop));
            }
        });

        // End Point (Destination)
        if (item.coordinates) {
             latLngs.push([item.coordinates.latitude, item.coordinates.longitude]);
        }
    }

    // Draw Polyline
    if (latLngs.length > 1) {
        L.polyline(latLngs, {
            color: plannerMode === 'destination' ? '#3b82f6' : '#f97316',
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 10',
            lineCap: 'round'
        }).addTo(map);
    }

    // Fit Bounds
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    setTimeout(() => map.invalidateSize(), 300);

  }, [item, routeWithDetails, roadTripRoute, activeTab, plannerMode, startCoordinates, startLocationName]);

  if (!item) return null;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 relative">
        
        {/* Top Navigation Bar */}
        <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-20 shrink-0">
            <div className="flex items-center justify-between p-4 pb-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                        <Route className="w-5 h-5 text-blue-500" />
                        Trip Planner
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {item.locationName}
                    </p>
                </div>

                <div className="flex items-center gap-3">
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

                    <button 
                        onClick={onClose}
                        className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex px-4 gap-6">
                <button
                    onClick={() => setPlannerMode('destination')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${plannerMode === 'destination' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                >
                    <MapIcon className="w-4 h-4" />
                    City Itinerary
                </button>
                <button
                    onClick={() => setPlannerMode('roadtrip')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${plannerMode === 'roadtrip' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                >
                    <Car className="w-4 h-4" />
                    On the Way
                </button>
            </div>
        </div>

        {/* Content Body - Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Sidebar / List View (Controls) */}
            <div className={`w-full md:w-1/3 bg-gray-50 dark:bg-gray-800/50 flex flex-col border-r border-gray-200 dark:border-gray-700 h-full absolute md:relative z-10 transition-transform duration-300 ${activeTab === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                
                {/* Road Trip Start Location Input */}
                {plannerMode === 'roadtrip' && (
                    <div className="p-4 bg-orange-50 dark:bg-gray-900 border-b border-orange-100 dark:border-gray-700">
                        <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                            <Flag className="w-3 h-3" /> Starting Point
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={startLocationName}
                                onChange={(e) => setStartLocationName(e.target.value)}
                                onBlur={handleSetStartLocation}
                                onKeyDown={(e) => e.key === 'Enter' && handleSetStartLocation()}
                                className="flex-1 bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="My Location or City Name"
                            />
                            {isSettingStart && <Loader2 className="w-4 h-4 animate-spin text-orange-500 self-center" />}
                        </div>
                    </div>
                )}

                {/* Add Place Input */}
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className={`w-3 h-3 ${plannerMode === 'roadtrip' ? 'text-orange-500' : 'text-blue-500'}`} />
                            {plannerMode === 'roadtrip' ? 'Add Stop on Route' : 'Magic Add Stop'}
                        </label>
                        {plannerMode === 'destination' ? (
                            <div className="flex gap-1">
                                <button
                                    onClick={handleOptimizeRoute}
                                    disabled={isRegenerating || isAddingPlace || currentItinerary.length < 2}
                                    className="p-1.5 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 transition-colors disabled:opacity-30"
                                    title="AI Optimize Route Order"
                                >
                                    <Zap className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-pulse' : ''}`} />
                                </button>
                                <button 
                                    onClick={handleRegenerate} 
                                    disabled={isRegenerating || isAddingPlace}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                                    title="Generate AI Itinerary"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={handleSuggestRoadTrip} 
                                disabled={isRegenerating || isAddingPlace || !startLocationName}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md transition-colors"
                                title="Suggest Stops"
                            >
                                <Sparkles className="w-3 h-3" />
                                {isRegenerating ? 'Suggesting...' : 'Suggest Stops'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newPlaceInput}
                            onChange={(e) => setNewPlaceInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPlace()}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={plannerMode === 'roadtrip' ? "Stop name (e.g. 'Diner', 'Viewpoint')..." : "Place name (e.g. 'Eiffel Tower')..."}
                            disabled={isAddingPlace}
                        />
                        <button 
                            onClick={handleAddPlace}
                            disabled={!newPlaceInput.trim() || isAddingPlace}
                            className={`${plannerMode === 'roadtrip' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        >
                            {isAddingPlace ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Sortable List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                    {(plannerMode === 'destination' ? currentItinerary : roadTripStops).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center p-4">
                            {isRegenerating ? (
                                <>
                                    <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-500" />
                                    <p className="text-sm">Dreaming up a route...</p>
                                </>
                            ) : (
                                <>
                                    {plannerMode === 'roadtrip' ? <Car className="w-8 h-8 mb-2 opacity-20" /> : <MapPin className="w-8 h-8 mb-2 opacity-20" />}
                                    <p className="text-sm">{plannerMode === 'roadtrip' ? 'No stops added yet.' : 'No places added yet.'}</p>
                                    {plannerMode === 'destination' && (
                                        <button 
                                            onClick={handleRegenerate}
                                            className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <Sparkles className="w-3 h-3" /> Auto-Suggest Itinerary
                                        </button>
                                    )}
                                    {plannerMode === 'roadtrip' && (
                                        <button 
                                            onClick={handleSuggestRoadTrip}
                                            disabled={!startLocationName}
                                            className="mt-2 text-xs text-orange-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Sparkles className="w-3 h-3" /> Suggest Stops on Route
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        (plannerMode === 'destination' ? routeWithDetails : roadTripRoute).map((stop, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedStop(stop)}
                                className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-xl shadow-sm group transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${stop.isImportant ? 'border-yellow-200 dark:border-yellow-900/30 ring-1 ring-yellow-100 dark:ring-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${plannerMode === 'roadtrip' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' : (stop.isImportant ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400')}`}>
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
                                            {plannerMode === 'destination' ? `${formatDistance(stop.distanceFromStart)} from start` : 'Stop on route'}
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

                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveRoute}
                            disabled={isSaved || (plannerMode === 'destination' ? currentItinerary.length === 0 : roadTripStops.length === 0)}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                                isSaved 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90'
                            } ${(plannerMode === 'destination' ? currentItinerary.length === 0 : roadTripStops.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSaved ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Route Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save {plannerMode === 'destination' ? 'City' : 'Road'} Route
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleStartNavigation}
                            disabled={plannerMode === 'destination' ? routeWithDetails.length === 0 : !startCoordinates}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Open in Google Maps"
                        >
                            <Navigation className="w-4 h-4" />
                            GO
                        </button>
                    </div>
                    
                    {plannerMode === 'roadtrip' && (
                         <div className="text-center">
                            <p className="text-[9px] text-gray-400">Road trip route is linear: Start -> Stops -> End.</p>
                        </div>
                    )}
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
