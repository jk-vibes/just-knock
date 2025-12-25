
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Radar, ListChecks, Map as MapIcon, Loader, Zap, Settings, Filter, CheckCircle2, Circle, LayoutList, AlignJustify, List, Users, LogOut, Clock, Search, X, ArrowLeft, Trophy, Bell, Tag } from 'lucide-react';
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

// --- LIQUID BUCKET COMPONENT ---
const LiquidBucket = ({ 
    text, 
    className = "w-10 h-10", 
    hideText = false,
    frontColor,
    backColor,
    outlineColor
}: { 
    text: string, 
    className?: string, 
    hideText?: boolean,
    frontColor?: string,
    backColor?: string,
    outlineColor?: string
}) => (
    <svg viewBox="0 0 512 512" className={`${className} filter drop-shadow-sm transition-transform hover:scale-110 duration-300`}>
        <defs>
            <clipPath id={`bucket-clip-${text}`}>
                 <path d="M56 160l40 320h320l40-320Z" />
            </clipPath>
        </defs>
        
        {/* Handle */}
        <path d="M56 160c0-100 400-100 400 0" stroke={outlineColor || "currentColor"} strokeWidth="30" strokeLinecap="round" fill="none" />
        
        {/* Liquid Group - Approx 70% Fill (Y start ~230) */}
        <g clipPath={`url(#bucket-clip-${text})`}>
             {/* Back Wave */}
             <path fill={backColor || "currentColor"} opacity="0.5" d="M0 230 Q 128 190 256 230 T 512 230 V 512 H 0 Z">
                  <animate attributeName="d" dur="3s" repeatCount="indefinite"
                     values="
                     M0 230 Q 128 190 256 230 T 512 230 V 512 H 0 Z;
                     M0 230 Q 128 270 256 230 T 512 230 V 512 H 0 Z;
                     M0 230 Q 128 190 256 230 T 512 230 V 512 H 0 Z" 
                 />
             </path>
             {/* Front Wave */}
             <path fill={frontColor || "currentColor"} opacity="0.8" d="M0 250 Q 128 290 256 250 T 512 250 V 512 H 0 Z">
                  <animate attributeName="d" dur="2s" repeatCount="indefinite"
                     values="
                     M0 250 Q 128 290 256 250 T 512 250 V 512 H 0 Z;
                     M0 250 Q 128 210 256 250 T 512 250 V 512 H 0 Z;
                     M0 250 Q 128 290 256 250 T 512 250 V 512 H 0 Z" 
                 />
             </path>
        </g>

        {/* Body Outline (drawn over liquid to keep crisp edges) */}
        <path d="M56 160l40 320h320l40-320Z" stroke={outlineColor || "currentColor"} strokeWidth="30" strokeLinejoin="round" fill="none" />
        
        {/* Text */}
        {!hideText && (
            <text x="256" y="420" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize={text.length > 1 ? "160" : "280"} fill="white" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                {text}
            </text>
        )}
    </svg>
);

