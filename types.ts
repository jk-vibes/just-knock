
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BucketItem {
  id: string;
  title: string;
  description: string;
  locationName?: string;
  coordinates?: Coordinates;
  images?: string[]; // Array of image URLs
  completed: boolean;
  completedAt?: number; // Timestamp when item was completed
  createdAt: number;
  category?: string;
  interests?: string[];
  owner?: string;
  bestTimeToVisit?: string;
}

export interface BucketItemDraft {
  title: string;
  description: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  images?: string[]; // Array of image URLs
  category?: string;
  interests?: string[];
  owner?: string;
  isCompleted?: boolean;
  completedAt?: number;
  bestTimeToVisit?: string;
}

export enum AppView {
  LIST = 'LIST',
  ADD = 'ADD',
  MAP = 'MAP'
}

export type Theme = 'light' | 'dark' | 'system' | 'marvel' | 'batman' | 'elsa';

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}
