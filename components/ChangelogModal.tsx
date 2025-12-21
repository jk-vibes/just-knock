
import React from 'react';
import { X, CheckCircle2, Rocket, Map, Cloud, Sparkles, History, Users } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
        icon: <Users className="w-5 h-5 text-purple-500" />,
        title: "Family Buckets",
        desc: "Add family members in settings and assign wishes to them. Filter the list to see specific member dreams."
    },
    {
        icon: <Map className="w-5 h-5 text-blue-500" />,
        title: "Location Radar",
        desc: "Get notified when you are within 2km of a bucket list item."
    },
    {
        icon: <Cloud className="w-5 h-5 text-purple-500" />,
        title: "Cloud Backup",
        desc: "Securely backup your dreams to your Google Drive."
    },
    {
        icon: <Sparkles className="w-5 h-5 text-yellow-500" />,
        title: "AI Magic Fill",
        desc: "Type a simple wish and let AI fill in the location and details."
    }
  ];

  const history = [
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 relative h-[80vh] flex flex-col">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
        >
            <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-red-600 to-red-500 p-6 pt-8 text-center text-white shrink-0">
            <h2 className="text-2xl font-bold mb-1">Just Knock v1.3</h2>
            <p className="text-red-100 text-sm opacity-90">What's New</p>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-8">
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Features Highlight</h3>
                {features.map((feat, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                        <div className="mt-0.5 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg shrink-0">
                            {feat.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{feat.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{feat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4" /> Version History
                </h3>
                <div className="space-y-4">
                    {history.map((log, idx) => (
                        <div key={idx} className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{log.date}</p>
                            <ul className="list-none space-y-1">
                                {log.changes.map((change, cIdx) => (
                                    <li key={cIdx} className="text-xs text-gray-500 dark:text-gray-400">• {change}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-[10px] text-gray-400">Build 2025.12.21 • Made with ❤️</p>
            </div>
        </div>
      </div>
    </div>
  );
};
