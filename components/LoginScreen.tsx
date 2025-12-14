import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { driveService } from '../services/driveService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const BucketLogo = () => (
    <svg width="64" height="64" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <path d="M56 160c0-100 400-100 400 0" stroke="#ef4444" strokeWidth="40" strokeLinecap="round" fill="none"></path>
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

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const tokenClient = useRef<any>(null);

  useEffect(() => {
    const initializeGoogleAuth = () => {
        if (window.google?.accounts?.oauth2 && !tokenClient.current) {
            tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                client_id: '482285261060-fe5mujd6kn3gos3k6kgoj0kjl63u0cr1.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                callback: async (tokenResponse: any) => {
                    if (tokenResponse.access_token) {
                        // Store token for Drive operations
                        driveService.setAccessToken(tokenResponse.access_token);
                        
                        // Fetch User Profile
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
                            console.error("Login failed during profile fetch:", error);
                            alert("Failed to retrieve user profile. Please try again.");
                        }
                    }
                    setIsLoading(false);
                },
                error_callback: (error: any) => {
                    setIsLoading(false);
                    // Handle user closing the popup gracefully
                    if (error.type === 'popup_closed') {
                        console.log("User closed the login popup");
                        return;
                    }
                    
                    console.error("Google Auth Error:", error);
                    alert("Login failed. Please try again.");
                }
            });
        }
    };

    // Try immediately
    initializeGoogleAuth();

    // Retry if script hasn't loaded yet
    const intervalId = setInterval(() => {
        if (tokenClient.current) {
            clearInterval(intervalId);
        } else {
            initializeGoogleAuth();
        }
    }, 500);

    return () => clearInterval(intervalId);
  }, [onLogin]);

  const handleGoogleLogin = () => {
    if (!tokenClient.current) {
        alert("Google Sign-In is still loading. Please check your internet connection and try again.");
        return;
    }
    
    setIsLoading(true);
    // Requesting access token triggers the popup. 
    // This MUST be called directly from the user event handler.
    tokenClient.current.requestAccessToken();
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
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed group"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span>Sign in with Google</span>
                    </>
                )}
            </button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">secure login</span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>
        </div>
        
        <p className="mt-8 text-xs text-gray-400 text-center px-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};