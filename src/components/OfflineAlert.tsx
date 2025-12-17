import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineAlert = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c9488] flex flex-col items-center justify-center text-white">
      <div className="bg-white/20 p-8 rounded-full mb-6 animate-pulse">
        <WifiOff className="w-24 h-24" />
      </div>
      <h1 className="text-3xl font-bold mb-2">No Internet Connection</h1>
      <p className="text-lg opacity-90">Please check your network settings.</p>
    </div>
  );
};
