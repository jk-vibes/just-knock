import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, Trash2, Plus, Cloud, Upload, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Theme } from '../types';
import { driveService } from '../services/driveService';
import { BucketItem } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClearData: () => void;
  categories: string[];
  interests: string[];
  onAddCategory: (cat: string) => void;
  onRemoveCategory: (cat: string) => void;
  onAddInterest: (int: string) => void;
  onRemoveInterest: (int: string) => void;
  onLogout: () => void;
  // Props for Backup (passed from App generally, but we can read local storage here for simplicity in backup)
  items?: BucketItem[];
  onRestore?: (items: BucketItem[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentTheme, 
  onThemeChange, 
  onClearData,
  categories,
  interests,
  onAddCategory,
  onRemoveCategory,
  onAddInterest,
  onRemoveInterest,
  onLogout,
  items = [],
  onRestore
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'interests' | 'backup'>('general');
  const [newItemInput, setNewItemInput] = useState('');
  
  // Backup State
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<string | null>(null);

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
    setNewItemInput('');
  };

  const handleBackup = async () => {
    setBackupStatus('loading');
    const result = await driveService.backup(items);
    if (result.success) {
        setBackupStatus('success');
        setLastBackup(result.timestamp);
    } else {
        setBackupStatus('error');
    }
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    setRestoreStatus('loading');
    const result = await driveService.restore();
    if (result.success && result.items) {
        onRestore(result.items);
        setRestoreStatus('success');
    } else {
        setRestoreStatus('error');
    }
  };

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
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Backup
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-grow">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Appearance */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Appearance</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as Theme[]).map(t => (
                    <button 
                      key={t}
                      onClick={() => onThemeChange(t)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        currentTheme === t 
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t === 'light' ? <Sun className="w-6 h-6" /> : t === 'dark' ? <Moon className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                      <span className="text-xs font-medium capitalize">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account & Data</h3>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 p-3 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Sign Out
                </button>
                <button 
                  onClick={() => {
                    if(window.confirm("Are you sure you want to delete all items? This cannot be undone.")) {
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
          )}

          {(activeTab === 'categories' || activeTab === 'interests') && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder={`Add ${activeTab === 'categories' ? 'Category' : 'Interest'}`}
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  className="flex-grow p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500"
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

              <div className="space-y-2">
                {(activeTab === 'categories' ? categories : interests).map(item => (
                  <div key={item} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                    <span className="text-sm text-gray-700 dark:text-gray-200">{item}</span>
                    <button 
                      onClick={() => activeTab === 'categories' ? onRemoveCategory(item) : onRemoveInterest(item)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
             <div className="space-y-6">
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <Cloud className="w-6 h-6 text-blue-500 mt-1" />
                        <div>
                            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Google Drive Backup</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                Securely store your dreams in the cloud. We use your private Google Drive app folder.
                            </p>
                            {lastBackup && (
                                <p className="text-[10px] text-blue-500 mt-2 font-medium">Last synced: {new Date(lastBackup).toLocaleString()}</p>
                            )}
                        </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <button
                        onClick={handleBackup}
                        disabled={backupStatus === 'loading'}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                    >
                         {backupStatus === 'loading' ? (
                             <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                         ) : backupStatus === 'success' ? (
                             <CheckCircle2 className="w-5 h-5 text-green-500" />
                         ) : (
                             <Upload className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
                         )}
                         <span className={backupStatus === 'success' ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}>
                             {backupStatus === 'success' ? 'Backup Complete' : 'Back up to Cloud'}
                         </span>
                    </button>

                    <button
                        onClick={handleRestore}
                        disabled={restoreStatus === 'loading'}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-medium hover:border-green-500 dark:hover:border-green-500 transition-all group"
                    >
                         {restoreStatus === 'loading' ? (
                             <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                         ) : restoreStatus === 'success' ? (
                             <CheckCircle2 className="w-5 h-5 text-green-500" />
                         ) : (
                             <Download className="w-5 h-5 text-gray-500 group-hover:text-green-500" />
                         )}
                         <span className={restoreStatus === 'success' ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'}>
                             {restoreStatus === 'success' ? 'Restored Successfully' : 'Restore from Cloud'}
                         </span>
                    </button>
                 </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
