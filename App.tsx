
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Radar, ListChecks, Map as MapIcon, Loader, Zap, Settings, Filter, CheckCircle2, Circle, LayoutList, AlignJustify, List, Users } from 'lucide-react';
import { BucketListCard } from './components/BucketListCard';
import { AddItemModal } from './components/AddItemModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { MapView } from './components/MapView';
import { ChangelogModal } from './components/ChangelogModal';
import { BucketItem, BucketItemDraft, Coordinates, Theme, User } from './types';
import { calculateDistance, requestNotificationPermission, sendNotification, formatDistance, speak, getDistanceSpeech } from './utils/geo';
import { MOCK_BUCKET_ITEMS, generateMockItems } from './utils/mockData';
import { triggerHaptic } from './utils/haptics';

const STORAGE_KEY = 'jk_bucket_items';
const THEME_KEY = 'jk_theme';
const USER_KEY = 'jk_user';
const CAT_KEY = 'jk_categories';
const INT_KEY = 'jk_interests';
const PROX_KEY = 'jk_proximity';
const FAM_KEY = 'jk_family_members';

// Default Data
const DEFAULT_CATEGORIES = ['Adventure', 'Travel', 'Food', 'Culture', 'Nature', 'Luxury', 'Personal Growth'];
const DEFAULT_INTERESTS = ['Hiking', 'Photography', 'History', 'Art', 'Beach', 'Mountains', 'Wildlife', 'Music'];
const DEFAULT_PROXIMITY = 2000; // 2km in meters

