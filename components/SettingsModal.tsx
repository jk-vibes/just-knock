
import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, Trash2, Plus, Cloud, Upload, Download, Loader2, CheckCircle2, Eraser, Users, Database, LogOut, FileDigit, Smartphone, AlertCircle, Volume2, FileJson, FileSpreadsheet } from 'lucide-react';
import { Theme } from '../types';
import { driveService } from '../services/driveService';
import { BucketItem } from '../types';
import { sendNotification, speak } from '../utils/geo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClearData: () => void;
  onClearMockData: () => void;
  onAddMockData: () => void;
  categories: string[];
  interests: string[];
  familyMembers?: string[];
  onAddCategory: (cat: string) => void;
  onRemoveCategory: (cat: string) => void;
  onAddInterest: (int: string) => void;
  onRemoveInterest: (int: string) => void;
  onAddFamilyMember?: (name: string) => void;
  onRemoveFamilyMember?: (name: string) => void;
  onLogout: () => void;
  // Props for Backup
  items?: BucketItem[];
  onRestore?: (items: BucketItem[]) => void;
  proximityRange: number;
  onProximityRangeChange: (range: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentTheme, 
  onThemeChange, 
  onClearData,
  onClearMockData,
  onAddMockData,
  categories,
  interests,
  familyMembers = [],
  onAddCategory,
  onRemoveCategory,
  onAddInterest,
  onRemoveInterest,
  onAddFamilyMember,
  onRemoveFamilyMember,
  onLogout,
  items = [],
  onRestore,
  proximityRange,
  onProximityRangeChange
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'interests' | 'family' | 'data'>('general');
  const [newItemInput, setNewItemInput] = useState('');
  
  // Backup State
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const isGuest = !driveService.getAccessToken();

  useEffect(() => {
    if (isOpen) {
        setLastBackup(driveService.getLastBackupTime());
        setBackupStatus('idle');
        setRestoreStatus('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!newItemInput.trim()) return;
    if (activeTab === 'categories') onAddCategory(newItemInput.trim());
    if (activeTab === 'interests') onAddInterest(newItemInput.trim());
    if (activeTab === 'family' && onAddFamilyMember) onAddFamilyMember(newItemInput.trim());
    setNewItemInput('');
  };

  const handleBackup = async () => {
    if (isGuest) {
      alert("Please sign in with Google to use cloud backups.");
      return;
    }
    setBackupStatus('loading');
    const result = await driveService.backup(items);
    if (result.success) {
        setBackupStatus('success');
        setLastBackup(result.timestamp);
        // Inform user
        setTimeout(() => setBackupStatus('idle'), 3000);
    } else {
        setBackupStatus('error');
        setTimeout(() => setBackupStatus('idle'), 3000);
    }
  };

  const handleRestore = async () => {
    if (isGuest) {
      alert("Please sign in with Google to restore from cloud.");
      return;
    }
    if (!onRestore) return;
    setRestoreStatus('loading');
    const result = await driveService.restore();
    if (result.success && result.items) {
        onRestore(result.items);
        setRestoreStatus('success');
        setTimeout(() => setRestoreStatus('idle'), 3000);
    } else {
        setRestoreStatus('error');
        setTimeout(() => setRestoreStatus('idle'), 3000);
    }
  };
  
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `just_knock_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Description', 'Location', 'Latitude', 'Longitude', 'Category', 'Status', 'Completed Date', 'Owner', 'Interests'];
    const rows = items.map(item => {
      const escape = (val: string | undefined) => {
        if (!val) return '';
        return `"${String(val).replace(/"/g, '""')}"`;
      };
      
      const status = item.completed ? 'Completed' : 'Pending';
      const completedDate = item.completedAt ? new Date(item.completedAt).toISOString().split('T')[0] : '';
      const interests = item.interests ? item.interests.join(';') : '';
      
      return [
        escape(item.id),
        escape(item.title),
        escape(item.description),
        escape(item.locationName),
        item.coordinates?.latitude || '',
        item.coordinates?.longitude || '',
        escape(item.category),
        escape(status),
        escape(completedDate),
        escape(item.owner),
        escape(interests)
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `just_knock_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestNotification = () => {
    const title = "Test Notification 📍";
    const body = "Knock Knock! This is a test for your bucket list radar.";
    sendNotification(title, body, 'test-radar');
    speak(body);
    alert("Sent! Check your notification center and ensure sound is on.");
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper for Theme Options
  const renderThemeOption = (theme: Theme, label: string, icon: React.ReactNode, colorClass: string) => (
      <button 
        key={theme}
        onClick={() => onThemeChange(theme)}
        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
          currentTheme === theme 
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 scale-105' 
            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${colorClass}`}>
            {icon}
        </div>
        <span className="text-xs font-medium capitalize truncate w-full text-center">{label}</span>
      </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm h-[600px] max-h-[90vh] flex flex-col shadow-2xl scale-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab('family')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'family' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Family
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Categories
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'interests' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Interests
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'data' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Data
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-grow">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Appearance */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</h3>
                <div className="grid grid-cols-3 gap-3">
                    {renderThemeOption('light', 'Light', <Sun className="w-5 h-5 text-yellow-500" />, 'bg-yellow-100')}
                    {renderThemeOption('dark', 'Dark', <Moon className="w-5 h-5 text-indigo-500" />, 'bg-indigo-100')}
                    {renderThemeOption('system', 'System', <Monitor className="w-5 h-5 text-gray-500" />, 'bg-gray-100')}
                    
                    {renderThemeOption('marvel', 'Marvel', 
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                            <circle cx="12" cy="12" r="12" fill="#B91C1C" />
                            <circle cx="12" cy="12" r="9.33" fill="#FFFFFF" />
                            <circle cx="12" cy="12" r="6.66" fill="#B91C1C" />
                            <circle cx="12" cy="12" r="4" fill="#1D4ED8" />
                            <polygon points="12,8.5 13,11 15.5,11 13.5,12.5 14,15 12,13.5 10,15 10.5,12.5 8.5,11 11,11" fill="#FFFFFF" />
                        </svg>, 
                        'bg-red-100'
                    )}
                    
                    {renderThemeOption('batman', 'Batman', 
                        <div className="w-full h-full flex items-center justify-center p-0.5">
                           <svg viewBox="0 0 100 60" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                <ellipse cx="50" cy="30" rx="46" ry="26" fill="#FFD700" stroke="#000000" strokeWidth="3" />
                                <path fill="#000000" d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" />
                            </svg>
                        </div>, 
                        'bg-gray-800'
                    )}
                    
                    {renderThemeOption('elsa', 'Frozen', 
                         <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                            <circle cx="12" cy="12" r="12" fill="#06b6d4" />
                            <circle cx="12" cy="12" r="10.5" fill="none" stroke="#a5f3fc" strokeWidth="0.5" />
                            <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M12 4V20" />
                                <path d="M4 12H20" />
                                <path d="M6.34 6.34L17.66 17.66" />
                                <path d="M6.34 17.66L17.66 6.34" />
                                <path d="M12 4L10 6" /> <path d="M12 4L14 6" />
                                <path d="M12 20L10 18" /> <path d="M12 20L14 18" />
                                <path d="M4 12L6 10" /> <path d="M4 12L6 14" />
                                <path d="M20 12L18 10" /> <path d="M20 12L18 14" />
                                <path d="M6.34 6.34L8.5 7" /> <path d="M6.34 6.34L7 8.5" />
                                <path d="M17.66 6.34L15.5 7" /> <path d="M17.66 6.34L17 8.5" />
                                <path d="M6.34 17.66L8.5 17" /> <path d="M6.34 17.66L7 15.5" />
                                <path d="M17.66 17.66L15.5 17" /> <path d="M17.66 17.66L17 15.5" />
                            </g>
                        </svg>, 
                        'bg-cyan-100'
                    )}
                </div>
              </div>

               {/* Radar Settings */}
               <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Radar Settings</h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Proximity Range</label>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{(proximityRange / 1000).toFixed(1)} km</span>
                        </div>
                        <input
                            type="range"
                            min="1000"
                            max="50000"
                            step="500"
                            value={proximityRange}
                            onChange={(e) => onProximityRangeChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Notify when nearby a bucket item.
                            </p>
                            <button 
                                onClick={handleTestNotification}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            >
                                <Volume2 className="w-3 h-3" /> Test
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {(activeTab === 'categories' || activeTab === 'interests' || activeTab === 'family') && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder={
                    activeTab === 'family' ? 'Family Member Name' :
                    `Add ${activeTab === 'categories' ? 'Category' : 'Interest'}`
                  }
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  className="flex-grow p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button 
                  onClick={handleAddItem}
                  disabled={!newItemInput.trim()}
                  className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {activeTab === 'family' && (
                 <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add family members to assign buckets to them. Use the filter on the home screen to view their specific lists.
                 </p>
              )}

              <div className="space-y-2">
                {(activeTab === 'family' ? familyMembers : activeTab === 'categories' ? categories : interests).map(item => (
                  <div key={item} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                    <div className="flex items-center gap-3">
                         {activeTab === 'family' && (
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold border border-purple-200 dark:border-purple-800">
                                {getInitials(item)}
                            </div>
                         )}
                         <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                    </div>
                    <button 
                      onClick={() => {
                          if (activeTab === 'family' && onRemoveFamilyMember) onRemoveFamilyMember(item);
                          if (activeTab === 'categories') onRemoveCategory(item);
                          if (activeTab === 'interests') onRemoveInterest(item);
                      }}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
             <div className="space-y-6">
                 {/* Cloud Backup Section */}
                 <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cloud Backup</h3>
                    
                    {isGuest && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl mb-4 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Please Sign-In with Google to enable cloud features.
                      </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-3">
                        <div className="flex items-start gap-3">
                            <Cloud className="w-6 h-6 text-blue-500 mt-1" />
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Google Drive</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                    Securely store your dreams in the cloud.
                                </p>
                                {lastBackup && (
                                    <p className="text-[10px] text-blue-500 mt-2 font-medium">Last synced: {new Date(lastBackup).toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleBackup}
                            disabled={backupStatus === 'loading' || isGuest}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium hover:border-blue-500 dark:hover:border-blue-500 transition-all group disabled:opacity-50"
                        >
                            {backupStatus === 'loading' ? (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            ) : backupStatus === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : backupStatus === 'error' ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                                <Upload className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
                            )}
                            <span className={`text-xs ${backupStatus === 'success' ? 'text-green-600' : backupStatus === 'error' ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`}>
                                {backupStatus === 'success' ? 'Backed Up' : backupStatus === 'error' ? 'Failed' : 'Backup'}
                            </span>
                        </button>

                        <button
                            onClick={handleRestore}
                            disabled={restoreStatus === 'loading' || isGuest}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium hover:border-green-500 dark:hover:border-green-500 transition-all group disabled:opacity-50"
                        >
                            {restoreStatus === 'loading' ? (
                                <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                            ) : restoreStatus === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : restoreStatus === 'error' ? (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                                <Download className="w-5 h-5 text-gray-500 group-hover:text-green-500" />
                            )}
                            <span className={`text-xs ${restoreStatus === 'success' ? 'text-green-600' : restoreStatus === 'error' ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`}>
                                {restoreStatus === 'success' ? 'Restored' : restoreStatus === 'error' ? 'Failed' : 'Restore'}
                            </span>
                        </button>
                    </div>
                 </div>

                 {/* Export Section */}
                 <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Export Data</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleExportJSON}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl font-medium transition-colors"
                        >
                            <FileJson className="w-5 h-5" />
                            <span className="text-xs">Export JSON</span>
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl font-medium transition-colors"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            <span className="text-xs">Export CSV</span>
                        </button>
                    </div>
                 </div>

                 <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Local Data</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                            onClick={() => {
                                if(window.confirm("Add 100+ sample bucket list items to your list? This will append to your current list.")) {
                                    onAddMockData();
                                    onClose();
                                }
                            }}
                            className="w-full flex flex-col items-center justify-center gap-2 p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl font-medium transition-colors text-center"
                            >
                                <Database className="w-5 h-5" />
                                <span className="text-xs">Add Mock Data</span>
                            </button>

                            <button 
                            onClick={() => {
                                if(window.confirm("Remove all sample data (mock items)? Your personal items will be kept.")) {
                                    onClearMockData();
                                    onClose(); 
                                }
                            }}
                            className="w-full flex flex-col items-center justify-center gap-2 p-3 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl font-medium transition-colors text-center"
                            >
                                <Eraser className="w-5 h-5" />
                                <span className="text-xs">Clear Mock Data</span>
                            </button>
                        </div>
                        
                        <button 
                        onClick={() => {
                            if(window.confirm("Are you sure you want to delete ALL items? This cannot be undone.")) {
                                onClearData();
                                onClose();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl font-medium transition-colors"
                        >
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                        </button>
                    </div>
                 </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
