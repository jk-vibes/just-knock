import { BucketItem } from "../types";

const CLOUD_STORAGE_KEY = 'jk_cloud_backup';
const CLOUD_META_KEY = 'jk_cloud_meta';

export const driveService = {
  // Simulate backing up to Google Drive
  backup: async (items: BucketItem[]): Promise<{ success: boolean; timestamp: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const timestamp = new Date().toISOString();
          localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(items));
          localStorage.setItem(CLOUD_META_KEY, timestamp);
          resolve({ success: true, timestamp });
        } catch (e) {
          resolve({ success: false, timestamp: '' });
        }
      }, 2000); // Simulate network delay
    });
  },

  // Simulate restoring from Google Drive
  restore: async (): Promise<{ success: boolean; items?: BucketItem[]; timestamp?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const data = localStorage.getItem(CLOUD_STORAGE_KEY);
          const timestamp = localStorage.getItem(CLOUD_META_KEY);
          
          if (data) {
            resolve({ 
              success: true, 
              items: JSON.parse(data), 
              timestamp: timestamp || new Date().toISOString() 
            });
          } else {
            resolve({ success: false });
          }
        } catch (e) {
          resolve({ success: false });
        }
      }, 2000); // Simulate network delay
    });
  },

  getLastBackupTime: (): string | null => {
    return localStorage.getItem(CLOUD_META_KEY);
  }
};