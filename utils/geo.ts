
import { Coordinates } from '../types';

// Calculate distance between two points in meters using Haversine formula
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; // metres
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

// Format distance for Text-to-Speech (full words)
export const getDistanceSpeech = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} meters`;
  }
  return `${(meters / 1000).toFixed(1)} kilometers`;
};

// Text-to-Speech function
export const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech to avoid queue buildup/overlapping
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Attempt to set a natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en'));
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

export const sendNotification = async (title: string, body: string, tag: string = 'jk-proximity') => {
  if (Notification.permission === "granted") {
    // Try to use Service Worker registration for "System" style notifications on Android
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if(registration) {
            try {
                await registration.showNotification(title, {
                    body,
                    icon: '/icon.svg',
                    badge: '/icon.svg',
                    vibrate: [200, 100, 200],
                    tag: tag
                } as any);
                return;
            } catch (e) {
                console.warn("SW Notification failed, falling back", e);
            }
        }
    }

    // Fallback for desktop or if SW fails
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: tag
    });
  }
};
