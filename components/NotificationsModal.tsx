
import React from 'react';
import { X, Bell, MapPin, Info, CheckCheck, Trash2, Clock } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAllRead,
  onClearAll 
}) => {
  if (!isOpen) return null;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // If less than 24 hours, show relative time or time string
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'location': return <MapPin className="w-5 h-5 text-white" />;
      case 'system': return <Bell className="w-5 h-5 text-white" />;
      default: return <Info className="w-5 h-5 text-white" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'location': return 'bg-blue-500';
      case 'system': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm h-[70vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <button 
              onClick={onMarkAllRead}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
            <button 
              onClick={onClearAll}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No notifications yet.</p>
              <p className="text-xs mt-1 opacity-70">Nearby alerts and reminders will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  {!notif.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500"></div>
                  )}
                  
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center shadow-sm ${getIconBg(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start pr-4">
                        <h4 className={`text-sm ${!notif.read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                          {notif.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-medium">{formatTime(notif.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