// Custom Bucket Logo Component - JK Design with Text
const BucketLogo = ({ onClickVersion, outlineColor }: { onClickVersion: () => void, outlineColor: string }) => (
    <div className="flex flex-col items-start justify-center">
        <div className="flex items-center gap-2">
            <div className="text-red-500 dark:text-red-500">
                <LiquidBucket 
                    text="JK" 
                    className="w-10 h-10" 
                    outlineColor={outlineColor} 
                    frontColor="#ff4d4d" 
                />
            </div>
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
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [locating, setLocating] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
  });
  
  // Onboarding Tour State
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check onboarding status on mount or login
  useEffect(() => {
      if (user) {
          const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
          if (!hasCompleted) {
              // Short delay to allow UI to settle
              const timer = setTimeout(() => setShowOnboarding(true), 1000);
              return () => clearTimeout(timer);
          }
      }
  }, [user]);

  // System Theme Tracking
  const [isSystemDark, setIsSystemDark] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Calculate Dynamic Outline Color based on Theme
  const getThemeOutlineColor = () => {
    if (theme === 'marvel') return '#ef4444'; // Red
    if (theme === 'batman') return '#FFD700'; // Yellow
    if (theme === 'elsa') return '#22d3ee'; // Light Blue
    if (theme === 'light') return '#000000'; // Black
    if (theme === 'dark') return '#ffffff'; // White
    
    // System Fallback
    const isDark = theme === 'system' ? isSystemDark : false;
    return isDark ? '#ffffff' : '#000000';
  };

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterOwner, setFilterOwner] = useState<string | null>(null); // null = All
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterInterest, setFilterInterest] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  // Edit/Action State
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [completingItem, setCompletingItem] = useState<BucketItem | null>(null);
  const [activeToast, setActiveToast] = useState<{
      title: string; 
      message: string;
      action?: { label: string; onClick: () => void };
  } | null>(null);

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

  useEffect(() => {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  }, [notifications]);

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

  // Helper to Add Notification to State
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
      setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
  }, []);

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
                    const title = `Nearby: ${item.title}`;
                    const body = `${item.description}\nDistance: ${formatDistance(dist)}`;
                    
                    // 1. System Notification
                    sendNotification(title, body, `jk-item-${item.id}`);
                    
                    // 2. Audio Notification (TTS)
                    const distSpeech = getDistanceSpeech(dist);
                    const audioText = `Knock Knock! You are nearby ${item.title}. It is ${distSpeech} away. ${item.description}`;
                    speak(audioText);
                    
                    // 3. Add to History
                    addAppNotification(title, body, 'location', item.id);

                    // 4. In-App Toast
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
  }, [isRadarOn, addAppNotification]); // Minimal dependencies to ensure watcher stability

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
                completedAt: draft.isCompleted ? draft.completedAt : (draft.isCompleted === false ? undefined : item.completedAt),
                bestTimeToVisit: draft.bestTimeToVisit
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
        bestTimeToVisit: draft.bestTimeToVisit
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
      if (filterCategory === category) {
          setFilterCategory(null);
      } else {
          setFilterCategory(category);
      }
      triggerHaptic('light');
      // If we are in Map view, switch to list to see filtered results clearly
      if (activeTab === 'map') setActiveTab('list');
  };

  const handleInterestClick = (interest: string) => {
      if (filterInterest === interest) {
          setFilterInterest(null);
      } else {
          setFilterInterest(interest);
      }
      triggerHaptic('light');
      if (activeTab === 'map') setActiveTab('list');
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

  // Notification Badge Count
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Determine fill color (Done items) based on theme
  const getFillColor = () => {
      if (theme === 'batman') return '#fbbf24'; // amber-400
      if (theme === 'elsa') return '#06b6d4'; // cyan-500
      return '#86efac'; // requested Light Green for default (#4ade80 also good, but 86efac is lighter)
  };

  // Determine background color (Pending items) based on theme
  const getPendingColor = () => {
      if (theme === 'batman') return '#374151'; // gray-700
      if (theme === 'elsa') return '#cffafe'; // cyan-100
      return '#fca5a5'; // requested Light Red for default
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

    // 4. Category Filter
    if (filterCategory && item.category !== filterCategory) return false;

    // 5. Interest Filter
    if (filterInterest) {
        if (!item.interests || !item.interests.includes(filterInterest)) return false;
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
                    onRestartTour={() => {}}
                />
            </div>
            <LoginScreen onLogin={(u) => { triggerHaptic('success'); setUser(u); }} />
        </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] dark:bg-gray-900 transition-colors duration-300 flex flex-col relative">
      
      {/* Onboarding Tour */}
      <OnboardingTour 
        isActive={showOnboarding}
        onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem(ONBOARDING_KEY, 'true');
        }}
      />

      {/* In-App Notification Toast */}
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

      {/* Header */}
      <header className="flex-none z-30 border-b border-red-100/50 dark:border-gray-800 shadow-sm backdrop-blur-md bg-white/90 dark:bg-gray-900/90 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BucketLogo onClickVersion={() => setIsChangelogOpen(true)} outlineColor="#ef4444" />
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                data-tour="radar-btn"
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

              {/* Notification Bell */}
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
                   <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
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
            
            {/* Active Filters Bar */}
            {(searchQuery || filterCategory || filterInterest) && (
                <div className="px-1 mb-2 animate-in fade-in slide-in-from-top-2 flex flex-wrap gap-2">
                    {searchQuery && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30">
                            <Search className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-bold text-red-900 dark:text-red-100 max-w-[150px] truncate">
                                "{searchQuery}"
                            </span>
                            <button 
                                onClick={() => { setSearchQuery(''); triggerHaptic('light'); }}
                                className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {filterCategory && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                            <CategoryIcon category={filterCategory} className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-bold text-blue-900 dark:text-blue-100">
                                {filterCategory}
                            </span>
                            <button 
                                onClick={() => { setFilterCategory(null); triggerHaptic('light'); }}
                                className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {filterInterest && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/30">
                            <Tag className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs font-bold text-green-900 dark:text-green-100">
                                {filterInterest}
                            </span>
                            <button 
                                onClick={() => { setFilterInterest(null); triggerHaptic('light'); }}
                                className="p-0.5 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 text-green-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Progress Meter / Slider */}
            {totalItems > 0 && activeTab === 'list' && !searchQuery && !filterCategory && !filterInterest && (
                <div className="px-1 mb-2 animate-in fade-in duration-500">
                    <div 
                        className="relative h-6 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-gray-600"
                        style={{ backgroundColor: getPendingColor() }}
                    >
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
                            <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-900 mix-blend-normal">
                                <Trophy className="w-3 h-3" />
                                <span>{completedGlobalCount} Done</span>
                            </div>
                            <span className="text-gray-800 dark:text-gray-900 opacity-90">
                                {globalPendingCount} Dreaming
                            </span>
                        </div>
                        {/* Centered % (Optional) */}
                         <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                            <span className="text-[9px] font-black text-black/20 dark:text-black/30 drop-shadow-sm">{Math.round(progressMeter)}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls Toolbar: View Mode + Filters */}
            <div className="flex flex-wrap gap-2 justify-between items-center px-1 mb-2">
                
                <div className="flex items-center gap-2">
                    {/* View Switcher (List/Map) + Search */}
                    <div data-tour="view-toggle" className="flex gap-0.5 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
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
                        
                        <div className="w-px bg-gray-100 dark:bg-gray-700 mx-0.5 my-1"></div>

                        <button
                            onClick={() => {
                                setIsSearchOpen(!isSearchOpen);
                                triggerHaptic('medium');
                            }}
                            className={`p-1.5 rounded-md transition-all ${isSearchOpen || searchQuery ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title="Search"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
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

                        {/* Status Filter Tabs + Compact Toggle */}
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

                            <div className="w-px bg-gray-100 dark:bg-gray-700 mx-0.5 my-1"></div>

                            <button
                                onClick={() => { setIsCompact(!isCompact); triggerHaptic('light'); }}
                                className={`px-2 py-1.5 rounded-md transition-all flex items-center justify-center ${isCompact ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                title="Compact View"
                            >
                                <AlignJustify className="w-4 h-4" />
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
                                            {searchQuery || filterCategory || filterInterest ? 'No matching dreams found.' : 'Your list is empty. Start dreaming!'}
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
                                            onCategoryClick={handleCategoryClick}
                                            onInterestClick={handleInterestClick}
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

      {/* Tiny Overlay Popup for Search (Only Input) */}
      {isSearchOpen && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md animate-in slide-in-from-top-4 duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-3 border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                  <Search className="w-5 h-5 text-gray-400 ml-1" />
                  <input 
                      autoFocus
                      type="text" 
                      placeholder="Search dreams, locations..." 
                      value={searchQuery}
                      onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if(activeTab !== 'list') setActiveTab('list');
                      }}
                      className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium"
                  />
                  {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                          <X className="w-4 h-4" />
                      </button>
                  )}
                  <button 
                    onClick={() => setIsSearchOpen(false)} 
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                      Done
                  </button>
              </div>
          </div>
      )}

      {/* Floating Action Button (FAB) */}
      {!isSearchOpen && (
        <button
            data-tour="add-btn"
            onClick={() => {
                setIsAddModalOpen(true);
                triggerHaptic('medium');
            }}
            className="fixed bottom-4 right-4 z-40 group"
            aria-label="Add Dream"
        >
             <div className="relative flex items-center justify-center">
                {/* Bucket Icon - Increased Size */}
                <div className={`transition-transform duration-300 group-hover:-rotate-12 group-active:scale-95 filter drop-shadow-xl ${theme === 'elsa' ? 'text-cyan-500' : 'text-[#ff0000] dark:text-[#ff0000]'}`}>
                    <LiquidBucket 
                        text="fab" 
                        hideText={true} 
                        className="w-20 h-20"
                        frontColor={theme === 'elsa' ? "#67e8f9" : "#ff4d4d"} // Cyan-300 for Elsa, Red for others
                        backColor={theme === 'elsa' ? "#22d3ee" : "#39e75f"}  // Cyan-400 for Elsa, Green for others
                        outlineColor={theme === 'elsa' ? "#06b6d4" : "#FF0000"} // Cyan-500 for Elsa, Red for others
                    />
                </div>
                
                {/* Plus Badge */}
                <div className="absolute top-0 right-0 translate-x-1 translate-y-1 bg-white dark:bg-gray-800 text-red-600 rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-red-100 dark:border-gray-700">
                    <Plus className="w-5 h-5 stroke-[4]" />
                </div>
            </div>

            <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Add Dream
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
        onRestartTour={() => {
            setIsSettingsOpen(false);
            setTimeout(() => setShowOnboarding(true), 300);
        }}
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

      <NotificationsModal 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearNotifications}
      />

      <ImageGalleryModal
        item={viewingItemImages}
        onClose={() => setViewingItemImages(null)}
      />

    </div>
  );
}
