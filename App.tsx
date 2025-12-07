import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Radar, ListChecks, Map as MapIcon, Loader, Zap, Settings, Filter, CheckCircle2, Circle, LayoutList, AlignJustify, List } from 'lucide-react';
import { BucketListCard } from './components/BucketListCard';
import { AddItemModal } from './components/AddItemModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { MapView } from './components/MapView';
import { BucketItem, BucketItemDraft, Coordinates, Theme, User } from './types';
import { calculateDistance, requestNotificationPermission, sendNotification, formatDistance } from './utils/geo';
import { MOCK_BUCKET_ITEMS, generateMockItems } from './utils/mockData';

const STORAGE_KEY = 'jk_bucket_items';
const THEME_KEY = 'jk_theme';
const USER_KEY = 'jk_user';
const CAT_KEY = 'jk_categories';
const INT_KEY = 'jk_interests';

const PROXIMITY_THRESHOLD = 2000; // meters (2km)

// Default Data
const DEFAULT_CATEGORIES = ['Adventure', 'Travel', 'Food', 'Culture', 'Nature', 'Luxury', 'Personal Growth'];
const DEFAULT_INTERESTS = ['Hiking', 'Photography', 'History', 'Art', 'Beach', 'Mountains', 'Wildlife', 'Music'];

