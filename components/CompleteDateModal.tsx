
import React, { useState } from 'react';
import { Calendar, Check, X } from 'lucide-react';

interface CompleteDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: number) => void;
  itemTitle?: string;
}

export const CompleteDateModal: React.FC<CompleteDateModalProps> = ({ isOpen, onClose, onConfirm, itemTitle }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Knocked it out! 🎉</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">When did you complete <span className="font-medium text-gray-800 dark:text-gray-200">"{itemTitle}"</span>?</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 mb-5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Completion Date
            </label>
            <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-gray-900 dark:text-white outline-none font-semibold text-sm p-1"
            />
        </div>

        <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
            >
                Cancel
            </button>
            <button 
                onClick={() => {
                    // Create date at noon to avoid timezone issues shifting the day
                    const d = new Date(date);
                    d.setHours(12, 0, 0, 0);
                    onConfirm(d.getTime());
                }}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 hover:bg-green-700 transition-colors"
            >
                <Check className="w-4 h-4" />
                Confirm
            </button>
        </div>
      </div>
    </div>
  );
};
