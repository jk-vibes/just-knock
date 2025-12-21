
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Layers } from 'lucide-react';
import { BucketItem } from '../types';

interface ImageGalleryModalProps {
  item: BucketItem | null;
  onClose: () => void;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ item, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset index when opening a new item
    setCurrentIndex(0);
  }, [item?.id]);

  if (!item) return null;

  const images = item.images || [];

  if (images.length === 0) return null;

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIndex];

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg animate-in fade-in duration-300"
        onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-20">
          <div className="flex items-center gap-3 text-white">
              <Layers className="w-5 h-5 text-red-500" />
              <div>
                  <h3 className="font-bold text-sm md:text-base leading-tight">{item.title}</h3>
                  <p className="text-[10px] text-white/60 tracking-wider uppercase font-medium">{item.locationName || 'Travel Inspiration'}</p>
              </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
      </div>

      <div className="w-full h-full flex flex-col justify-center items-center p-4 relative" onClick={onClose}>
        {/* Main Image Container */}
        <div 
            className="relative w-full max-w-5xl max-h-[75vh] flex items-center justify-center group"
            onClick={(e) => e.stopPropagation()}
        >
            <img 
                key={currentImage}
                src={currentImage} 
                alt={`${item.title} - image ${currentIndex + 1}`} 
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-300"
            />
            
            {/* Image Counter Overlay */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-md border border-white/20">
                {currentIndex + 1} / {images.length}
            </div>

            {/* Navigation Arrows */}
            {images.length > 1 && (
                <>
                    <button 
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white border border-white/10 opacity-0 group-hover:opacity-100 md:opacity-100 transition-all hover:bg-black/60 hover:scale-110 active:scale-95"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white border border-white/10 opacity-0 group-hover:opacity-100 md:opacity-100 transition-all hover:bg-black/60 hover:scale-110 active:scale-95"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                </>
            )}
        </div>

        {/* Caption Area */}
        <div className="mt-8 text-center text-white/90 max-w-2xl px-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs md:text-sm font-medium leading-relaxed italic opacity-80">
                "{item.description}"
            </p>
        </div>

        {/* Thumbnails Bar */}
        {images.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 p-2 px-6 overflow-x-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
                {images.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`relative w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 shrink-0 ${
                            idx === currentIndex 
                                ? 'border-red-500 scale-110 shadow-lg shadow-red-500/30' 
                                : 'border-white/10 opacity-40 hover:opacity-100 hover:scale-105'
                        }`}
                    >
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        {idx === currentIndex && (
                             <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                                 <Maximize2 className="w-4 h-4 text-white" />
                             </div>
                        )}
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