// Custom Bucket Logo Component - JK Design with Text
const BucketLogo = ({ onClickVersion }: { onClickVersion: () => void }) => (
    <div className="flex flex-col items-start justify-center">
        <div className="flex items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 filter drop-shadow-sm transition-transform hover:scale-110 duration-300">
                <path d="M56 160c0-100 400-100 400 0" stroke="#ef4444" strokeWidth="40" strokeLinecap="round" fill="none"></path>
                <path d="M56 160l40 320h320l40-320Z" fill="#ef4444"></path>
                <text x="256" y="380" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="160" fill="#ffffff" textAnchor="middle">JK</text>
            </svg>
            <button 
                onClick={(e) => { e.stopPropagation(); onClickVersion(); }}
                className="text-[8px] font-bold text-gray-400 hover:text-red-500 cursor-pointer bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
            >
                v1.0
            </button>
        </div>
        <span className="text-[9px] font-bold text-red-600 dark:text-red-500 tracking-widest leading-none mt-0.5 ml-0.5">just knock it</span>
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
  const [proximityRange, setProximityRange] = useState<number>(() => {
    const saved = localStorage.getItem(PROX_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_PROXIMITY;
  });
  const [familyMembers, setFamilyMembers] = useState<string[]>(() => {
    const saved = localStorage.getItem(FAM_KEY);
    return saved ? JSON.parse(saved) : [];
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
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locating, setLocating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });

  // Filter & View State
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterOwner, setFilterOwner] = useState<string | null>(null); // null = All
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

  useEffect(() => {
    localStorage.setItem(PROX_KEY, proximityRange.toString());
  }, [proximityRange]);

  useEffect(() => {
    localStorage.setItem(FAM_KEY, JSON.stringify(familyMembers));
  }, [familyMembers]);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Clear previous theme attributes
    root.removeAttribute('data-theme');
    
    const applyTheme = (t: Theme) => {
      // Handle standard dark/light classes
      if (t === 'dark' || t === 'batman' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Handle Special Character Themes via data-attribute
      if (['spiderman', 'batman', 'elsa'].includes(t)) {
          root.setAttribute('data-theme', t);
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
        
        if (dist < proximityRange) {
          // Visual Notification
          sendNotification(
            `Nearby: ${item.title}`, 
            `${item.description}\nDistance: ${formatDistance(dist)}`,
            `jk-item-${item.id}`
          );
          
          // Audio Notification (TTS)
          const distSpeech = getDistanceSpeech(dist);
          const audioText = `Knock Knock! You are nearby ${item.title}. It is ${distSpeech} away. ${item.description}`;
          speak(audioText);

          notifiedItems.current.add(item.id);
        }
      }
    });
  }, [items, proximityRange]);

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
    triggerHaptic('success');
    if (editingItem) {
        setItems(prev => prev.map(item => 
            item.id === editingItem.id ? {
                ...item,
                title: draft.title,
                description: draft.description,
                locationName: draft.locationName,
                coordinates: (draft.latitude && draft.longitude) ? { latitude: draft.latitude, longitude: draft.longitude } : item.coordinates,
                category: draft.category,
                interests: draft.interests,
                owner: draft.owner
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
        interests: draft.interests,
        owner: draft.owner
        };
        setItems(prev => [newItem, ...prev]);
    }
    setIsAddModalOpen(false);
  };

  const handleEditClick = (item: BucketItem) => {
      triggerHaptic('medium');
      setEditingItem(item);
      setIsAddModalOpen(true);
  };

  const handleToggleComplete = (id: string) => {
    setItems(prev => {
        const newItems = prev.map(item => {
            if (item.id === id) {
                const isCompleting = !item.completed;
                triggerHaptic(isCompleting ? 'success' : 'medium');
                return { ...item, completed: !item.completed };
            }
            return item;
        });
        return newItems;
    });
  };

  const handleDelete = (id: string) => {
    triggerHaptic('warning');
    if (window.confirm("Are you sure you want to delete this wish?")) {
        setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleClearMockData = () => {
    triggerHaptic('warning');
    // Mock items have IDs starting with specific prefixes from mockData.ts (ind-, usa-, gen-)
    setItems(prev => prev.filter(item => {
        const isMock = item.id.startsWith('ind-') || item.id.startsWith('usa-') || item.id.startsWith('gen-');
        return !isMock;
    }));
  };

  const handleAddMockData = () => {
      triggerHaptic('success');
      // Get fresh mock data
      const mockItems = generateMockItems();
      
      setItems(prev => {
          // Filter out any mock items that might already exist by ID to prevent duplicates
          const existingIds = new Set(prev.map(i => i.id));
          const newMocks = mockItems.filter(i => !existingIds.has(i.id));
          
          if (newMocks.length === 0) {
              alert("No new mock items added. You might already have them all.");
              return prev;
          }
          
          alert(`Added ${newMocks.length} mock wishes to your list!`);
          return [...prev, ...newMocks];
      });
  };

  const handleRestoreData = (restoredItems: BucketItem[]) => {
      if (restoredItems && restoredItems.length > 0) {
          triggerHaptic('success');
          setItems(restoredItems);
          alert(`Successfully restored ${restoredItems.length} dreams!`);
          setIsSettingsOpen(false);
      }
  };

  const getUserInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
                    onClearData={() => setItems([])} // Actually clear data here
                    onClearMockData={handleClearMockData}
                    onAddMockData={handleAddMockData}
                    categories={[]} interests={[]}
                    familyMembers={[]}
                    onAddCategory={()=>{}} onRemoveCategory={()=>{}}
                    onAddInterest={()=>{}} onRemoveInterest={()=>{}}
                    onAddFamilyMember={()=>{}} onRemoveFamilyMember={()=>{}}
                    onLogout={() => {}}
                    proximityRange={proximityRange}
                    onProximityRangeChange={setProximityRange}
                />
            </div>
            <LoginScreen onLogin={(u) => { triggerHaptic('success'); setUser(u); }} />
        </>
    );
  }

  const incompleteCount = items.filter(i => !i.completed).length;
  const completedCount = items.length - incompleteCount;
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const filteredItems = items.filter(item => {
    if (filterStatus === 'pending' && item.completed) return false;
    if (filterStatus === 'completed' && !item.completed) return false;
    
    // Owner filter
    if (filterOwner) {
        // If filtering by "Me", show items with owner 'Me' or items with no owner (backward compatibility/default)
        if (filterOwner === 'Me') {
            if (item.owner && item.owner !== 'Me') return false;
        } else {
            // Filter by specific family member name
            if (item.owner !== filterOwner) return false;
        }
    }
    
    return true;
  });

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="flex-none z-30 border-b border-red-100/50 dark:border-gray-800 shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-900/90 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BucketLogo onClickVersion={() => setIsChangelogOpen(true)} />
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                    setIsRadarOn(!isRadarOn);
                    triggerHaptic('medium');
                }}
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
                onClick={() => {
                    setIsSettingsOpen(true);
                    triggerHaptic('light');
                }}
                className="p-1 pr-3 pl-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {user.photoUrl ? (
                    <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold border border-red-200 dark:border-red-800">
                        {getUserInitials(user.name)}
                    </div>
                )}
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
                        onClick={() => { setActiveTab('list'); triggerHaptic('light'); }}
                        className={`p-1.5 rounded-md transition-all ${activeTab === 'list' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => { setActiveTab('map'); triggerHaptic('light'); }}
                        className={`p-1.5 rounded-md transition-all ${activeTab === 'map' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        title="Map View"
                    >
                        <MapIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* List Specific Controls */}
                {activeTab === 'list' && (
                    <div className="flex gap-2 items-center">
                        {/* Family Filter (Only show if members exist) */}
                        {familyMembers.length > 0 && (
                            <div className="flex -space-x-2 mr-2 overflow-hidden bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                {/* All */}
                                <button 
                                    onClick={() => { setFilterOwner(null); triggerHaptic('light'); }}
                                    className={`relative z-30 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:scale-110 ${!filterOwner ? 'bg-gray-800 text-white border-white dark:border-gray-600' : 'bg-gray-200 text-gray-500 border-white dark:border-gray-700 dark:bg-gray-700'}`}
                                    title="All"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                </button>
                                {/* Me */}
                                <button 
                                    onClick={() => { setFilterOwner('Me'); triggerHaptic('light'); }}
                                    className={`relative z-20 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:scale-110 ${filterOwner === 'Me' ? 'bg-red-500 text-white border-white dark:border-gray-600' : 'bg-red-100 text-red-600 border-white dark:border-gray-700 dark:bg-gray-800'}`}
                                    title="Me"
                                >
                                    ME
                                </button>
                                {/* Members */}
                                {familyMembers.map((member, idx) => (
                                    <button 
                                        key={member}
                                        onClick={() => { setFilterOwner(member); triggerHaptic('light'); }}
                                        className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:scale-110 ${filterOwner === member ? 'bg-purple-500 text-white border-white dark:border-gray-600' : 'bg-purple-100 text-purple-600 border-white dark:border-gray-700 dark:bg-gray-800'}`}
                                        style={{ zIndex: 10 - idx }}
                                        title={member}
                                    >
                                        {getInitials(member)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex gap-0.5 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                            <button 
                                onClick={() => { setFilterStatus('all'); triggerHaptic('light'); }}
                                title="All Items"
                                className={`p-1.5 rounded-md transition-all ${filterStatus === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => { setFilterStatus('pending'); triggerHaptic('light'); }}
                                title="Pending"
                                className={`p-1.5 rounded-md transition-all ${filterStatus === 'pending' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <Circle className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => { setFilterStatus('completed'); triggerHaptic('light'); }}
                                title="Completed"
                                className={`p-1.5 rounded-md transition-all ${filterStatus === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* View Toggle */}
                        <button 
                            onClick={() => { setIsCompact(!isCompact); triggerHaptic('light'); }}
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
                        {filterOwner && <span className="mr-1 text-gray-500 dark:text-gray-400 font-bold">[{filterOwner === 'Me' ? 'My' : filterOwner + "'s"}]</span>}
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
            
            {/* Progress Bar */}
             {activeTab === 'list' && items.length > 0 && (
                <div className="px-1 mb-4 mt-1">
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-red-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
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
                    proximityRange={proximityRange}
                    />
                ))
                )}
            </div>
            ) : (
            <MapView items={items} userLocation={userLocation} proximityRange={proximityRange} />
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
            triggerHaptic('medium');
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
        familyMembers={familyMembers}
        initialData={editingItem ? {
            title: editingItem.title,
            description: editingItem.description,
            locationName: editingItem.locationName,
            latitude: editingItem.coordinates?.latitude,
            longitude: editingItem.coordinates?.longitude,
            category: editingItem.category,
            interests: editingItem.interests,
            owner: editingItem.owner
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
        onClearMockData={handleClearMockData}
        onAddMockData={handleAddMockData}
        categories={categories}
        interests={interests}
        familyMembers={familyMembers}
        onAddCategory={(cat) => setCategories(p => [...p, cat])}
        onRemoveCategory={(cat) => setCategories(p => p.filter(c => c !== cat))}
        onAddInterest={(int) => setInterests(p => [...p, int])}
        onRemoveInterest={(int) => setInterests(p => p.filter(i => i !== int))}
        onAddFamilyMember={(name) => setFamilyMembers(p => [...p, name])}
        onRemoveFamilyMember={(name) => setFamilyMembers(p => p.filter(n => n !== name))}
        onLogout={() => setUser(null)}
        items={items}
        onRestore={handleRestoreData}
        proximityRange={proximityRange}
        onProximityRangeChange={setProximityRange}
      />
      
      {/* Changelog Modal */}
      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </div>
  );
}
