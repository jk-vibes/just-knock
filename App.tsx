
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Radar, ListChecks, Map as MapIcon, Loader, Zap, Settings, Filter, CheckCircle2, Circle, LayoutList, AlignJustify, List, Users, LogOut, Clock, Search, X, ArrowLeft, Trophy, Bell } from 'lucide-react';
import { BucketListCard } from './components/BucketListCard';
import { AddItemModal } from './components/AddItemModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { TimelineView } from './components/TimelineView';
import { MapView } from './components/MapView';
import { CompleteDateModal } from './components/CompleteDateModal';
import { ChangelogModal } from './components/ChangelogModal';
import { ImageGalleryModal } from './components/ImageGalleryModal';
import { BucketItem, BucketItemDraft, Coordinates, Theme, User } from './types';
import { calculateDistance, requestNotificationPermission, sendNotification, formatDistance, speak, getDistanceSpeech } from './utils/geo';
import { MOCK_BUCKET_ITEMS, generateMockItems } from './utils/mockData';
import { triggerHaptic } from './utils/haptics';
import { driveService } from './services/driveService';

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
                v1.5
            </button>
        </div>
        <span className="logo-text text-[9px] font-bold text-red-600 dark:text-red-500 tracking-widest leading-none mt-0.5 ml-0.5">just knock it</span>
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewingItemImages, setViewingItemImages] = useState<BucketItem | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locating, setLocating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterOwner, setFilterOwner] = useState<string | null>(null); // null = All
  const [isCompact, setIsCompact] = useState(false);

  // Edit/Action State
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [completingItem, setCompletingItem] = useState<BucketItem | null>(null);
  const [activeToast, setActiveToast] = useState<{title: string, message: string} | null>(null);

  // Keep track of notified items to avoid spamming
  const notifiedItems = useRef<Set<string>>(new Set());
  
  // Refs for watcher to access latest state without restarting
  const itemsRef = useRef(items);
  const proximityRangeRef = useRef(proximityRange);

  // Persistence Effects
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    localStorage.setItem(CAT_KEY, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(INT_KEY, JSON.stringify(interests));
  }, [interests]);

  useEffect(() => {
    localStorage.setItem(PROX_KEY, proximityRange.toString());
    proximityRangeRef.current = proximityRange;
  }, [proximityRange]);

  useEffect(() => {
    localStorage.setItem(FAM_KEY, JSON.stringify(familyMembers));
  }, [familyMembers]);

  // Apply Theme and Meta Theme Color
  useEffect(() => {
    const root = window.document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    // Clear previous theme attributes
    root.removeAttribute('data-theme');
    
    const applyTheme = (t: Theme) => {
      // Handle standard dark/light classes
      const isDark = t === 'dark' || t === 'batman' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Handle Special Character Themes via data-attribute and Status Bar Color
      if (['marvel', 'batman', 'elsa'].includes(t)) {
          root.setAttribute('data-theme', t);
          
          if (t === 'marvel' && metaThemeColor) metaThemeColor.setAttribute('content', '#1e3a8a'); // Blue
          if (t === 'batman' && metaThemeColor) metaThemeColor.setAttribute('content', '#000000'); // Black
          if (t === 'elsa' && metaThemeColor) metaThemeColor.setAttribute('content', '#ecfeff'); // Cyan 50
      } else {
          // Default Red for Light/Dark
          if (metaThemeColor) metaThemeColor.setAttribute('content', isDark ? '#111827' : '#ef4444');
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

  // Auto-Backup Service (Every 24h)
  useEffect(() => {
      const runAutoBackup = async () => {
          if (!user) return;
          // Only perform backup if access token is available
          if (!driveService.getAccessToken()) return;

          const lastBackupStr = driveService.getLastBackupTime();
          const now = Date.now();
          const HOURS_24 = 24 * 60 * 60 * 1000;

          const shouldBackup = !lastBackupStr || (now - new Date(lastBackupStr).getTime() > HOURS_24);

          if (shouldBackup && items.length > 0) {
              // Perform silent backup
              await driveService.backup(items, true); 
          }
      };

      // Run immediately on mount/update
      runAutoBackup();

      // Check every hour to catch the 24h window if app stays open
      const interval = setInterval(runAutoBackup, 60 * 60 * 1000);
      return () => clearInterval(interval);
  }, [user, items]);

  // Optimized Geolocation Watcher
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
              
              // Check proximity inside the watcher using refs
              // This prevents restarting the watcher when items or settings change
              const currentItems = itemsRef.current;
              const range = proximityRangeRef.current;
              
              currentItems.forEach(item => {
                if (!item.completed && item.coordinates && !notifiedItems.current.has(item.id)) {
                  const dist = calculateDistance(newLocation, item.coordinates);
                  
                  if (dist < range) {
                    // 1. System Notification
                    sendNotification(
                      `Nearby: ${item.title}`, 
                      `${item.description}\nDistance: ${formatDistance(dist)}`,
                      `jk-item-${item.id}`
                    );
                    
                    // 2. Audio Notification (TTS)
                    const distSpeech = getDistanceSpeech(dist);
                    const audioText = `Knock Knock! You are nearby ${item.title}. It is ${distSpeech} away. ${item.description}`;
                    speak(audioText);
                    
                    // 3. In-App Toast
                    setActiveToast({
                        title: `Nearby: ${item.title}`,
                        message: `${formatDistance(dist)} away - ${item.locationName || 'Check it out!'}`
                    });
                    setTimeout(() => setActiveToast(null), 6000);

                    notifiedItems.current.add(item.id);
                  }
                }
              });
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
  }, [isRadarOn]); // Minimal dependencies to ensure watcher stability

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
                owner: draft.owner,
                images: draft.images || item.images, // Preserve new images or keep old
                // Update completion status and date if changed
                completed: draft.isCompleted !== undefined ? draft.isCompleted : item.completed,
                completedAt: draft.isCompleted ? draft.completedAt : (draft.isCompleted === false ? undefined : item.completedAt)
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
        images: draft.images || [],
        completed: draft.isCompleted || false,
        createdAt: Date.now(), 
        completedAt: draft.isCompleted ? draft.completedAt : undefined,
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
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (item.completed) {
        // If already completed, toggle off immediately
        triggerHaptic('medium');
        setItems(prev => prev.map(i => i.id === id ? { 
            ...i, 
            completed: false, 
            completedAt: undefined 
        } : i));
    } else {
        // If incomplete, open date picker modal
        triggerHaptic('light');
        setCompletingItem(item);
    }
  };

  const handleConfirmCompletion = (date: number) => {
      if (!completingItem) return;
      triggerHaptic('success');
      setItems(prev => prev.map(i => i.id === completingItem.id ? { 
          ...i, 
          completed: true, 
          completedAt: date 
      } : i));
      setCompletingItem(null);
  };

  const handleDelete = (id: string) => {
    triggerHaptic('warning');
    if (window.confirm("Are you sure you want to delete this wish?")) {
        setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleClearMockData = () => {
    triggerHaptic('warning');
    setItems(prev => prev.filter(item => {
        const isMock = item.id.startsWith('ind-') || item.id.startsWith('usa-') || item.id.startsWith('gen-');
        return !isMock;
    }));
  };

  const handleAddMockData = () => {
      triggerHaptic('success');
      const mockItems = generateMockItems();
      
      setItems(prev => {
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Calculate pending count for the current owner/filter scope
  const pendingCount = items.filter(item => {
    if (item.completed) return false;
    
    // Respect Owner filter
    if (filterOwner) {
        if (filterOwner === 'Me') {
            if (item.owner && item.owner !== 'Me') return false;
        } else {
            if (item.owner !== filterOwner) return false;
        }
    }
    return true;
  }).length;

  // Calculate Fill Percentage (Pending / Total)
  const totalItems = items.length;
  const globalPendingCount = items.filter(i => !i.completed).length;
  const completedGlobalCount = totalItems - globalPendingCount;
  const fillPercentage = totalItems > 0 ? (globalPendingCount / totalItems) * 100 : 0;
  
  // Progress Meter Calculation (0-100)
  const progressMeter = totalItems > 0 ? (completedGlobalCount / totalItems) * 100 : 0;

  // Determine fill color based on theme
  const getFillColor = () => {
      if (theme === 'batman') return '#fbbf24'; // amber-400
      if (theme === 'elsa') return '#06b6d4'; // cyan-500
      return '#ef4444'; // red-500 (default/marvel)
  };

  const filteredItems = items.filter(item => {
    // 1. Search Filter (Global)
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            (item.locationName && item.locationName.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.interests && item.interests.some(i => i.toLowerCase().includes(query)))
        );
        if (!matchesSearch) return false;
    }

    // 2. Status Filter
    if (filterStatus === 'pending' && item.completed) return false;
    if (filterStatus === 'completed' && !item.completed) return false;
    
    // 3. Owner Filter
    if (filterOwner) {
        if (filterOwner === 'Me') {
            if (item.owner && item.owner !== 'Me') return false;
        } else {
            if (item.owner !== filterOwner) return false;
        }
    }
    
    return true;
  });

  if (!user) {
    return (
        <>
            <div className="fixed top-4 right-4 z-50">
                <SettingsModal 
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    currentTheme={theme}
                    onThemeChange={setTheme}
                    onClearData={() => setItems([])}
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

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300 flex flex-col relative">
      
      {/* In-App Notification Toast */}
      {activeToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-red-100 dark:border-red-900/30 flex items-start gap-4">
                  <div className="p-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full shrink-0 animate-pulse">
                      <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{activeToast.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeToast.message}</p>
                  </div>
                  <button onClick={() => setActiveToast(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="flex-none z-30 border-b border-red-100/50 dark:border-gray-800 shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-900/90 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BucketLogo onClickVersion={() => setIsChangelogOpen(true)} />
            </div>
            
            <div className="flex items-center gap-2">
               {/* Search Icon Button */}
              <button
                onClick={() => {
                    setIsSearchOpen(true);
                    triggerHaptic('medium');
                }}
                className={`p-2.5 rounded-full transition-colors ${searchQuery ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

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
                className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => {
                    if(window.confirm("Are you sure you want to sign out?")) {
                        triggerHaptic('medium');
                        setUser(null);
                    }
                }}
                className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-grow overflow-y-auto no-scrollbar w-full">
        <div className="max-w-2xl mx-auto px-4 py-2 space-y-2">
            
            {/* Active Search Filter Chip */}
            {searchQuery && (
                <div className="px-1 mb-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Search className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-sm text-red-900 dark:text-red-100 truncate">
                                Searching: <span className="font-bold">{searchQuery}</span>
                            </span>
                        </div>
                        <button 
                            onClick={() => { setSearchQuery(''); triggerHaptic('light'); }}
                            className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Progress Meter / Slider */}
            {totalItems > 0 && activeTab === 'list' && !searchQuery && (
                <div className="px-1 mb-2 animate-in fade-in duration-500">
                    <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-gray-600">
                        {/* The Fill */}
                        <div
                            className="h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 relative overflow-hidden"
                            style={{
                                width: `${progressMeter}%`,
                                backgroundColor: getFillColor()
                            }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                        {/* Text Overlay */}
                        <div className="absolute inset-0 flex justify-between items-center px-3 text-[10px] font-extrabold uppercase tracking-widest z-10">
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-white drop-shadow-sm mix-blend-multiply dark:mix-blend-normal">
                                <Trophy className="w-3 h-3" />
                                <span>{completedGlobalCount} Done</span>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400">
                                {globalPendingCount} Dreaming
                            </span>
                        </div>
                        {/* Centered % (Optional) */}
                         <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                            <span className="text-[9px] font-black text-black/20 dark:text-white/20">{Math.round(progressMeter)}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls Toolbar: View Mode + Filters */}
            <div className="flex flex-wrap gap-2 justify-between items-center px-1 mb-2">
                
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
                                    className={`relative z-20 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:scale-110 ${filterOwner === 'Me' ? 'bg-purple-600 text-white border-purple-200 scale-110' : 'bg-purple-100 text-purple-600 border-white dark:border-gray-700'}`}
                                    title="Me"
                                >
                                    ME
                                </button>
                                {/* Others */}
                                {familyMembers.map((member, i) => (
                                    <button 
                                        key={member}
                                        onClick={() => { setFilterOwner(member); triggerHaptic('light'); }}
                                        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-transform hover:scale-110 ${filterOwner === member ? 'bg-blue-600 text-white border-blue-200 scale-110' : 'bg-blue-100 text-blue-600 border-white dark:border-gray-700'}`}
                                        title={member}
                                    >
                                        {getInitials(member)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Compact Toggle */}
                        <button
                            onClick={() => { setIsCompact(!isCompact); triggerHaptic('light'); }}
                            className={`p-1.5 rounded-lg border transition-colors ${isCompact ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 hover:text-gray-600'}`}
                            title="Compact View"
                        >
                            <AlignJustify className="w-4 h-4" />
                        </button>

                        {/* Status Filter Tabs */}
                        <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex gap-0.5">
                            <button
                                onClick={() => { setFilterStatus('all'); triggerHaptic('light'); }}
                                className={`px-3 py-1.5 rounded-md transition-all flex items-center justify-center ${filterStatus === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title="All"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => { setFilterStatus('pending'); triggerHaptic('light'); }}
                                className={`px-3 py-1.5 rounded-md transition-all flex items-center justify-center ${filterStatus === 'pending' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title="To Do"
                            >
                                <Circle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => { setFilterStatus('completed'); triggerHaptic('light'); }}
                                className={`px-3 py-1.5 rounded-md transition-all flex items-center justify-center ${filterStatus === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title="Done"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* CONTENT AREA */}
            <div className="pb-20 space-y-3">
                {activeTab === 'map' ? (
                     <div className="animate-in fade-in zoom-in-95 duration-300">
                        <MapView items={items} userLocation={userLocation} proximityRange={proximityRange} />
                     </div>
                ) : (
                    <>
                        {filterStatus === 'completed' && filteredItems.length > 0 && (
                             <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                                <TimelineView items={filteredItems} onEdit={handleEditClick} pendingCount={pendingCount} onViewPending={() => setFilterStatus('pending')} />
                             </div>
                        )}

                        {filterStatus !== 'completed' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                                            {filterStatus === 'completed' ? <Trophy className="w-8 h-8 text-gray-400" /> : <LayoutList className="w-8 h-8 text-gray-400" />}
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                                            {searchQuery ? 'No matching dreams found.' : 'Your list is empty. Start dreaming!'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredItems.map(item => (
                                        <BucketListCard 
                                            key={item.id} 
                                            item={item} 
                                            userLocation={userLocation}
                                            onToggleComplete={handleToggleComplete}
                                            onDelete={handleDelete}
                                            onEdit={handleEditClick}
                                            onViewImages={setViewingItemImages}
                                            isCompact={isCompact}
                                            proximityRange={proximityRange}
                                            theme={theme}
                                        />
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </main>

      {/* Search Overlay Input (When open) */}
      {isSearchOpen && (
          <div className="fixed inset-0 z-40 bg-white/90 dark:bg-gray-900/95 backdrop-blur-sm p-4 animate-in fade-in slide-in-from-top-10">
              <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setIsSearchOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </button>
                      <div className="flex-1 relative">
                          <input 
                              autoFocus
                              type="text" 
                              placeholder="Search your dreams..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full text-lg bg-transparent border-b-2 border-red-500 py-2 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                          />
                          {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                  <X className="w-5 h-5" />
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Floating Action Button (FAB) */}
      {!isSearchOpen && (
        <button
            onClick={() => {
                setIsAddModalOpen(true);
                triggerHaptic('medium');
            }}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-full shadow-lg hover:shadow-red-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40 group"
        >
            <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Add Wish
            </span>
        </button>
      )}

      {/* Modals */}
      <AddItemModal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }}
        onAdd={handleAddItem}
        categories={categories}
        availableInterests={interests}
        familyMembers={familyMembers}
        initialData={editingItem}
        mode={editingItem ? 'edit' : 'add'}
      />
      
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
        onAddCategory={(c) => setCategories(p => [...p, c])}
        onRemoveCategory={(c) => setCategories(p => p.filter(x => x !== c))}
        onAddInterest={(i) => setInterests(p => [...p, i])}
        onRemoveInterest={(i) => setInterests(p => p.filter(x => x !== i))}
        onAddFamilyMember={(m) => setFamilyMembers(p => [...p, m])}
        onRemoveFamilyMember={(m) => setFamilyMembers(p => p.filter(x => x !== m))}
        onLogout={() => setUser(null)}
        items={items}
        onRestore={handleRestoreData}
        proximityRange={proximityRange}
        onProximityRangeChange={setProximityRange}
      />

      <CompleteDateModal 
        isOpen={!!completingItem}
        onClose={() => setCompletingItem(null)}
        onConfirm={handleConfirmCompletion}
        itemTitle={completingItem?.title}
      />

      <ChangelogModal 
        isOpen={isChangelogOpen} 
        onClose={() => setIsChangelogOpen(false)} 
      />

      <ImageGalleryModal
        item={viewingItemImages}
        onClose={() => setViewingItemImages(null)}
      />

    </div>
  );
}
