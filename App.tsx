import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Radar, Map as MapIcon, Loader, Zap, Settings, Filter, CheckCircle2, Circle, LayoutList, AlignJustify, List, Users, LogOut, Clock, Search, X, ArrowLeft, Trophy, Bell, Tag, ArrowUpDown, CalendarDays, ArrowDownAZ, ArrowUpAZ, Download, Sparkles, History, Target } from 'lucide-react';
import { BucketListCard } from './components/BucketListCard';
import { AddItemModal } from './components/AddItemModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { TimelineView } from './components/TimelineView';
import { MapView } from './components/MapView';
import { CompleteDateModal } from './components/CompleteDateModal';
import { ChangelogModal } from './components/ChangelogModal';
import { ImageGalleryModal } from './components/ImageGalleryModal';
import { NotificationsModal } from './components/NotificationsModal';
import { TripPlanner } from './components/ItineraryRouteModal';
import { OnboardingTour } from './components/OnboardingTour';
import { BucketItem, BucketItemDraft, Coordinates, Theme, User, AppNotification } from './types';
import { calculateDistance, requestNotificationPermission, sendNotification, formatDistance, speak, getDistanceSpeech } from './utils/geo';
import { MOCK_BUCKET_ITEMS, generateMockItems } from './utils/mockData';
import { triggerHaptic } from './utils/haptics';
import { driveService } from './services/driveService';
import { CategoryIcon } from './components/CategoryIcon';

const STORAGE_KEY = 'jk_bucket_items';
const THEME_KEY = 'jk_theme';
const USER_KEY = 'jk_user';
const CAT_KEY = 'jk_categories';
const INT_KEY = 'jk_interests';
const PROX_KEY = 'jk_proximity';
const FAM_KEY = 'jk_family_members';
const ONBOARDING_KEY = 'jk_onboarding_completed';
const NOTIF_KEY = 'jk_notifications';

// Default Data
const DEFAULT_CATEGORIES = ['Adventure', 'Travel', 'Food', 'Culture', 'Nature', 'Luxury', 'Personal Growth'];
const DEFAULT_INTERESTS = ['Hiking', 'Photography', 'History', 'Art', 'Beach', 'Mountains', 'Wildlife', 'Music'];
const DEFAULT_PROXIMITY = 2000; // 2km in meters
const DEFAULT_CLIENT_ID = '482285261060-fe5mujd6kn3gos3k6kgoj0kjl63u0cr1.apps.googleusercontent.com';

// Sorting Options
type SortOption = 'newest' | 'oldest' | 'az' | 'za' | 'completed_recent';

// --- LIQUID BUCKET COMPONENT ---
const LiquidBucket = ({ 
    text, 
    className = "w-10 h-10", 
    hideText = false,
    frontColor,
    backColor, // Keep backColor prop for API compatibility but it might be unused if we rely on fillPercent logic inside
    backgroundColor, // New: Color for the empty/pending part
    outlineColor,
    fillPercent = 50
}: { 
    text: string, 
    className?: string, 
    hideText?: boolean,
    frontColor?: string,
    backColor?: string,
    backgroundColor?: string,
    outlineColor?: string,
    fillPercent?: number
}) => {
    // Clamp percentage
    const safePercent = Math.max(0, Math.min(100, fillPercent));
    
    // Calculate water level Y coordinate
    // Top of bucket ~160, Bottom ~480. Height ~320.
    const yBase = 480 - (safePercent * 3.2);
    const amp = 15; // Wave amplitude

    // Generate animation paths dynamically based on yBase
    const backWaveValues = `
        M0 ${yBase} Q 128 ${yBase - amp} 256 ${yBase} T 512 ${yBase} V 512 H 0 Z;
        M0 ${yBase} Q 128 ${yBase + amp} 256 ${yBase} T 512 ${yBase} V 512 H 0 Z;
        M0 ${yBase} Q 128 ${yBase - amp} 256 ${yBase} T 512 ${yBase} V 512 H 0 Z
    `.trim();

    const frontWaveValues = `
        M0 ${yBase} Q 128 ${yBase + amp} 256 ${yBase} T 512 ${yBase} V 512 H 0 Z;
        M0 ${yBase} Q 128 ${yBase - amp} 256 ${yBase} T 512 ${yBase} V 512 H 0 Z;
        M0 ${yBase} Q 128 ${yBase + amp} 256 ${yBase} T 512 ${yBase} V 512 H 0 Z
    `.trim();

    return (
        <svg viewBox="0 0 512 512" className={`${className} filter drop-shadow-sm transition-transform hover:scale-110 duration-300`}>
            <defs>
                <clipPath id={`bucket-clip-${text || 'icon'}`}>
                     <path d="M56 160l40 320h320l40-320Z" />
                </clipPath>
            </defs>
            
            {/* Handle */}
            <path d="M56 160c0-100 400-100 400 0" stroke={outlineColor || "currentColor"} strokeWidth="30" strokeLinecap="round" fill="none" />
            
            {/* Body Group */}
            <g clipPath={`url(#bucket-clip-${text || 'icon'})`}>
                 {/* Background (Pending) */}
                 <rect x="0" y="0" width="512" height="512" fill={backgroundColor || "transparent"} />

                 {/* Back Wave (Completed) */}
                 <path fill={backColor || "currentColor"} opacity="0.8">
                      <animate attributeName="d" dur="3s" repeatCount="indefinite" values={backWaveValues} />
                 </path>
                 {/* Front Wave (Completed) */}
                 <path fill={frontColor || "currentColor"} opacity="1">
                      <animate attributeName="d" dur="2s" repeatCount="indefinite" values={frontWaveValues} />
                 </path>
            </g>
    
            {/* Body Outline */}
            <path d="M56 160l40 320h320l40-320Z" stroke={outlineColor || "currentColor"} strokeWidth="30" strokeLinejoin="round" fill="none" />
            
            {/* Text */}
            {!hideText && (
                <text x="256" y="420" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize={text.length > 1 ? "160" : "280"} fill="white" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    {text}
                </text>
            )}
        </svg>
    );
};

