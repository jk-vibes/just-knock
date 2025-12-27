
import React, { useState } from 'react';
import { X, CheckCircle2, Rocket, Map, Cloud, Sparkles, History, Users, Star, Image as ImageIcon } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'highlights' | 'history'>('highlights');

  if (!isOpen) return null;

  const features = [
    {
        icon: <Map className="w-5 h-5 text-blue-500" />,
        title: "Extended Itineraries",
        desc: "Now generates up to 30 top places for city destinations with AI."
    },
    {
        icon: <ImageIcon className="w-5 h-5 text-purple-500" />,
        title: "Visual Trip Planner",
        desc: "See photos for every stop in your itinerary and get navigation details."
    },
    {
        icon: <Star className="w-5 h-5 text-yellow-500" />,
        title: "Must-See Highlights",
        desc: "Top landmarks are now automatically starred as 'Must See' locations."
    },
    {
        icon: <Users className="w-5 h-5 text-green-500" />,
        title: "Family Buckets",
        desc: "Assign wishes to family members and filter by person."
    }
  ];

  const history = [
      {
          date: "Latest Update (v1.6)",
          changes: [
              "Itinerary Generator: Increased limit to 30 places",
              "Visual Update: Added photos for itinerary stops",
              "Smart Ranking: Star indicators for top landmarks",
              "New 'Refresh' button to regenerate trip plans",
              "Added details view for individual stops"
          ]
      },
      {
          date: "v1.5",
          changes: [
              "Automatic Google Drive Backup (Every 24h)",
              "Restored Icon-based Filter Toolbar (Todo/Done)",
              "Silent Backup Mode",
              "Refined Logo: Adjusted text positioning & color",
              "Map Upgrade: Cleaner, smaller pin markers",
              "Map Status: Green pins for Done, Red for Pending"
          ]
      },
      {
        date: "Dec 23, 2025 (v1.4)",
        changes: [
            "Added timeline view in Home screen",
            "Added slider control to view multi year data in Map section"
        ]
      },
      {
        date: "Dec 21, 2025 (v1.3)",
        changes: [
            "Add appropriate images while adding wish list",
            "Add google sign-in test logins & terms, privacy policies"
        ]
      },
      {
        date: "Dec 14, 2025 (v1.2)",
        changes: [
            "New Liquid Bucket FAB: Visualizes pending dreams",
            "UI Refinement: Sharper icons and thinner borders",
            "Added 'Knock Out' count tooltip on hover",
            "Performance improvements",
            "Refined Themes: Introduced Marvel theme",
            "Family Buckets"
        ]
      },
      { 
          date: "Dec 7, 2025 (v1.1)", 
          changes: [
              "Added Audio Radar (Text-to-Speech) for nearby alerts",
              "Increased Proximity Range to 2km",
              "Restructured Settings: New 'Data' tab",
              "Fixed Mock Data management"
          ] 
      },
      { 
          date: "Nov 30, 2025 (v1.0)", 
          changes: [
              "Initial Release", 
              "AI Magic Fill", 
              "Capture Wish lists with location tag",
              "Conceptualized Idea"
          ] 
      }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 relative h-[50vh] flex flex-col">
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors z-20"
        >
            <X className="w-4 h-4" />
        </button>

        {/* Header - Fixed & Compact */}
        <div className="bg-gradient-to-br from-red-600 to-red-500 p-4 text-center text-white shrink-0 relative overflow-hidden">
             {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <Rocket className="absolute top-2 left-4 w-8 h-8 transform -rotate-12" />
                <Star className="absolute bottom-2 right-10 w-6 h-6 text-yellow-300 animate-pulse" />
            </div>

            <h2 className="text-lg font-bold mb-0.5 relative z-10">Just Knock v1.6</h2>
            <p className="text-red-100 text-[10px] font-medium opacity-90 relative z-10 uppercase tracking-widest">
                {activeTab === 'highlights' ? "Feature Highlights" : "Version History"}
            </p>
        </div>

        {/* Body - Flex Row for Vertical Tabs */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Left Vertical Tabs */}
            <div className="w-14 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-100 dark:border-gray-700 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
                <button
                    onClick={() => setActiveTab('highlights')}
                    className={`flex flex-col items-center gap-1 group relative w-full ${activeTab === 'highlights' ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'highlights' ? 'bg-red-100 dark:bg-red-900/30 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold">New</span>
                    
                    {/* Active Indicator Bar */}
                    {activeTab === 'highlights' && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-red-500 rounded-r-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex flex-col items-center gap-1 group relative w-full ${activeTab === 'history' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <div className={`p-2 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-100 dark:bg-blue-900/30 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                        <History className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold">Log</span>

                    {/* Active Indicator Bar */}
                    {activeTab === 'history' && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-r-full" />
                    )}
                </button>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-gray-800 p-0 relative">
                
                {activeTab === 'highlights' && (
                    <div className="p-4 space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                         <div className="space-y-3">
                            {features.map((feat, idx) => (
                                <div key={idx} className="flex gap-3 items-start p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="mt-0.5 bg-white dark:bg-gray-700 p-1.5 rounded-lg shrink-0 shadow-sm border border-gray-100 dark:border-gray-600">
                                        {feat.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-xs">{feat.title}</h3>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{feat.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center pt-2">
                             <p className="text-[9px] text-gray-400">Enjoy the new updates!</p>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-2 space-y-6">
                            {history.map((log, idx) => (
                                <div key={idx} className="relative pl-5">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[5px] top-0.5 w-2 h-2 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-blue-500"></div>
                                    
                                    <div className="flex flex-col gap-1 mb-2">
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md w-fit">
                                            {log.date}
                                        </span>
                                    </div>
                                    
                                    <ul className="space-y-1.5">
                                        {log.changes.map((change, cIdx) => (
                                            <li key={cIdx} className="text-[10px] text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                                <span className="block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mt-1 shrink-0"></span>
                                                <span className="leading-relaxed">{change}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 text-center">
                            <p className="text-[9px] text-gray-400">That's how far we've come.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
