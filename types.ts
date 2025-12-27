
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ItineraryItem {
  name: string;
  description?: string;
  completed?: boolean;
  coordinates?: Coordinates;
  isImportant?: boolean;
  images?: string[]; // Array of image URLs
}

export interface RoadTripDetails {
  startLocation?: string;
  startCoordinates?: Coordinates;
  stops: ItineraryItem[];
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
  itinerary?: ItineraryItem[];
  roadTrip?: RoadTripDetails;
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
  itinerary?: ItineraryItem[];
  roadTrip?: RoadTripDetails;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'location' | 'system' | 'info';
  relatedItemId?: string;
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
