import { BucketItem } from "../types";

const CLOUD_META_KEY = 'jk_cloud_meta';
const FILE_NAME = 'jk_bucket_list_backup.json';

// In-memory storage for the session's access token.
// In a production app, you might use more robust state management or handle token expiry/refresh.
let accessToken: string | null = localStorage.getItem('jk_drive_token');

export const driveService = {
  setAccessToken: (token: string) => {
    accessToken = token;
    localStorage.setItem('jk_drive_token', token);
  },

  backup: async (items: BucketItem[]): Promise<{ success: boolean; timestamp: string }> => {
    if (!accessToken) return { success: false, timestamp: '' };

    try {
      // 1. Search for existing file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false&fields=files(id)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!searchResponse.ok) throw new Error("Search failed");
      
      const searchData = await searchResponse.json();
      const fileId = searchData.files?.[0]?.id;

      const timestamp = new Date().toISOString();
      const fileContent = JSON.stringify(items);
      
      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
        description: `Just Knock Backup - ${timestamp}`
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      let response;
      if (fileId) {
        // Update existing file
        response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        });
      } else {
        // Create new file
        response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        });
      }

      if (!response.ok) throw new Error("Upload failed");

      // Update local metadata
      localStorage.setItem(CLOUD_META_KEY, timestamp);
      return { success: true, timestamp };
    } catch (e) {
      console.error("Backup failed:", e);
      return { success: false, timestamp: '' };
    }
  },

  restore: async (): Promise<{ success: boolean; items?: BucketItem[]; timestamp?: string }> => {
    if (!accessToken) return { success: false };

    try {
      // 1. Find the file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false&fields=files(id, modifiedTime)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!searchResponse.ok) throw new Error("Search failed");

      const searchData = await searchResponse.json();
      const file = searchData.files?.[0];

      if (!file) {
        console.log("No backup file found");
        return { success: false };
      }

      // 2. Download content
      const contentResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!contentResponse.ok) throw new Error("Download failed");

      const items = await contentResponse.json();
      
      return { 
        success: true, 
        items, 
        timestamp: file.modifiedTime 
      };
    } catch (e) {
      console.error("Restore failed:", e);
      return { success: false };
    }
  },

  getLastBackupTime: (): string | null => {
    return localStorage.getItem(CLOUD_META_KEY);
  }
};