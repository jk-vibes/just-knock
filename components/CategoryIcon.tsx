
import React from 'react';
import { Mountain, Plane, Utensils, Landmark, Leaf, Star, Heart, Music, Camera, Palette, Briefcase, Footprints, Tent, Dumbbell, BookOpen, Laptop, Sofa } from 'lucide-react';

export const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Adventure': return Mountain;
        case 'Travel': return Plane;
        case 'Food': return Utensils;
        case 'Culture': return Landmark;
        case 'Nature': return Leaf;
        case 'Luxury': return Star;
        case 'Personal Growth': return Heart;
        case 'Music': return Music;
        case 'Photography': return Camera;
        case 'Art': return Palette;
        case 'Career': return Briefcase;
        case 'Camping': return Tent;
        case 'Fitness': return Dumbbell;
        case 'Education': return BookOpen;
        case 'Tech': return Laptop;
        case 'Relaxation': return Sofa;
        default: return Footprints;
    }
};

export const CategoryIcon = ({ category, className = "w-4 h-4" }: { category?: string, className?: string }) => {
    const Icon = getCategoryIcon(category || '');
    return <Icon className={className} />;
};
