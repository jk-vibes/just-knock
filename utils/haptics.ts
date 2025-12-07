/**
 * Triggers device haptic feedback using the Web Vibration API.
 * Note: Supported primarily on Android devices. iOS Safari does not support navigator.vibrate.
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light': // Subtle tap for tabs/selections
        navigator.vibrate(5); 
        break;
      case 'medium': // Standard button press
        navigator.vibrate(15);
        break;
      case 'heavy': // Significant action
        navigator.vibrate(30); 
        break;
      case 'success': // Task completion
        navigator.vibrate([10, 30]); 
        break;
      case 'warning': // Delete / Destructive
        navigator.vibrate([30, 50, 30]); 
        break;
    }
  } catch (e) {
    // Ignore errors on unsupported devices
  }
};