
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { ChevronRight, Check, X, Sparkles, Map, LayoutList } from 'lucide-react';

interface Step {
  target?: string; // CSS selector for target element
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: Step[] = [
  {
    title: "Welcome to Just Knock",
    description: "Your intelligent bucket list companion. Let's take a quick tour to help you start knocking off those dreams!",
    icon: <Sparkles className="w-12 h-12 text-yellow-400" />,
    position: 'center'
  },
  {
    target: '[data-tour="add-btn"]',
    title: "Dream It & Magic Fill",
    description: "Tap here to add a wish. Just type something like 'See the Northern Lights' and our AI will automatically find the best location, photos, and time to visit.",
    position: 'left' // FAB is bottom right, so tooltip to the left
  },
  {
    target: '[data-tour="radar-btn"]',
    title: "Never Miss a Moment",
    description: "Toggle the Radar on. We'll notify you when you're nearby one of your bucket list items, so you never miss an opportunity.",
    position: 'bottom'
  },
  {
    target: '[data-tour="view-toggle"]',
    title: "Map Your Journey",
    description: "Switch between a timeline list of your dreams and a global map view to plan your next adventure.",
    position: 'bottom'
  }
];

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isActive, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // Update target position when step changes or window resizes
  const updatePosition = () => {
    if (currentStep.target) {
      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // If element not found, default to center (fallback)
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  };

  useLayoutEffect(() => {
    if (isActive) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      // Small delay to ensure UI is rendered
      const timer = setTimeout(updatePosition, 100);
      return () => {
        window.removeEventListener('resize', updatePosition);
        clearTimeout(timer);
      };
    }
  }, [isActive, currentStepIndex]);

  if (!isActive) return null;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Calculate Spotlight Style
  // We use a massive box-shadow to create the "dimmed" background effect with a cutout
  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        top: targetRect.top - 4, // 4px padding
        left: targetRect.left - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        position: 'fixed',
        borderRadius: '12px', // Match rounded corners roughly
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
        zIndex: 60,
        pointerEvents: 'none', // Allow clicks to pass through if needed, but we block here essentially via the overlay visual
        transition: 'all 0.3s ease-out'
      }
    : {
       // Center Step (Welcome) - Full overlay
       position: 'fixed',
       inset: 0,
       backgroundColor: 'rgba(0,0,0,0.75)',
       zIndex: 60,
       transition: 'all 0.3s ease-out'
    };

  // Calculate Tooltip Position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || currentStep.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
        zIndex: 70
      };
    }

    const gap = 16;
    let top = 0;
    let left = 0;
    let transform = '';

    switch (currentStep.position) {
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + (targetRect.width / 2);
        transform = 'translateX(-50%)';
        break;
      case 'top':
        top = targetRect.top - gap;
        left = targetRect.left + (targetRect.width / 2);
        transform = 'translate(-50%, -100%)';
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2);
        left = targetRect.left - gap;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2);
        left = targetRect.right + gap;
        transform = 'translate(0, -50%)';
        break;
    }

    // Boundary checks to keep tooltip on screen (simple version)
    // If we wanted to be robust we'd check window.innerWidth/Height here
    // but the defined steps (bottom for header items, left for FAB) are generally safe.

    return {
      top,
      left,
      transform,
      position: 'fixed',
      zIndex: 70
    };
  };

  return (
    <>
      {/* Spotlight / Overlay */}
      <div style={spotlightStyle} className="pointer-events-auto" />

      {/* Tooltip Card */}
      <div 
        style={getTooltipStyle()} 
        className="w-[85vw] max-w-sm bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-300"
      >
        <button 
            onClick={handleSkip} 
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
            <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
            {currentStep.icon && <div className="mb-4">{currentStep.icon}</div>}
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {currentStep.title}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {currentStep.description}
            </p>

            <div className="flex items-center justify-between w-full">
                {/* Dots Indicator */}
                <div className="flex gap-1.5">
                    {STEPS.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentStepIndex ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`} 
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-red-600/20"
                >
                    {isLastStep ? 'Get Started' : 'Next'}
                    {isLastStep ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
      </div>
    </>
  );
};
