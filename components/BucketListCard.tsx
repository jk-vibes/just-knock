
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle2, Circle, Trash2, Pencil, Image as ImageIcon, Layers } from 'lucide-react';
import { BucketItem, Coordinates, Theme } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';

interface BucketListCardProps {
  item: BucketItem;
  userLocation: Coordinates | null;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: BucketItem) => void;
  onViewImages: (item: BucketItem) => void;
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
  isCompact = false,
  proximityRange = 10000,
  theme
}) => {
  const [displayImageIndex, setDisplayImageIndex] = useState(0);

  // Reset index when item images change
  useEffect(() => {
    setDisplayImageIndex(0);
  }, [item.images]);

  const distance = (item.coordinates && userLocation)
    ? calculateDistance(userLocation, item.coordinates)
    : null;

  const isNearby = distance !== null && distance < proximityRange;

  const images = item.images || [];
  const hasImages = images.length > 0;
  const imageCount = images.length;

  const handleNavigate = () => {
    if (item.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coordinates.latitude},${item.coordinates.longitude}`;
      window.open(url, '_blank');
    }
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleImageError = () => {
      // If current image fails, try the next one
      setDisplayImageIndex(prev => prev + 1);
  };

  // Determine if we have a valid image to show
  const showImage = hasImages && displayImageIndex < images.length;

  return (
    <div className={`relative group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isCompact ? 'p-2' : 'p-3.5'} ${isNearby ? 'border-orange-400 ring-1 ring-orange-100 dark:ring-orange-900/30' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'}`}>
      
      {/* Background Progress Bar */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${item.completed ? 'bg-red-500' : 'bg-transparent'}`} />

      {/* Theme Specific Blended Icons */}
      {theme === 'marvel' && <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-20 pointer-events-none transform rotate-12 z-0"><CaptainAmericaIcon /></div>}
      {theme === 'batman' && <div className="absolute -bottom-1 -right-1 w-20 h-12 opacity-20 pointer-events-none transform -rotate-12 z-0"><BatIcon /></div>}
      {theme === 'elsa' && <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-20 pointer-events-none transform rotate-12 z-0"><ElsaIcon /></div>}

      <div className="flex justify-between items-start gap-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className={`flex items-start gap-2 ${isCompact ? 'mb-0.5' : 'mb-1.5'}`}>
            <button 
                onClick={() => onToggleComplete(item.id)}
                className={`mt-1 transition-colors ${item.completed ? 'text-red-600' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
            >
                {item.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 
                        className={`font-semibold text-lg text-gray-800 dark:text-white truncate cursor-default ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}
                    >
                    {item.title}
                    </h3>
                    
                    {/* Image Icon Trigger - prominently next to title */}
                    {hasImages && showImage && (
                        <button 
                            onClick={() => onViewImages(item)}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-colors animate-in fade-in"
                            title={`View ${imageCount} Images`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{imageCount}</span>
                        </button>
                    )}

                    {item.owner && item.owner !== 'Me' && (
                        <span className="text-[9px] font-bold text-white bg-purple-500 px-1.5 py-0.5 rounded-full whitespace-nowrap" title={`Wish belongs to ${item.owner}`}>
                            {getInitials(item.owner)}
                        </span>
                    )}
                    {item.category && !isCompact && (
                         <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            {item.category}
                         </span>
                    )}
                </div>
            </div>
          </div>
          
          {!isCompact && (
              <p className={`text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-1.5 ml-7 ${item.completed ? 'opacity-50' : ''}`}>
                {item.description}
              </p>
          )}

          {item.interests && item.interests.length > 0 && !isCompact && (
            <div className="flex flex-wrap gap-1.5 mb-1.5 ml-7">
                {item.interests.map(tag => (
                    <span key={tag} className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/20">
                        #{tag}
                    </span>
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
            
            {item.coordinates && (
                <div className="flex items-center gap-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900/30">
                    {distance !== null && (
                        <div className={`flex items-center gap-1 px-2 py-1 text-xs font-bold border-r border-blue-200 dark:border-blue-800 ${isNearby ? 'text-orange-600 dark:text-orange-300' : 'text-blue-600 dark:text-blue-400'}`}>
                            {formatDistance(distance)}
                        </div>
                    )}
                    <button 
                        onClick={handleNavigate}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        title="Navigate"
                    >
                        <Navigation className="w-3 h-3" />
                        {!isCompact && "Navigate"}
                    </button>
                </div>
            )}
          </div>
        </div>
        
        {/* Right Side: Primary Thumbnail with Gallery Overlay */}
        {hasImages && !isCompact && showImage && (
            <div 
                onClick={() => onViewImages(item)}
                className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm mt-1 cursor-pointer hover:ring-2 hover:ring-red-400 transition-all relative group/img"
            >
                <img 
                    src={images[displayImageIndex]} 
                    alt={item.title} 
                    onError={handleImageError}
                    className={`w-full h-full object-cover transition-all duration-500 group-hover/img:scale-110 ${item.completed ? 'grayscale opacity-70' : 'opacity-100'}`}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <Layers className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
            </div>
        )}

        <div className="flex flex-col gap-0.5 shrink-0">
            <button 
            onClick={() => onEdit(item)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 transition-all p-1.5"
            aria-label="Edit"
            >
            <Pencil className="w-4 h-4" />
            </button>
            <button 
            onClick={() => onDelete(item.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all p-1.5"
            aria-label="Delete"
            >
            <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
};
