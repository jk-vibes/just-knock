
import React from 'react';
import { X, Shield, Lock, Eye, Server, MapPin, HardDrive } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Privacy Policy</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" /> Information We Collect
            </h3>
            <p><strong>Just Knock</strong> ("the App") is committed to protecting your privacy. We collect the following data:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Google Profile Info:</strong> Your name, email, and profile picture provided via Google Sign-In to create your personalized account.</li>
              <li><strong>Bucket List Data:</strong> The titles, descriptions, and categories of items you add to your list.</li>
              <li><strong>Location Data:</strong> Geolocation coordinates for your bucket list items.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Location Services
            </h3>
            <p>The App uses your device's real-time location to provide the <strong>Proximity Radar</strong> feature. Your real-time location is processed <strong>only on your device</strong> and is never uploaded to our servers or stored permanently. Location coordinates for your "Dreams" are stored in your private database (locally or in your Google Drive).</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" /> Google Drive Integration
            </h3>
            <p>If you choose to use the Backup feature, the App requests the <code>drive.file</code> scope. This allows the App to only see and manage files that <strong>it creates</strong> (your backup JSON). We cannot access, view, or delete any other files in your Google Drive.</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-500" /> Data Sharing & Security
            </h3>
            <p>We do not sell your personal data. Your bucket list items may be processed by the <strong>Google Gemini API</strong> to automatically categorize and provide suggestions, but this data is not used for training models without your consent. We use industry-standard encryption for local storage and secure OAuth 2.0 protocols for Google integrations.</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-500" /> Cookies & Local Storage
            </h3>
            <p>We use local storage to keep you logged in and to store your preferences (Theme, Radar range, etc.) for a better user experience.</p>
          </section>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-[10px] text-gray-400">Last updated: May 20, 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};
