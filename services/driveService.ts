
import { BucketItem } from "../types";

const CLOUD_META_KEY = 'jk_cloud_meta';
const FILE_NAME = 'jk_bucket_list_backup.json';

// Persistent token storage
let accessToken: string | null = localStorage.getItem('jk_drive_token');

export const driveService = {
  setAccessToken: (token: string) => {
    accessToken = token;
    localStorage.setItem('jk_drive_token', token);
  },

  getAccessToken: () => accessToken,

  backup: async (items: BucketItem[]): Promise<{ success: boolean; timestamp: string }> => {
    if (!accessToken) {
      console.error("No access token available for backup");
      return { success: false, timestamp: '' };
    }

    try {
      // 1. Search for existing file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false&fields=files(id)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!searchResponse.ok) {
        if (searchResponse.status === 401) throw new Error("Unauthorized: Please sign in again.");
        throw new Error(`Search failed: ${searchResponse.statusText}`);
      }
      
      const searchData = await searchResponse.json();
      const fileId = searchData.files?.[0]?.id;

      const timestamp = new Date().toISOString();
      const fileContent = JSON.stringify(items);
      
      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
        description: `Just Knock Backup - ${timestamp}`
      };

      // Constructing manual multipart/related body
      const boundary = 'foo_bar_baz';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      let response;
      const url = fileId 
        ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

      response = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Drive upload error details:", errData);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Update local metadata
      localStorage.setItem(CLOUD_META_KEY, timestamp);
      return { success: true, timestamp };
    } catch (e) {
      console.error("Backup failed:", e);
      alert(e instanceof Error ? e.message : "Backup failed. Ensure Google Drive API is enabled in your Google Console.");
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
        alert("No backup file found in your Google Drive.");
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