// Custom Bucket Logo Component
const BucketLogo = ({ onClickVersion, outlineColor }: { onClickVersion: () => void, outlineColor: string }) => (
    <div className="flex flex-col items-start justify-center">
        <div className="flex items-center gap-2">
            <div className="text-red-500 dark:text-red-500">
                <LiquidBucket 
                    text="JK" 
                    className="w-10 h-10" 
                    outlineColor={outlineColor} 
                    frontColor="#ff4d4d" 
                    fillPercent={60}
                />
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onClickVersion(); }}
                className="text-[8px] font-bold text-gray-400 hover:text-red-500 cursor-pointer bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm"
            >
                v1.6
            </button>
        </div>
        <span className="logo-text text-[9px] font-bold text-red-600 dark:text-red-500 tracking-widest leading-none mt-0.5 ml-0.5">just knock it</span>
    </div>
);

export default function App() {
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('App is installable');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setInstallPrompt(null);
      } else {
        console.log('User dismissed the install prompt');
      }
    });
  };

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
    if (!saved) {
      return generateMockItems();
    }
    return JSON.parse(saved);
  });

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
      const saved = localStorage.getItem(NOTIF_KEY);
      return saved ? JSON.parse(saved) : [];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isRadarOn, setIsRadarOn] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewingItemImages, setViewingItemImages] = useState<BucketItem | null>(null);
  const [planningItem, setPlanningItem] = useState<BucketItem | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locating, setLocating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });
  
  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  
  // Onboarding Tour State
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const tokenClient = useRef<any>(null);

  useEffect(() => {
    if (user && !tokenClient.current) {
        const initClient = () => {
            if (window.google?.accounts?.oauth2) {
                try {
                    const clientId = localStorage.getItem('jk_client_id') || DEFAULT_CLIENT_ID;
                    tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                        client_id: clientId,
                        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                        callback: (tokenResponse: any) => {
                            if (tokenResponse.access_token) {
                                driveService.setAccessToken(tokenResponse.access_token);
                            }
                        },
                    });
                } catch (e) {
                    console.error("Failed to initialize token client", e);
                }
            }
        };
        
        if (window.google) {
            initClient();
        } else {
            const interval = setInterval(() => {
                if (window.google) {
                    clearInterval(interval);
                    initClient();
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }
  }, [user]);

  const handleGoogleReauth = useCallback((): Promise<void> => {
      return new Promise((resolve, reject) => {
          if (!tokenClient.current) {
              return reject("Not initialized");
          }
          tokenClient.current.callback = (resp: any) => {
              if (resp.error) reject(resp.error);
              else if (resp.access_token) {
                  driveService.setAccessToken(resp.access_token);
                  resolve();
              }
          };
          tokenClient.current.requestAccessToken({ prompt: '' });
      });
  }, []);

  useEffect(() => {
      if (user) {
          const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
          if (!hasCompleted) {
              const timer = setTimeout(() => setShowOnboarding(true), 1000);
              return () => clearTimeout(timer);
          }
      }
  }, [user]);

  const [isSystemDark, setIsSystemDark] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterInterest, setFilterInterest] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [completingItem, setCompletingItem] = useState<BucketItem | null>(null);
  const [activeToast, setActiveToast] = useState<{
      title: string; 
      message: string;
      action?: { label: string; onClick: () => void };
  } | null>(null);

  const notifiedItems = useRef<Set<string>>(new Set());
  const itemsRef = useRef(items);
  const proximityRangeRef = useRef(proximityRange);

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

  useEffect(() => {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const root = window.document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    root.removeAttribute('data-theme');
    
    const applyTheme = (t: Theme) => {
      const isDark = t === 'dark' || t === 'batman' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      if (['marvel', 'batman', 'elsa'].includes(t)) {
          root.setAttribute('data-theme', t);
          if (t === 'marvel' && metaThemeColor) metaThemeColor.setAttribute('content', '#1e3a8a');
          if (t === 'batman' && metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
          if (t === 'elsa' && metaThemeColor) metaThemeColor.setAttribute('content', '#ecfeff');
      } else {
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

  const addAppNotification = useCallback((title: string, message: string, type: 'location' | 'system' | 'info' = 'system', relatedItemId?: string) => {
      const newNotif: AppNotification = {
          id: crypto.randomUUID(),
          title,
          message,
          timestamp: Date.now(),
          read: false,
          type,
          relatedItemId
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  }, []);

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
                const title = "Morning Inspiration ☀️";
                const body = `Don't forget about your dream: ${randomItem.title}`;
                sendNotification(title, body);
                addAppNotification(title, body, 'system', randomItem.id);
                localStorage.setItem(storageKeyAM, 'true');
            }
        }

        if (hour === 23 && min === 0) {
             if (!localStorage.getItem(storageKeyPM)) {
                const title = "Dream Big Tonight 🌙";
                const body = `Have you planned for: ${randomItem.title}?`;
                sendNotification(title, body);
                addAppNotification(title, body, 'system', randomItem.id);
                localStorage.setItem(storageKeyPM, 'true');
            }
        }
    };

    const interval = setInterval(checkScheduledReminders, 60000);
    checkScheduledReminders();
    return () => clearInterval(interval);
  }, [items, addAppNotification]);

  useEffect(() => {
      const runAutoBackup = async () => {
          if (!user || !driveService.getAccessToken()) return;
          const lastBackupStr = driveService.getLastBackupTime();
          const now = Date.now();
          const HOURS_24 = 24 * 60 * 60 * 1000;
          const shouldBackup = !lastBackupStr || (now - new Date(lastBackupStr).getTime() > HOURS_24);

          if (shouldBackup && items.length > 0) {
              await driveService.backup(items, true); 
          }
      };
      runAutoBackup();
      const interval = setInterval(runAutoBackup, 60 * 60 * 1000);
      return () => clearInterval(interval);
  }, [user, items]);

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
              
              const currentItems = itemsRef.current;
              const range = proximityRangeRef.current;
              
              currentItems.forEach(item => {
                if (!item.completed && item.coordinates && !notifiedItems.current.has(item.id)) {
                  const dist = calculateDistance(newLocation, item.coordinates);
                  
                  if (dist < range) {
                    const title = `Nearby: ${item.title}`;
                    const body = `${item.description}\nDistance: ${formatDistance(dist)}`;
                    
                    sendNotification(title, body, `jk-item-${item.id}`);
                    const distSpeech = getDistanceSpeech(dist);
                    const audioText = `Knock Knock! You are nearby ${item.title}. It is ${distSpeech} away. ${item.description}`;
                    speak(audioText);
                    addAppNotification(title, body, 'location', item.id);
                    setActiveToast({
                        title: title,
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
              // Only turn off radar if permission is denied. For timeout or unavailable, just log it.
              if (error.code === 1) { // PERMISSION_DENIED
                  setIsRadarOn(false);
                  alert("Location permission denied. Radar turned off.");
              } else if (error.code === 2) { // POSITION_UNAVAILABLE
                  // Keep trying, maybe transient
              } else if (error.code === 3) { // TIMEOUT
                  // Keep trying
                  console.warn("Location timed out, retrying...");
              }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 } // Increased timeout to 20s
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
  }, [isRadarOn, addAppNotification]);

  const handleAddItem = (draft: BucketItemDraft) => {
    // ... existing handleAddItem code ...
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
                images: draft.images || item.images,
                completed: draft.isCompleted !== undefined ? draft.isCompleted : item.completed,
                completedAt: draft.isCompleted ? draft.completedAt : (draft.isCompleted === false ? undefined : item.completedAt),
                bestTimeToVisit: draft.bestTimeToVisit,
                itinerary: draft.itinerary,
                roadTrip: draft.roadTrip
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
        owner: draft.owner,
        bestTimeToVisit: draft.bestTimeToVisit,
        itinerary: draft.itinerary,
        roadTrip: draft.roadTrip
        };
        setItems(prev => [newItem, ...prev]);
    }
    setIsAddModalOpen(false);
  };

  const handleAddSeparateItem = (newItem: BucketItem) => {
      setItems(prev => [newItem, ...prev]);
      triggerHaptic('success');
      setActiveToast({
          title: "Memory Saved!",
          message: `${newItem.title} added to your completed dreams.`
      });
      setTimeout(() => setActiveToast(null), 3000);
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
        triggerHaptic('medium');
        setItems(prev => prev.map(i => i.id === id ? { 
            ...i, 
            completed: false, 
            completedAt: undefined 
        } : i));
    } else {
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

  const handleToggleItineraryItem = (itemId: string, index: number) => {
      setItems(prev => prev.map(item => {
          if (item.id !== itemId || !item.itinerary) return item;
          const newItinerary = [...item.itinerary];
          newItinerary[index] = { 
              ...newItinerary[index], 
              completed: !newItinerary[index].completed 
          };
          return { ...item, itinerary: newItinerary };
      }));
      triggerHaptic('light');
  };

  const handleUpdateItem = (updatedItem: BucketItem) => {
      setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      if (planningItem && planningItem.id === updatedItem.id) {
          setPlanningItem(updatedItem);
      }
  };

  const handleDelete = (id: string) => {
    triggerHaptic('warning');
    const itemToDelete = items.find(i => i.id === id);
    setItems(prev => prev.filter(item => item.id !== id));
    
    if (itemToDelete) {
            setActiveToast({
            title: "Dream Deleted",
            message: "It's gone from your list.",
            action: {
                label: "Undo",
                onClick: () => {
                    setItems(prev => [...prev, itemToDelete]);
                    setActiveToast(null);
                    triggerHaptic('success');
                }
            }
        });
        setTimeout(() => setActiveToast(null), 5000);
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

  const handleMarkAllNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      triggerHaptic('light');
  };

  const handleClearNotifications = () => {
      setNotifications([]);
      triggerHaptic('medium');
  };

  const handleCategoryClick = (category: string) => {
      setFilterCategory(prev => prev === category ? null : category);
      triggerHaptic('light');
      if (activeTab === 'map') setActiveTab('list');
  };

  const handleInterestClick = (interest: string) => {
      setFilterInterest(prev => prev === interest ? null : interest);
      triggerHaptic('light');
      if (activeTab === 'map') setActiveTab('list');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const pendingCount = items.filter(item => {
    if (item.completed) return false;
    if (filterOwner) {
        if (filterOwner === 'Me') {
            if (item.owner && item.owner !== 'Me') return false;
        } else {
            if (item.owner !== filterOwner) return false;
        }
    }
    return true;
  }).length;

  const totalItems = items.length;
  const globalPendingCount = items.filter(i => !i.completed).length;
  const completedGlobalCount = totalItems - globalPendingCount;
  const progressMeter = totalItems > 0 ? (completedGlobalCount / totalItems) * 100 : 0;

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getFABTheme = (currentTheme: Theme) => {
    switch (currentTheme) {
        case 'marvel':
            return { 
                outline: '#dc2626', // Red Outline
                front: '#2563eb',   // Blue Liquid (Completed)
                back: '#1e40af',    // Darker Blue Liquid
                background: '#fef2f2' // Light Red Background
            }; 
        case 'batman':
            return { 
                outline: '#fbbf24', 
                front: '#f59e0b',   
                back: '#b45309',    
                background: '#1f2937' 
            }; 
        case 'elsa':
            return { 
                outline: '#0e7490', 
                front: '#22d3ee',   
                back: '#0891b2',    
                background: '#ecfeff' 
            }; 
        default:
            return { 
                outline: '#374151', 
                front: '#22c55e',   
                back: '#15803d',    
                background: '#3b82f6' 
            }; 
    }
  };

  const fabTheme = getFABTheme(theme);

  const getProgressBarTheme = (currentTheme: Theme) => {
    switch (currentTheme) {
        case 'marvel':
            return { 
                // Blue for completed, Red for pending
                completedBg: 'bg-gradient-to-r from-blue-600 to-blue-900 shadow-inner', 
                completedText: 'text-white drop-shadow-sm',
                dreamingBg: 'bg-gradient-to-r from-red-600 to-red-800 shadow-inner',
                dreamingText: 'text-white drop-shadow-sm'
            }; 
        case 'batman':
            return { 
                completedBg: 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-inner', 
                completedText: 'text-black',
                dreamingBg: 'bg-gradient-to-r from-gray-800 to-black shadow-inner',
                dreamingText: 'text-gray-400'
            }; 
        case 'elsa':
            return { 
                completedBg: 'bg-gradient-to-r from-cyan-400 to-cyan-600 shadow-inner', 
                completedText: 'text-white drop-shadow-md',
                dreamingBg: 'bg-gradient-to-r from-sky-100 to-sky-300 shadow-inner',
                dreamingText: 'text-sky-900'
            }; 
        default:
            return { 
                completedBg: 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-inner', 
                completedText: 'text-white drop-shadow-sm',
                dreamingBg: 'bg-gradient-to-r from-blue-400 to-indigo-500 shadow-inner',
                dreamingText: 'text-white drop-shadow-sm'
            }; 
    }
  };

  const progressTheme = getProgressBarTheme(theme);

  // Filter logic including Time Filter (Only for List Mode)
  const filteredItems = useMemo(() => {
      return items.filter(item => {
        // 1. Search
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

        // 4. Category/Interest
        if (filterCategory && item.category !== filterCategory) return false;
        if (filterInterest && (!item.interests || !item.interests.includes(filterInterest))) return false;
        
        return true;
      });
  }, [items, searchQuery, filterStatus, filterOwner, filterCategory, filterInterest]);

  const sortedItems = useMemo(() => {
      return [...filteredItems].sort((a, b) => {
          switch (sortBy) {
              case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
              case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
              case 'az': return a.title.localeCompare(b.title);
              case 'za': return b.title.localeCompare(a.title);
              case 'completed_recent': 
                  if (!a.completedAt && !b.completedAt) return 0;
                  if (!a.completedAt) return 1;
                  if (!b.completedAt) return -1;
                  return b.completedAt - a.completedAt;
              default: return 0;
          }
      });
  }, [filteredItems, sortBy]);

  // Calculate stats for the current view (for display under slider)
  const viewStats = useMemo(() => {
      return {
          done: filteredItems.filter(i => i.completed).length,
          pending: filteredItems.filter(i => !i.completed).length,
          total: filteredItems.length
      };
  }, [filteredItems]);

  const completedPercent = viewStats.total > 0 ? (viewStats.done / viewStats.total) * 100 : 0;
  const pendingPercent = viewStats.total > 0 ? (viewStats.pending / viewStats.total) * 100 : 0;

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
                    onRestartTour={() => {}}
                />
            </div>
            <LoginScreen onLogin={(u) => { triggerHaptic('success'); setUser(u); }} />
        </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300 flex flex-col relative">
      <OnboardingTour 
        isActive={showOnboarding}
        onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem(ONBOARDING_KEY, 'true');
        }}
      />
      {activeToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border border-red-100 dark:border-red-900/30 flex items-center gap-4">
                  <div className="p-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full shrink-0 animate-pulse">
                      <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{activeToast.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeToast.message}</p>
                  </div>
                  {activeToast.action && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            activeToast.action?.onClick();
                        }} 
                        className="px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors shadow-sm whitespace-nowrap"
                    >
                        {activeToast.action.label}
                    </button>
                  )}
                  <button onClick={() => setActiveToast(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                  </button>
              </div>
          </div>
      )}

      <header className="flex-none z-30 border-b border-red-100/50 dark:border-gray-800 shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-900/90 transition-colors duration-300 pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BucketLogo onClickVersion={() => setIsChangelogOpen(true)} outlineColor="#ef4444" />
            </div>
            
            <div className="flex items-center gap-2">
              {installPrompt && (
                <button
                    onClick={handleInstallClick}
                    className="p-2.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors animate-pulse"
                    title="Install App"
                >
                    <Download className="w-5 h-5" />
                </button>
              )}

              <button 
                data-tour="radar-btn"
                onClick={() => {
                    setIsRadarOn(!isRadarOn);
                    triggerHaptic('medium');
                }}
                className={`relative p-2.5 rounded-full transition-all duration-300 ${isRadarOn ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                title="Toggle Location Radar"
              >
                {locating ? <Loader className="w-5 h-5 animate-spin" /> : <Radar className={`w-5 h-5 ${isRadarOn ? 'animate-pulse' : ''}`} />}
                {isRadarOn && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>}
              </button>

              <button
                data-tour="settings-btn"
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
                    setIsNotificationsOpen(true);
                    triggerHaptic('light');
                }}
                className="relative p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                   <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm">
                     {unreadNotifications > 9 ? '9+' : unreadNotifications}
                   </span>
                )}
              </button>
              
              <button
                onClick={() => {
                    if(window.confirm("Are you sure you want to sign out?")) {
                        triggerHaptic('medium');
                        setUser(null);
                    }
                }}
                className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center overflow-hidden"
              >
                {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover"/>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-[10px]">
                        {user?.name ? getInitials(user.name) : <Users className="w-4 h-4" />}
                    </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden w-full pb-[env(safe-area-inset-bottom)]">
        {planningItem ? (
            <TripPlanner 
                item={planningItem} 
                onClose={() => setPlanningItem(null)} 
                onUpdateItem={handleUpdateItem}
                onAddSeparateItem={handleAddSeparateItem}
                userLocation={userLocation}
            />
        ) : (
            <>
                {/* TOOLBAR: List Controls & View Switcher */}
                <div className="w-full z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
                    <div className="max-w-2xl mx-auto px-2 py-1"> {/* Reduced vertical padding py-2 -> py-1 */}
                        
                        {/* Active Filters Row (Tags) */}
                        {(searchQuery || filterCategory || filterInterest) && (
                            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 mb-1"> {/* Reduced mb-2 -> mb-1 */}
                                {searchQuery && (
                                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30">
                                        <Search className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-xs font-bold text-red-900 dark:text-red-100 max-w-[150px] truncate">"{searchQuery}"</span>
                                        <button onClick={() => { setSearchQuery(''); triggerHaptic('light'); }} className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                )}
                                {filterCategory && (
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                                        <CategoryIcon category={filterCategory} className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{filterCategory}</span>
                                        <button onClick={() => { setFilterCategory(null); triggerHaptic('light'); }} className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                )}
                                {filterInterest && (
                                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/30">
                                        <Tag className="w-3.5 h-3.5 text-green-500" />
                                        <span className="text-xs font-bold text-green-900 dark:text-green-100">{filterInterest}</span>
                                        <button onClick={() => { setFilterInterest(null); triggerHaptic('light'); }} className="p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 text-green-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stats Bar (Progress View) - Only in List View & if we have items */}
                        {activeTab === 'list' && viewStats.total > 0 && (
                            <div className="mb-1 rounded-xl overflow-hidden flex h-9 shadow-sm border border-gray-100 dark:border-gray-700 relative bg-gray-100 dark:bg-gray-800">
                                {/* Completed Bar */}
                                <div 
                                    className={`${progressTheme.completedBg} h-full flex items-center justify-center ${progressTheme.completedText} text-[10px] font-bold uppercase tracking-wider transition-all duration-500 overflow-hidden`}
                                    style={{ width: `${completedPercent}%` }}
                                >
                                    {completedPercent > 15 && <span className="truncate px-1">Knocked {viewStats.done} ({Math.round(completedPercent)}%)</span>}
                                </div>
                                
                                {/* Pending Bar */}
                                <div 
                                    className={`${progressTheme.dreamingBg} h-full flex items-center justify-center ${progressTheme.dreamingText} text-[10px] font-bold uppercase tracking-wider transition-all duration-500 overflow-hidden`}
                                    style={{ width: `${pendingPercent}%` }}
                                >
                                    {pendingPercent > 15 && <span className="truncate px-1">Dreaming {viewStats.pending}</span>}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-0 relative h-10"> {/* Reduced mb-1 to mb-0 */}
                            {/* Left: Icon-based View Switcher */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl z-10 relative">
                                <button 
                                    onClick={() => { setActiveTab('list'); triggerHaptic('light'); }}
                                    className={`p-2 rounded-lg transition-all ${activeTab === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    title="List View"
                                >
                                    <List className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => { setActiveTab('map'); triggerHaptic('light'); }}
                                    className={`p-2 rounded-lg transition-all ${activeTab === 'map' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                    title="Map View"
                                >
                                    <MapIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Center: Family Filter Icon Group */}
                            {familyMembers.length > 0 && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                                    <div className="flex items-center -space-x-2 hover:space-x-1 transition-all duration-300 p-1 max-w-[200px] overflow-x-hidden">
                                        <button 
                                            onClick={() => setFilterOwner(null)}
                                            className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${!filterOwner ? 'border-red-500 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 z-20 scale-110 shadow-sm' : 'border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 text-gray-400 hover:z-30 hover:scale-110'}`}
                                            title="All Dreams"
                                        >
                                            <Users className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setFilterOwner('Me')}
                                            className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${filterOwner === 'Me' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 z-20 scale-110 shadow-sm' : 'border-white dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20 text-blue-400 hover:z-30 hover:scale-110'}`}
                                            title="My Dreams"
                                        >
                                            <span className="text-[10px] font-bold">Me</span>
                                        </button>
                                        {familyMembers.map(member => (
                                            <button 
                                                key={member}
                                                onClick={() => setFilterOwner(filterOwner === member ? null : member)}
                                                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 ${filterOwner === member ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 z-20 scale-110 shadow-sm' : 'border-white dark:border-gray-800 bg-purple-50 dark:bg-purple-900/20 text-purple-400 hover:z-30 hover:scale-110'}`}
                                                title={member}
                                            >
                                                <span className="text-[10px] font-bold">{getInitials(member)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Right: List Controls */}
                            <div className="flex items-center gap-2 z-10 relative">
                                {activeTab === 'list' && (
                                    <>
                                        <button 
                                            onClick={() => { setIsCompact(!isCompact); triggerHaptic('light'); }}
                                            className={`p-2 rounded-lg transition-all ${isCompact ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
                                            title="Compact View"
                                        >
                                            <AlignJustify className="w-5 h-5" />
                                        </button>
                                        
                                        <div className="relative">
                                            <button 
                                                onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); triggerHaptic('light'); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSortMenuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                                            >
                                                <ArrowUpDown className="w-4 h-4" />
                                                <span className="hidden sm:inline">Sort</span>
                                            </button>

                                            {/* Sort Dropdown */}
                                            {isSortMenuOpen && (
                                                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-1 w-40 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 z-50">
                                                    <button onClick={() => { setSortBy('newest'); setIsSortMenuOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${sortBy === 'newest' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                        <CalendarDays className="w-3.5 h-3.5" /> Newest First
                                                    </button>
                                                    <button onClick={() => { setSortBy('oldest'); setIsSortMenuOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${sortBy === 'oldest' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                        <History className="w-3.5 h-3.5" /> Oldest First
                                                    </button>
                                                    <button onClick={() => { setSortBy('az'); setIsSortMenuOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${sortBy === 'az' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                        <ArrowDownAZ className="w-3.5 h-3.5" /> Name (A-Z)
                                                    </button>
                                                    <button onClick={() => { setSortBy('za'); setIsSortMenuOpen(false); }} className={`text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${sortBy === 'za' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                        <ArrowUpAZ className="w-3.5 h-3.5" /> Name (Z-A)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar w-full">
                    <div className="max-w-2xl mx-auto px-2 pt-0 pb-24 h-full"> {/* Reduced pt-1 to pt-0 */}
                        {activeTab === 'list' ? (
                            <div className="space-y-3">
                                {filterStatus === 'completed' ? (
                                    <TimelineView 
                                        items={sortedItems.filter(i => i.completed)} 
                                        onEdit={handleEditClick}
                                        pendingCount={pendingCount}
                                        onViewPending={() => {
                                            setFilterStatus('pending');
                                            setSortBy('newest');
                                        }}
                                    />
                                ) : (
                                    sortedItems.map(item => (
                                    <BucketListCard
                                        key={item.id}
                                        item={item}
                                        userLocation={userLocation}
                                        onToggleComplete={handleToggleComplete}
                                        onDelete={handleDelete}
                                        onEdit={handleEditClick}
                                        onViewImages={setViewingItemImages}
                                        onCategoryClick={handleCategoryClick}
                                        onInterestClick={handleInterestClick}
                                        onToggleItineraryItem={handleToggleItineraryItem}
                                        onOpenPlanner={setPlanningItem}
                                        isCompact={isCompact}
                                        proximityRange={proximityRange}
                                        theme={theme}
                                    />
                                    ))
                                )}
                                {sortedItems.length === 0 && (
                                    <div className="text-center py-20 px-4">
                                        <div className="mb-4 text-gray-200 dark:text-gray-700 flex justify-center">
                                            <Sparkles className="w-16 h-16" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No dreams found</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                                            {filterStatus === 'completed'
                                                    ? "You haven't completed any items yet. Keep dreaming!"
                                                    : "Start your journey by adding a new dream to your bucket list."
                                            }
                                        </p>
                                        {filterStatus === 'completed' && (
                                            <button 
                                                onClick={() => setFilterStatus('pending')}
                                                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                View Pending Dreams
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <MapView 
                                // For map, we pass original items sorted but NOT filtered by timeline slider
                                // MapView has its own internal slider.
                                // We need a fresh sort of the raw filtered items (ignoring the time filter applied above)
                                items={items.filter(item => {
                                    // Re-apply generic filters but skip the time filter
                                    if (searchQuery) {
                                        const query = searchQuery.toLowerCase();
                                        if (!(item.title.toLowerCase().includes(query) ||
                                            item.description.toLowerCase().includes(query) ||
                                            (item.locationName && item.locationName.toLowerCase().includes(query)) ||
                                            (item.category && item.category.toLowerCase().includes(query)) ||
                                            (item.interests && item.interests.some(i => i.toLowerCase().includes(query))))) return false;
                                    }
                                    if (filterStatus === 'pending' && item.completed) return false;
                                    if (filterStatus === 'completed' && !item.completed) return false;
                                    if (filterOwner) {
                                        if (filterOwner === 'Me') {
                                            if (item.owner && item.owner !== 'Me') return false;
                                        } else {
                                            if (item.owner !== filterOwner) return false;
                                        }
                                    }
                                    if (filterCategory && item.category !== filterCategory) return false;
                                    if (filterInterest && (!item.interests || !item.interests.includes(filterInterest))) return false;
                                    return true;
                                })}
                                userLocation={userLocation} 
                                proximityRange={proximityRange} 
                            />
                        )}
                    </div>
                </div>
            </>
        )}
      </main>

      {/* Floating Action Button for Add */}
      {!planningItem && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
            
            {/* Main Action Liquid Bucket */}
            <div data-tour="add-btn" className="relative group pointer-events-auto">
                 {/* Hover Tooltip for Count */}
                 <div className="absolute right-[110%] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                    {pendingCount} Dreams Pending
                    {/* Arrow */}
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                 </div>

                 <button
                    onClick={() => {
                        setIsAddModalOpen(true);
                        triggerHaptic('medium');
                    }}
                    className="relative transition-transform duration-300 hover:scale-105 active:scale-95"
                >
                    <LiquidBucket 
                        text="" 
                        className="w-20 h-20 drop-shadow-2xl" 
                        outlineColor={fabTheme.outline}
                        frontColor={fabTheme.front}
                        backColor={fabTheme.back}
                        backgroundColor={fabTheme.background}
                        fillPercent={progressMeter}
                    />
                    
                    {/* Plus Icon Badge */}
                    <div className="absolute top-0 right-0 translate-x-1 -translate-y-1 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-lg border-2 border-gray-100 dark:border-gray-700 pointer-events-none">
                        <Plus className="w-6 h-6 text-red-600 dark:text-red-500" strokeWidth={3} />
                    </div>
                </button>
            </div>
        </div>
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
        items={items}
        editingId={editingItem?.id}
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
        onAddCategory={(c) => setCategories([...categories, c])}
        onRemoveCategory={(c) => setCategories(categories.filter(cat => cat !== c))}
        onAddInterest={(i) => setInterests([...interests, i])}
        onRemoveInterest={(i) => setInterests(interests.filter(int => int !== i))}
        onAddFamilyMember={(m) => setFamilyMembers([...familyMembers, m])}
        onRemoveFamilyMember={(m) => setFamilyMembers(familyMembers.filter(f => f !== m))}
        onLogout={() => { setUser(null); setIsSettingsOpen(false); }}
        items={items}
        onRestore={handleRestoreData}
        proximityRange={proximityRange}
        onProximityRangeChange={setProximityRange}
        onRestartTour={() => {
            setIsSettingsOpen(false);
            setShowOnboarding(true);
        }}
        onReauth={handleGoogleReauth}
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
      <NotificationsModal 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearNotifications}
      />
    </div>
  );
}