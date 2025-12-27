
import React from 'react';
import { MapPin, Navigation, CheckCircle2, Circle, Trash2, Pencil, Image as ImageIcon, Calendar, Sparkles, Map, Route } from 'lucide-react';
import { BucketItem, Coordinates, Theme } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';

interface BucketListCardProps {
  item: BucketItem;
  userLocation: Coordinates | null;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: BucketItem) => void;
  onViewImages: (item: BucketItem) => void;
  onCategoryClick?: (category: string) => void;
  onInterestClick?: (interest: string) => void;
  onToggleItineraryItem?: (itemId: string, index: number) => void;
  onOpenPlanner?: (item: BucketItem) => void;
  isCompact?: boolean;
  proximityRange?: number;
  theme?: Theme;
}

const CaptainAmericaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
    <circle cx="12" cy="12" r="12" fill="#B91C1C" />
    <circle cx="12" cy="12" r="9.33" fill="#FFFFFF" />
    <circle cx="12" cy="12" r="6.66" fill="#B91C1C" />
    <circle cx="12" cy="12" r="4" fill="#1D4ED8" />
    <polygon points="12,8.5 13,11 15.5,11 13.5,12.5 14,15 12,13.5 10,15 10.5,12.5 8.5,11 11,11" fill="#FFFFFF" />
  </svg>
);

const BatIcon = () => (
  <svg viewBox="0 0 100 60" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
    <ellipse cx="50" cy="30" rx="46" ry="26" fill="#FFD700" stroke="#000000" strokeWidth="3" />
    <path fill="#000000" d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" />
  </svg>
);

const ElsaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
    <circle cx="12" cy="12" r="12" fill="#06b6d4" />
    <circle cx="12" cy="12" r="10.5" fill="none" stroke="#a5f3fc" strokeWidth="0.5" />
    <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 4V20" /> <path d="M4 12H20" />
        <path d="M6.34 6.34L17.66 17.66" /> <path d="M6.34 17.66L17.66 6.34" />
        <path d="M12 4L10 6" /> <path d="M12 4L14 6" />
        <path d="M12 20L10 18" /> <path d="M12 20L14 18" />
        <path d="M4 12L6 10" /> <path d="M4 12L6 14" />
        <path d="M20 12L18 10" /> <path d="M20 12L18 14" />
        <path d="M6.34 6.34L8.5 7" /> <path d="M6.34 6.34L7 8.5" />
        <path d="M17.66 6.34L15.5 7" /> <path d="M17.66 6.34L17 8.5" />
        <path d="M6.34 17.66L8.5 17" /> <path d="M6.34 17.66L7 15.5" />
        <path d="M17.66 17.66L15.5 17" /> <path d="M17.66 17.66L17 15.5" />
    </g>
  </svg>
);

