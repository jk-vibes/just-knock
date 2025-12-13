
import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, MapPin, Check, X, Tag, List, Lightbulb, Users, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { analyzeBucketItem, suggestBucketItem } from '../services/geminiService';
import { BucketItemDraft } from '../types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: BucketItemDraft) => void;
  categories: string[];
  availableInterests: string[];
  familyMembers?: string[];
  initialData?: BucketItemDraft | null;
  mode?: 'add' | 'edit';
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd,
  categories,
  availableInterests,
  familyMembers = [],
  initialData,
  mode = 'add'
}) => {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [draft, setDraft] = useState<BucketItemDraft | null>(null);

  // Draft editing state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('Me');
  
  // Completion State
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Initialize state when initialData changes or mode switches
  useEffect(() => {
    if (isOpen && initialData && mode === 'edit') {
        setDraft(initialData);
        setSelectedCategory(initialData.category || 'Other');
        setSelectedInterests(initialData.interests || []);
        setSelectedOwner(initialData.owner || 'Me');
        setInput(initialData.title); // Pre-fill input for reference
        
        // Handle completion data
        if (initialData.isCompleted || (initialData as any).completed) {
            setIsCompleted(true);
            const ts = initialData.completedAt || Date.now();
            setCompletedDate(new Date(ts).toISOString().split('T')[0]);
        } else {
            setIsCompleted(false);
            setCompletedDate(new Date().toISOString().split('T')[0]);
        }

    } else if (isOpen && mode === 'add') {
        // Reset for add mode
        setDraft(null);
        setInput('');
        setSelectedCategory('');
        setSelectedInterests([]);
        setSelectedOwner('Me');
        setIsCompleted(false);
        setCompletedDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, initialData, mode]);

  // Update local state when draft changes (e.g. after AI analysis in Add mode)
  useEffect(() => {
    if (draft && mode === 'add') {
      const cat = categories.includes(draft.category || '') ? draft.category : 'Other';
      setSelectedCategory(cat || 'Other');
      setSelectedInterests(draft.interests || []);
    }
  }, [draft, categories, mode]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    const result = await analyzeBucketItem(input, categories);
    setDraft(result);
    setIsAnalyzing(false);
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    // Pass the current input as context to the suggestion engine
    const result = await suggestBucketItem(categories, input);
    setDraft(result);
    setInput(result.title);
    setIsSuggesting(false);
  };

  const handleConfirm = () => {
    if (draft) {
      // Convert date string back to timestamp
      const completedTimestamp = isCompleted ? new Date(completedDate).getTime() : undefined;

      onAdd({
        ...draft,
        category: selectedCategory,
        interests: selectedInterests,
        owner: selectedOwner,
        isCompleted: isCompleted,
        completedAt: completedTimestamp
      });
      onClose();
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  // If editing, we allow modifying the draft details directly
  const handleDraftChange = (field: keyof BucketItemDraft, value: any) => {
      if (draft) {
          setDraft({ ...draft, [field]: value });
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-5 overflow-y-auto no-scrollbar">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {mode === 'edit' ? 'Edit Dream' : 'New Wish'}
          </h2>
          
          {mode === 'add' && !draft && (
            <>
                <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm">Type your wish (e.g., "See the Northern Lights") and let AI fill in the details.</p>
                <div className="space-y-3">
                <textarea
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    rows={3}
                    placeholder="What's on your bucket list?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                />
                <div className="flex gap-3">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !input.trim() || isSuggesting}
                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Finding...
                        </>
                        ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Magic Fill
                        </>
                        )}
                    </button>
                    <button
                        onClick={handleSuggest}
                        disabled={isSuggesting || isAnalyzing}
                        className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-xl font-medium border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-2 whitespace-nowrap"
                        title={input.trim().length > 0 ? "Get a suggestion based on your text" : "Get a random suggestion"}
                    >
                         {isSuggesting ? (
                             <Loader2 className="w-5 h-5 animate-spin" />
                         ) : (
                             <>
                                <Lightbulb className="w-5 h-5" />
                                Inspire Me
                             </>
                         )}
                    </button>
                </div>
                </div>
            </>
          )}

          {draft && (
            <div className="space-y-3">
              {/* Draft Editor / AI Result Card */}
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 space-y-2">
                {mode === 'edit' ? (
                    <>
                         <input 
                            value={draft.title} 
                            onChange={(e) => handleDraftChange('title', e.target.value)}
                            className="w-full font-semibold text-red-900 dark:text-red-200 text-lg bg-transparent border-b border-red-200 dark:border-red-800 focus:outline-none focus:border-red-500"
                            placeholder="Title"
                         />
                         <textarea 
                            value={draft.description}
                            onChange={(e) => handleDraftChange('description', e.target.value)}
                            className="w-full text-red-700 dark:text-red-300 text-sm bg-transparent border-b border-red-200 dark:border-red-800 focus:outline-none focus:border-red-500 resize-none"
                            rows={2}
                            placeholder="Description"
                         />
                         <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            <input 
                                value={draft.locationName || ''}
                                onChange={(e) => handleDraftChange('locationName', e.target.value)}
                                className="text-xs font-medium text-red-600 dark:text-red-400 bg-transparent border-b border-red-200 dark:border-red-800 focus:outline-none focus:border-red-500 w-full"
                                placeholder="Location Name"
                            />
                         </div>
                    </>
                ) : (
                    <>
                        <h3 className="font-semibold text-red-900 dark:text-red-200 text-lg">{draft.title}</h3>
                        <p className="text-red-700 dark:text-red-300 text-sm mt-1">{draft.description}</p>
                        {draft.locationName && (
                        <div className="flex items-center gap-2 mt-2 text-xs font-medium text-red-600 dark:text-red-400 bg-white/50 dark:bg-black/20 w-fit px-2 py-1 rounded-full">
                            <MapPin className="w-3 h-3" />
                            {draft.locationName}
                        </div>
                        )}
                    </>
                )}
              </div>

              {/* Categorization Controls */}
              <div className="space-y-3 pt-1">
                
                {/* Status Selection (Radio Style) */}
                <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        Status
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Pending Radio */}
                        <div 
                            onClick={() => setIsCompleted(false)}
                            className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 ${!isCompleted ? 'border-gray-500 bg-gray-50 dark:bg-gray-700' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${!isCompleted ? 'border-gray-600 dark:border-gray-300' : 'border-gray-300 dark:border-gray-600'}`}>
                                {!isCompleted && <div className="w-2.5 h-2.5 rounded-full bg-gray-600 dark:bg-gray-300" />}
                            </div>
                            <span className={`text-sm font-semibold ${!isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Still Dreaming</span>
                        </div>

                        {/* Completed Radio */}
                        <div 
                            onClick={() => setIsCompleted(true)}
                            className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col gap-2 ${isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCompleted ? 'border-green-600 dark:border-green-400' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {isCompleted && <div className="w-2.5 h-2.5 rounded-full bg-green-600 dark:bg-green-400" />}
                                </div>
                                <span className={`text-sm font-semibold ${isCompleted ? 'text-green-900 dark:text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>Knocked Out!</span>
                            </div>

                            {/* Embedded Date Picker */}
                            {isCompleted && (
                                <div className="w-full pt-2 mt-1 border-t border-green-200 dark:border-green-800/50 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-3 h-3 text-green-600 dark:text-green-400" />
                                        <span className="text-xs font-medium text-green-700 dark:text-green-300">When?</span>
                                    </div>
                                    <input 
                                        type="date"
                                        value={completedDate}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setCompletedDate(e.target.value)}
                                        className="w-full p-1.5 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Family Selection - Only show if family members exist */}
                {familyMembers.length > 0 && (
                    <div>
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-2">
                            <Users className="w-3 h-3" /> Whose wish is this?
                        </label>
                        <select 
                            value={selectedOwner}
                            onChange={(e) => setSelectedOwner(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                        >
                            <option value="Me">Me</option>
                            {familyMembers.map(member => (
                                <option key={member} value={member}>{member}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-2">
                    <List className="w-3 h-3" /> Category
                  </label>
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {/* Combine AI suggested interests and user's available interests */}
                    {Array.from(new Set([...availableInterests, ...selectedInterests])).map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selectedInterests.includes(interest)
                            ? 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {mode === 'edit' ? 'Save Changes' : 'Add to List'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
            <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
