
import React from 'react';
import { X, Scale, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Terms of Service</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> 1. Acceptance of Terms
            </h3>
            <p>By accessing or using <strong>Just Knock</strong>, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the application.</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" /> 2. User Accounts
            </h3>
            <p>You must use a Google account to access certain features. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" /> 3. Responsible Use of Location
            </h3>
            <p>The application provides location-based alerts. You agree to use these features responsibly and in accordance with local laws. Do not use the proximity radar while driving or in any situation where it could cause a distraction or safety hazard.</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4 text-red-500" /> 4. Disclaimers
            </h3>
            <p>The App is provided "as is" without warranty of any kind. <strong>Just Knock</strong> does not guarantee the accuracy of location data, map information provided by OpenStreetMap/Leaflet, or AI-generated suggestions from the Gemini API.</p>
          </section>

          <section>
            <h3 className="text-gray-900 dark:text-white font-bold mb-2">5. Limitation of Liability</h3>
            <p>In no event shall the developers of <strong>Just Knock</strong> be liable for any indirect, incidental, special, or consequential damages arising out of your use or inability to use the application.</p>
          </section>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-[10px] text-gray-400">Last updated: May 20, 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};