export const BucketListCard: React.FC<BucketListCardProps> = ({ 
  item, 
  userLocation, 
  onToggleComplete, 
  onDelete, 
  onEdit,
  onViewImages,
  onCategoryClick,
  onInterestClick,
  onOpenPlanner,
  isCompact = false,
  proximityRange = 10000,
  theme
}) => {
  const hasCoordinates = item.coordinates && item.coordinates.latitude !== 0 && item.coordinates.longitude !== 0;

  const distance = (hasCoordinates && userLocation && item.coordinates)
    ? calculateDistance(userLocation, item.coordinates)
    : null;

  const isNearby = distance !== null && distance < proximityRange;

  const images = item.images || [];
  const hasImage = images.length > 0;

  const handleNavigate = () => {
    if (hasCoordinates && item.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coordinates.latitude},${item.coordinates.longitude}`;
      window.open(url, '_blank');
    }
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div 
        className={`relative group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-300 overflow-visible ${isCompact ? 'p-2' : 'p-3.5'} ${isNearby ? 'border-orange-400 ring-1 ring-orange-100 dark:ring-orange-900/30' : 'border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-red-200 dark:hover:border-gray-600'}`}
    >
      
      {/* Background Progress Bar */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${item.completed ? 'bg-red-500' : 'bg-transparent'}`} />

      {/* Theme Specific Blended Icons */}
      {theme === 'marvel' && <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-20 pointer-events-none transform rotate-12 z-0"><CaptainAmericaIcon /></div>}
      {theme === 'batman' && <div className="absolute -bottom-1 -right-1 w-20 h-12 opacity-20 pointer-events-none transform -rotate-12 z-0"><BatIcon /></div>}
      {theme === 'elsa' && <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-20 pointer-events-none transform rotate-12 z-0"><ElsaIcon /></div>}

      {/* Item Type Indicator (Location Pin vs Dream Sparkle) */}
      <div className={`absolute top-0 right-0 z-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-0 ${isCompact ? 'p-1.5' : 'p-2'}`}>
        {hasCoordinates ? (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full p-1 border border-red-100 dark:border-red-800 shadow-sm">
                <MapPin className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill-current`} />
            </div>
        ) : (
            <div className="bg-purple-50 dark:bg-purple-900/30 text-purple-500 rounded-full p-1 border border-purple-100 dark:border-purple-800 shadow-sm">
                <Sparkles className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} fill-current`} />
            </div>
        )}
      </div>

      {/* Trip Planner Icon (Top Right) */}
      {hasCoordinates && onOpenPlanner && (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onOpenPlanner(item);
            }}
            className={`absolute top-2 right-9 z-20 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-sm hover:scale-110 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-all ${isCompact ? 'right-8 top-1.5 p-1' : ''}`}
            title="Plan Trip Itinerary"
        >
            <Route className={isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      )}

      <div className="flex justify-between items-start gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className={`flex items-start gap-2 ${isCompact ? 'mb-0.5' : 'mb-1.5'}`}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(item.id);
                }}
                className={`mt-1 transition-colors ${item.completed ? 'text-red-600' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
            >
                {item.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 
                        onClick={() => onEdit(item)}
                        className={`font-semibold text-lg text-gray-800 dark:text-white truncate cursor-pointer hover:text-red-600 dark:hover:text-red-400 transition-colors ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}
                    >
                    {item.title}
                    </h3>
                    
                    {item.owner && item.owner !== 'Me' && (
                        <span className="text-[9px] font-bold text-white bg-purple-500 px-1.5 py-0.5 rounded-full whitespace-nowrap" title={`Dream belongs to ${item.owner}`}>
                            {getInitials(item.owner)}
                        </span>
                    )}
                    {item.category && !isCompact && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onCategoryClick && onCategoryClick(item.category!); }}
                            className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                         >
                            <CategoryIcon category={item.category} className="w-3 h-3" />
                            {item.category}
                         </button>
                    )}
                </div>
            </div>
          </div>
          
          {!isCompact && (
              <p 
                onClick={() => onEdit(item)}
                className={`text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-1.5 ml-7 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors ${item.completed ? 'opacity-50' : ''}`}
              >
                {item.description}
              </p>
          )}

          {item.interests && item.interests.length > 0 && !isCompact && (
            <div className="flex flex-wrap gap-1.5 mb-1.5 ml-7">
                {item.interests.map(tag => (
                    <button 
                        key={tag} 
                        onClick={(e) => { e.stopPropagation(); onInterestClick && onInterestClick(tag); }}
                        className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                        #{tag}
                    </button>
                ))}
            </div>
          )}

          <div className={`flex flex-wrap items-center gap-2 ml-7 ${isCompact ? 'mt-0.5' : 'mt-2'}`}>
            {item.locationName && (
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg border border-transparent dark:border-gray-700 max-w-[150px] truncate">
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{item.locationName}</span>
              </div>
            )}

            {item.bestTimeToVisit && !isCompact && (
              <div className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/30">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[120px]">{item.bestTimeToVisit}</span>
              </div>
            )}
            
            {hasCoordinates && (
                <div className="flex items-center gap-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900/30">
                    {distance !== null && (
                        <div className={`flex items-center gap-1 px-2 py-1 text-xs font-bold border-r border-blue-200 dark:border-blue-800 ${isNearby ? 'text-orange-600 dark:text-orange-300' : 'text-blue-600 dark:text-blue-400'}`}>
                            {formatDistance(distance)}
                        </div>
                    )}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate();
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        title="Navigate"
                    >
                        <Navigation className="w-3 h-3" />
                    </button>
                </div>
            )}

            {hasImage && (
              <button 
                onClick={(e) => { e.stopPropagation(); onViewImages(item); }}
                className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                title="View Photos"
              >
                <ImageIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
            onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
            }}
            className="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 transition-all p-1.5"
            aria-label="Edit"
            >
            <Pencil className="w-4 h-4" />
            </button>
            <button 
            onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
            }}
            className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all p-1.5"
            aria-label="Delete"
            >
            <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};
