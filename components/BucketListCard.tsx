
import React from 'react';
import { MapPin, Navigation, CheckCircle2, Circle, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { BucketItem, Coordinates } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';

interface BucketListCardProps {
  item: BucketItem;
  userLocation: Coordinates | null;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: BucketItem) => void;
  isCompact?: boolean;
  proximityRange?: number;
}

export const BucketListCard: React.FC<BucketListCardProps> = ({ 
  item, 
  userLocation, 
  onToggleComplete, 
  onDelete, 
  onEdit,
  isCompact = false,
  proximityRange = 10000 // Default to 10km if not provided
}) => {
  const distance = (item.coordinates && userLocation)
    ? calculateDistance(userLocation, item.coordinates)
    : null;

  const isNearby = distance !== null && distance < proximityRange;

  const handleNavigate = () => {
    if (item.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coordinates.latitude},${item.coordinates.longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className={`relative group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-300 ${isCompact ? 'p-2' : 'p-3.5'} ${isNearby ? 'border-orange-400 ring-1 ring-orange-100 dark:ring-orange-900/30' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'}`}>
      
      {/* Background Progress Bar (Optional visual flare) */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl transition-colors ${item.completed ? 'bg-red-500' : 'bg-transparent'}`} />

      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Top Row: Checkbox, Title, Category Badge */}
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
                        title={isCompact ? item.description : undefined}
                        className={`font-semibold text-lg text-gray-800 dark:text-white truncate cursor-default ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}
                    >
                    {item.title}
                    </h3>
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

          {/* Interests Tags */}
          {item.interests && item.interests.length > 0 && !isCompact && (
            <div className="flex flex-wrap gap-1.5 mb-1.5 ml-7">
                {item.interests.map(tag => (
                    <span key={tag} className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/20">
                        #{tag}
                    </span>
                ))}
            </div>
          )}

          {/* Metadata Row */}
          <div className={`flex flex-wrap items-center gap-2 ml-7 ${isCompact ? 'mt-0.5' : 'mt-2'}`}>
            {item.locationName && (
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg border border-transparent dark:border-gray-700 max-w-[150px] truncate">
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{item.locationName}</span>
              </div>
            )}
            
            {item.coordinates && (
                <div className="flex items-center gap-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg overflow-hidden border border-blue-100 dark:border-blue-900/30">
                    {/* Distance Section */}
                    {distance !== null && (
                        <div className={`flex items-center gap-1 px-2 py-1 text-xs font-bold border-r border-blue-200 dark:border-blue-800 ${isNearby ? 'text-orange-600 dark:text-orange-300' : 'text-blue-600 dark:text-blue-400'}`}>
                            {formatDistance(distance)}
                        </div>
                    )}
                    
                    {/* Navigate Button */}
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
