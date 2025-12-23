
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { driveService } from '../services/driveService';
import { Settings, HelpCircle, LogIn, Copy, Shield, Scale } from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const BucketLogo = () => (
    <svg width="64" height="64" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <path d="M56 160c0-100 400-100 400 0" stroke="#ef4444" strokeWidth="30" strokeLinecap="round" fill="none"></path>
      <path d="M56 160l40 320h320l40-320Z" fill="#ef4444"></path>
      <text x="256" y="380" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="160" fill="#ffffff" textAnchor="middle">JK</text>
    </svg>
  );

// Add global type for Google Identity Services
declare global {
    interface Window {
        google: any;
    }
}

// Default Client ID
const DEFAULT_CLIENT_ID = '482285261060-fe5mujd6kn3gos3k6kgoj0kjl63u0cr1.apps.googleusercontent.com';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [clientId, setClientId] = useState(() => localStorage.getItem('jk_client_id') || DEFAULT_CLIENT_ID);
  const tokenClient = useRef<any>(null);

  // Get current origin for troubleshooting
  const currentOrigin = window.location.origin;

  useEffect(() => {
    tokenClient.current = null;
    
    const initializeGoogleAuth = () => {
        if (window.google?.accounts?.oauth2) {
            try {
                tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.access_token) {
                            driveService.setAccessToken(tokenResponse.access_token);
                            try {
                                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                });
                                if (!userInfoResponse.ok) throw new Error("Failed to fetch profile");
                                const userInfo = await userInfoResponse.json();
                                const user: User = {
                                    id: userInfo.sub,
                                    name: userInfo.name,
                                    email: userInfo.email,
                                    photoUrl: userInfo.picture
                                };
                                onLogin(user);
                            } catch (error) {
                                console.error("Login failed:", error);
                                alert("Failed to retrieve user profile.");
                            }
                        }
                        setIsLoading(false);
                    },
                    error_callback: (error: any) => {
                        setIsLoading(false);
                        if (error.type === 'popup_closed') return;
                        console.error("Google Auth Error:", error);
                    }
                });
            } catch (e) {
                console.error("Initialization Error:", e);
            }
        }
    };

    initializeGoogleAuth();
    const intervalId = setInterval(() => {
        if (tokenClient.current) clearInterval(intervalId);
        else initializeGoogleAuth();
    }, 500);

    return () => clearInterval(intervalId);
  }, [onLogin, clientId]);

  const handleGoogleLogin = () => {
    if (!tokenClient.current) {
        alert("Google Sign-In is initializing. Please wait a moment.");
        return;
    }
    setIsLoading(true);
    tokenClient.current.requestAccessToken();
  };

  const handleGuestLogin = () => {
      onLogin({
          id: 'guest',
          name: 'Guest Dreamer',
          email: 'guest@example.com',
          photoUrl: 'https://ui-avatars.com/api/?name=Guest+Dreamer&background=random'
      });
  };

  const handleSaveConfig = () => {
      localStorage.setItem('jk_client_id', clientId);
      window.location.reload();
  };

  const copyOrigin = () => {
      navigator.clipboard.writeText(currentOrigin);
      alert("Origin copied! Paste this into 'Authorized JavaScript origins' in Google Cloud Console.");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
        <BucketLogo />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">just knock it</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">dream it. bucket it. knock it.</p>

        <div className="space-y-4 w-full">
            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>Sign in with Google</span>
                    </>
                )}
            </button>

            <button
                onClick={handleGuestLogin}
                className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-3.5 px-4 rounded-xl transition-all"
            >
                <LogIn className="w-5 h-5" />
                <span>Continue as Guest</span>
            </button>
            
            <div className="pt-4 flex justify-center">
                <button 
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
                >
                    <Settings className="w-3 h-3" />
                    {showConfig ? 'Hide Configuration' : 'Fix Error 400 / Drive / Config ID'}
                </button>
            </div>

            {showConfig && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 text-left">
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            1. Your Current Origin
                        </label>
                        <div className="flex gap-2">
                            <code className="flex-grow p-2 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-red-600 dark:text-red-400 truncate">
                                {currentOrigin}
                            </code>
                            <button 
                                onClick={copyOrigin}
                                className="p-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 transition-colors"
                                title="Copy Origin"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 italic">
                            * Paste this into <strong>"Authorized JavaScript origins"</strong> in Google Console to fix Error 400.
                        </p>
                    </div>

                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            2. Google Drive API Requirement
                        </label>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300">
                            For backups to work, you <strong>MUST</strong> enable the "Google Drive API" in the Google Cloud Console library for this project ID.
                        </p>
                    </div>

                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        3. Google Client ID
                    </label>
                    <input 
                        type="text" 
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full p-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg mb-2 focus:ring-1 focus:ring-red-500 outline-none"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSaveConfig}
                            className="flex-1 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Save & Reload
                        </button>
                        <button 
                            onClick={() => {
                                setClientId(DEFAULT_CLIENT_ID);
                                localStorage.removeItem('jk_client_id');
                                window.location.reload();
                            }}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">secure login</span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>
        </div>
        
        <div className="mt-8 text-xs text-gray-400 text-center px-4 space-y-2">
            <p>By continuing, you agree to our policies.</p>
            <div className="flex justify-center gap-4">
                <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-red-500 transition-colors underline underline-offset-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Privacy Policy
                </button>
                <button onClick={() => setIsTermsOpen(true)} className="hover:text-red-500 transition-colors underline underline-offset-2 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Terms of Service
                </button>
            </div>
        </div>
      </div>

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
};