// Custom Bucket Logo Component - JK Design with Text
const BucketLogo = () => (
    <div className="flex flex-col items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 filter drop-shadow-sm transition-transform hover:scale-110 duration-300">
            <path d="M56 160c0-100 400-100 400 0" stroke="#ef4444" strokeWidth="40" strokeLinecap="round" fill="none"></path>
            <path d="M56 160l40 320h320l40-320Z" fill="#ef4444"></path>
            <text x="256" y="380" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="160" fill="#ffffff" textAnchor="middle">JK</text>
        </svg>
        <span className="text-[9px] font-bold text-red-600 dark:text-red-500 tracking-widest leading-none mt-0.5">just knock it</span>
    </div>
);

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // Settings State
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(CAT_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [interests, setInterests] = useState<string[]>(() => {
    const saved = localStorage.getItem(INT_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_INTERESTS;
  });

  // App State
  const [items, setItems] = useState<BucketItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Initialize with mock data if empty
    if (!saved) {
      // Use generator to get massive dataset
      return generateMockItems();
    }
    return JSON.parse(saved);
  });
  
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isRadarOn, setIsRadarOn] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locating, setLocating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });

  // Filter & View State
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [isCompact, setIsCompact] = useState(false);

  // Edit State
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);

  // Keep track of notified items to avoid spamming
  const notifiedItems = useRef<Set<string>>(new Set());

  // Persistence Effects
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(CAT_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(INT_KEY, JSON.stringify(interests));
  }, [interests]);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: Theme) => {
      if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Scheduled Reminders
  useEffect(() => {
    const checkScheduledReminders = () => {
        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const dateKey = now.toDateString();
        
        const storageKeyAM = `jk_reminded_am_${dateKey}`;
        const storageKeyPM = `jk_reminded_pm_${dateKey}`;

        const activeItems = items.filter(i => !i.completed);
        const randomItem = activeItems.length > 0 ? activeItems[Math.floor(Math.random() * activeItems.length)] : null;
        
        if (!randomItem) return;

        if (hour === 11 && min === 0) {
            if (!localStorage.getItem(storageKeyAM)) {
                sendNotification("Morning Inspiration ☀️", `Don't forget about your dream: ${randomItem.title}`);
                localStorage.setItem(storageKeyAM, 'true');
            }
        }

        if (hour === 23 && min === 0) {
             if (!localStorage.getItem(storageKeyPM)) {
                sendNotification("Dream Big Tonight 🌙", `Have you planned for: ${randomItem.title}?`);
                localStorage.setItem(storageKeyPM, 'true');
            }
        }
    };

    const interval = setInterval(checkScheduledReminders, 60000);
    checkScheduledReminders();

    return () => clearInterval(interval);
  }, [items]);

  const checkProximity = useCallback((currentLocation: Coordinates) => {
    items.forEach(item => {
      if (!item.completed && item.coordinates && !notifiedItems.current.has(item.id)) {
        const dist = calculateDistance(currentLocation, item.coordinates);
        
        if (dist < PROXIMITY_THRESHOLD) {
          sendNotification(
            `You are close to a dream!`, 
            `You are within ${formatDistance(dist)} of: ${item.title}`
          );
          notifiedItems.current.add(item.id);
        }
      }
    });
  }, [items]);

  // Geolocation Watcher
  useEffect(() => {
    let watchId: number | null = null;

    if (isRadarOn) {
      setLocating(true);
      requestNotificationPermission().then((granted) => {
        if (!granted) {
          setIsRadarOn(false);
          setLocating(false);
          alert("Please enable notifications to use the Radar feature.");
          return;
        }

        if ('geolocation' in navigator) {
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const newLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              setUserLocation(newLocation);
              setLocating(false);
              checkProximity(newLocation);
            },
            (error) => {
              console.error("Location error:", error);
              setLocating(false);
              setIsRadarOn(false);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
          );
        } else {
          alert("Geolocation is not supported by your browser.");
          setIsRadarOn(false);
          setLocating(false);
        }
      });
    } else {
      setUserLocation(null);
      setLocating(false);
      notifiedItems.current.clear();
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isRadarOn, checkProximity]);

  const handleAddItem = (draft: BucketItemDraft) => {
    if (editingItem) {
        setItems(prev => prev.map(item => 
            item.id === editingItem.id ? {
                ...item,
                title: draft.title,
                description: draft.description,
                locationName: draft.locationName,
                coordinates: (draft.latitude && draft.longitude) ? { latitude: draft.latitude, longitude: draft.longitude } : item.coordinates,
                category: draft.category,
                interests: draft.interests
            } : item
        ));
        setEditingItem(null);
    } else {
        const newItem: BucketItem = {
        id: crypto.randomUUID(),
        title: draft.title,
        description: draft.description,
        locationName: draft.locationName,
        coordinates: (draft.latitude && draft.longitude) ? {
            latitude: draft.latitude,
            longitude: draft.longitude
        } : undefined,
        completed: false,
        createdAt: Date.now(),
        category: draft.category,
        interests: draft.interests
        };
        setItems(prev => [newItem, ...prev]);
    }
    setIsAddModalOpen(false);
  };

  const handleEditClick = (item: BucketItem) => {
      setEditingItem(item);
      setIsAddModalOpen(true);
  };

  const handleToggleComplete = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleRestoreData = (restoredItems: BucketItem[]) => {
      if (restoredItems && restoredItems.length > 0) {
          setItems(restoredItems);
          alert(`Successfully restored ${restoredItems.length} dreams!`);
          setIsSettingsOpen(false);
      }
  };

  if (!user) {
    return (
        <>
            <div className="fixed top-4 right-4 z-50">
                <SettingsModal 
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    currentTheme={theme}
                    onThemeChange={setTheme}
                    onClearData={() => {}}
                    categories={[]} interests={[]}
                    onAddCategory={()=>{}} onRemoveCategory={()=>{}}
                    onAddInterest={()=>{}} onRemoveInterest={()=>{}}
                    onLogout={() => {}}
                />
            </div>
            <LoginScreen onLogin={setUser} />
        </>
    );
  }

  const incompleteCount = items.filter(i => !i.completed).length;
  const completedCount = items.length - incompleteCount;

  const filteredItems = items.filter(item => {
    if (filterStatus === 'pending') return !item.completed;
    if (filterStatus === 'completed') return item.completed;
    return true;
  });

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="flex-none z-30 border-b border-red-100/50 dark:border-gray-800 shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-900/90 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BucketLogo />
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsRadarOn(!isRadarOn)}
                className={`relative p-2.5 rounded-full transition-all duration-300 ${isRadarOn ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="Toggle Location Radar"
              >
                {locating ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Radar className={`w-5 h-5 ${isRadarOn ? 'animate-pulse' : ''}`} />
                )}
                {isRadarOn && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 pr-3 pl-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-grow overflow-y-auto no-scrollbar w-full">
        <div className="max-w-2xl mx-auto px-4 py-2 space-y-2">
            
            {/* Controls Toolbar: View Mode + Filters */}
            <div className="flex flex-wrap gap-2 justify-between items-center px-1">
                
                {/* View Switcher (List/Map) */}
                <div className="flex gap-0.5 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                    <button 
                        onClick={() => setActiveTab('list')}
                        className={`p-1.5 rounded-md transition-all ${activeTab === 'list' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setActiveTab('map')}
                        className={`p-1.5 rounded-md transition-all ${activeTab === 'map' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="Map View"
                    >
                        <MapIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* List Specific Controls */}
                {activeTab === 'list' && (
                    <div className="flex gap-2">
                        {/* Filters */}
                        <div className="flex gap-0.5 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                            <button 
                                onClick={() => setFilterStatus('all')}
                                title="All Items"
                                className={`p-1.5 rounded-md transition-all ${filterStatus === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => setFilterStatus('pending')}
                                title="Pending"
                                className={`p-1.5 rounded-md transition-all ${filterStatus === 'pending' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <Circle className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => setFilterStatus('completed')}
                                title="Completed"
                                className={`p-1.5 rounded-md transition-all ${filterStatus === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* View Toggle */}
                        <button 
                            onClick={() => setIsCompact(!isCompact)}
                            title={isCompact ? "Show Details" : "Compact View"}
                            className={`p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-all ${isCompact ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            {isCompact ? <AlignJustify className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
            
            {/* Stats Text Line */}
            {activeTab === 'list' && (
                <div className="flex justify-end px-1 -mt-1">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {filterStatus === 'completed' ? (
                             <>
                                <span className="font-bold text-red-600 dark:text-red-500 text-sm">{completedCount}</span> knocked out
                             </>
                        ) : filterStatus === 'pending' ? (
                             <>
                                <span className="font-bold text-red-600 dark:text-red-500 text-sm">{incompleteCount}</span> to be knocked out
                             </>
                        ) : (
                             <>
                                <span className="font-bold text-red-600 dark:text-red-500 text-sm">{incompleteCount}</span> more to knock it out
                             </>
                        )}
                    </p>
                </div>
            )}

            {/* Content View */}
            {activeTab === 'list' ? (
            <div className="space-y-3 pb-16">
                {filteredItems.length === 0 ? (
                <div className="text-center py-20 opacity-60">
                    <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        {filterStatus === 'all' ? 'Your bucket is empty.' : `No ${filterStatus} items found.`}
                    </p>
                    {filterStatus === 'all' && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start adding your wildest dreams!</p>}
                </div>
                ) : (
                filteredItems.map(item => (
                    <BucketListCard
                    key={item.id}
                    item={item}
                    isCompact={isCompact}
                    userLocation={userLocation}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                    onEdit={handleEditClick}
                    />
                ))
                )}
            </div>
            ) : (
            <MapView items={items} userLocation={userLocation} />
            )}

            {/* Footer Tagline (Inside Scroll View) */}
            <div className="py-4 text-center pb-24">
                <p className="text-[9px] uppercase tracking-widest text-gray-300 dark:text-gray-700 font-bold select-none">
                dream it. bucket it. knock it.
                </p>
            </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => {
            setEditingItem(null);
            setIsAddModalOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-red-600 to-red-500 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center z-40 group"
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Add/Edit Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
        }}
        onAdd={handleAddItem}
        categories={categories}
        availableInterests={interests}
        initialData={editingItem ? {
            title: editingItem.title,
            description: editingItem.description,
            locationName: editingItem.locationName,
            latitude: editingItem.coordinates?.latitude,
            longitude: editingItem.coordinates?.longitude,
            category: editingItem.category,
            interests: editingItem.interests
        } : null}
        mode={editingItem ? 'edit' : 'add'}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
        onClearData={() => setItems([])}
        categories={categories}
        interests={interests}
        onAddCategory={(cat) => setCategories(p => [...p, cat])}
        onRemoveCategory={(cat) => setCategories(p => p.filter(c => c !== cat))}
        onAddInterest={(int) => setInterests(p => [...p, int])}
        onRemoveInterest={(int) => setInterests(p => p.filter(i => i !== int))}
        onLogout={() => setUser(null)}
        items={items}
        onRestore={handleRestoreData}
      />
    </div>
  );
}