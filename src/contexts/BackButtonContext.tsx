import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';

type BackButtonHandler = () => boolean | Promise<boolean>;

interface BackButtonContextType {
  registerHandler: (handler: BackButtonHandler) => () => void;
}

const BackButtonContext = createContext<BackButtonContextType | undefined>(undefined);

export const BackButtonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<BackButtonHandler[]>([]);
  const lastBackPressRef = useRef<number>(0);
  const location = useLocation();
  const navigate = useNavigate();

  const registerHandler = useCallback((handler: BackButtonHandler) => {
    // Add to the beginning (stack behavior - LIFO)
    // Actually, if we push, we should iterate backwards.
    // Let's unshift to make it easier (iterate 0..n).
    handlersRef.current.unshift(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter(h => h !== handler);
    };
  }, []);

  useEffect(() => {
    const setupListener = async () => {
      const listener = await CapacitorApp.addListener('backButton', async (data) => {
        // 1. Try registered handlers
        for (const handler of handlersRef.current) {
          const handled = await handler();
          if (handled) {
            return;
          }
        }

        // 2. Default behavior: Double Back to Exit
        // Only if we are at the root or specific paths?
        // Or maybe we check if we can go back in history?
        // data.canGoBack is from the WebView's perspective.
        
        // If we are not at root, maybe we should navigate back?
        // React Router handles navigation.
        // If we are at a sub-route, we probably want to go back.
        
        if (location.pathname !== '/' && location.pathname !== '/student-auth') {
           navigate(-1);
           return;
        }

        // If at root, handle exit
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          toast.info('Press back again to exit');
        }
      });

      return listener;
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [location.pathname, navigate]);

  return (
    <BackButtonContext.Provider value={{ registerHandler }}>
      {children}
    </BackButtonContext.Provider>
  );
};

export const useBackButton = (handler: BackButtonHandler) => {
  const context = useContext(BackButtonContext);
  if (!context) {
    throw new Error('useBackButton must be used within a BackButtonProvider');
  }

  useEffect(() => {
    const unregister = context.registerHandler(handler);
    return unregister;
  }, [handler, context]);
};
