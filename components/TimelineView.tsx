
import React from 'react';
import { BucketItem } from '../types';
import { Plane, Mountain, Utensils, Palette, Camera, Landmark, Music, Star, Briefcase, Heart, Globe, Footprints } from 'lucide-react';

interface TimelineViewProps {
  items: BucketItem[];
  onEdit: (item: BucketItem) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ items, onEdit }) => {
  // Sort items: Oldest completed first (Chronological)
  const sortedItems = [...items].sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));

  // Group by Year
  const grouped = sortedItems.reduce((groups, item) => {
    const date = new Date(item.completedAt || item.createdAt || Date.now());
    const year = date.getFullYear();
    if (!groups[year]) groups[year] = [];
    groups[year].push(item);
    return groups;
  }, {} as Record<number, BucketItem[]>);

  const years = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const getYearColor = (year: number) => {
    const colors = [
      'bg-blue-400', 
      'bg-emerald-400', 
      'bg-cyan-400', 
      'bg-purple-400', 
      'bg-rose-400', 
      'bg-amber-400'
    ];
    return colors[year % colors.length];
  };

  const getMonthName = (ts?: number) => {
    if(!ts) return '';
    return new Date(ts).toLocaleString('default', { month: 'long' }).toUpperCase();
  };

  // Global index to ensure perfect alternation across years
  let globalIndex = 0;

  if (items.length === 0) return null;

  return (
    <div className="relative py-4 px-2 max-w-2xl mx-auto w-full">
      {/* Central Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-700 -translate-x-1/2 rounded-full" />

      {years.map((year) => (
        <div key={year} className="relative z-10 mb-8">
          {/* Year Header Pill */}
          <div className="flex justify-center mb-8">
            <span className={`px-6 py-2 rounded-full text-white font-bold text-sm shadow-md ${getYearColor(year)} ring-4 ring-gray-50 dark:ring-gray-900`}>
              {year}
            </span>
          </div>

          <div className="space-y-8">
            {grouped[year].map((item) => {
              // Alternating Logic: Even = Content Left, Odd = Content Right
              const isContentLeft = globalIndex % 2 === 0;
              globalIndex++;
              
              return (
                <div key={item.id} className="relative flex items-center justify-between w-full group">
                  
                  {/* LEFT SIDE */}
                  <div className={`w-1/2 pr-6 md:pr-10 flex flex-col ${isContentLeft ? 'items-end text-right' : 'items-end text-right'}`}>
                     {isContentLeft ? (
                         <TimelineContent item={item} onClick={() => onEdit(item)} align="right" />
                     ) : (
                         <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase py-2">
                            {getMonthName(item.completedAt)}
                         </span>
                     )}
                  </div>

                  {/* CENTER ICON */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-gray-50 dark:border-gray-900 shadow-md flex items-center justify-center transition-transform hover:scale-110 ${isContentLeft ? 'bg-white dark:bg-gray-800 text-gray-500' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>
                       <CategoryIcon category={item.category} />
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className={`w-1/2 pl-6 md:pl-10 flex flex-col ${!isContentLeft ? 'items-start text-left' : 'items-start text-left'}`}>
                    {!isContentLeft ? (
                         <TimelineContent item={item} onClick={() => onEdit(item)} align="left" />
                     ) : (
                         <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase py-2">
                            {getMonthName(item.completedAt)}
                         </span>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Footer Pill */}
       <div className="flex justify-center mt-6 relative z-10">
            <div className="px-8 py-2 rounded-full bg-slate-500 text-white font-bold text-sm shadow-md uppercase tracking-widest ring-4 ring-gray-50 dark:ring-gray-900">
              Journey So Far
            </div>
       </div>
    </div>
  );
};

const TimelineContent = ({ item, onClick, align }: { item: BucketItem, onClick: () => void, align: 'left' | 'right' }) => (
    <div 
        onClick={onClick}
        className={`cursor-pointer transition-all duration-200 p-2 -m-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 ${align === 'right' ? 'items-end' : 'items-start'}`}
    >
        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm md:text-base leading-tight hover:text-red-500 dark:hover:text-red-400 transition-colors line-clamp-2">
            {item.title}
        </h4>
        {item.locationName && (
             <span className={`text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
                {item.locationName}
             </span>
        )}
    </div>
);

const CategoryIcon = ({ category }: { category?: string }) => {
    const iconProps = { className: "w-5 h-5 md:w-6 md:h-6 stroke-[1.5]" };
    switch (category) {
        case 'Adventure': return <Mountain {...iconProps} className={`${iconProps.className} text-orange-500`} />;
        case 'Travel': return <Plane {...iconProps} className={`${iconProps.className} text-blue-500`} />;
        case 'Food': return <Utensils {...iconProps} className={`${iconProps.className} text-red-500`} />;
        case 'Culture': return <Landmark {...iconProps} className={`${iconProps.className} text-purple-500`} />;
        case 'Nature': return <Globe {...iconProps} className={`${iconProps.className} text-green-500`} />;
        case 'Luxury': return <Star {...iconProps} className={`${iconProps.className} text-yellow-500`} />;
        case 'Personal Growth': return <Heart {...iconProps} className={`${iconProps.className} text-pink-500`} />;
        case 'Music': return <Music {...iconProps} className={`${iconProps.className} text-indigo-500`} />;
        case 'Photography': return <Camera {...iconProps} className={`${iconProps.className} text-cyan-500`} />;
        case 'Art': return <Palette {...iconProps} className={`${iconProps.className} text-rose-500`} />;
        case 'Career': return <Briefcase {...iconProps} className={`${iconProps.className} text-slate-500`} />;
        default: return <Footprints {...iconProps} className={`${iconProps.className} text-gray-400`} />;
    }
};
