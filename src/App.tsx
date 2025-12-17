import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentAuth from "./pages/StudentAuth";
import Student from "./pages/Student";
// Lazy load admin pages to prevent Supabase initialization on startup
import { lazy, Suspense, useEffect, useState } from "react";
const AdminCinematography = lazy(() => import('./pages/AdminCinematography'));
const AdminVideoEditing = lazy(() => import('./pages/AdminVideoEditing'));
const AllVideos = lazy(() => import('./pages/AllVideos'));
const AllModules = lazy(() => import('./pages/AllModules'));

import { registerServiceWorker } from "@/lib/notifications";
import { registerPushNotifications } from "@/integrations/push";

import { BackButtonProvider } from "@/contexts/BackButtonContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OfflineAlert } from "@/components/OfflineAlert";
import { SplashScreen } from "@/components/SplashScreen";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { Loader2 } from "lucide-react";
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { Capacitor } from '@capacitor/core';

// Global error boundary to catch runtime errors and show a visible message instead of a white screen
import React from 'react';

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any, errorInfo: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ error, errorInfo });
    // Optionally log to external service
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__LAST_ERROR__ = { error, errorInfo };
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#b91c1c', background: '#fff0f0', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#b91c1c' }}>An error occurred in the app</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{String(this.state.error)}</pre>
          {this.state.errorInfo && <details style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {this.state.errorInfo.componentStack}
          </details>}
          <p style={{ marginTop: 24 }}>Please screenshot this error and send it to the developer.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Registering the service worker is safe without prompting the user yet
    registerServiceWorker();
    // Only runs if VITE_ENABLE_PUSH=true and native platform; skips re-prompting users
    registerPushNotifications(undefined, { promptUser: false });

    // Enable privacy screen on native platforms
    if (Capacitor.isNativePlatform()) {
      PrivacyScreen.enable().catch(err => console.error('Failed to enable privacy screen:', err));
    }
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <OfflineAlert />
            <NotificationPermissionPrompt />
            <Toaster />
            <Sonner />
            <HashRouter>
              <BackButtonProvider>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/student-auth" element={<StudentAuth />} />
                    <Route path="/student" element={<Student />} />
                    <Route path="/admin/cinematography" element={<AdminCinematography />} />
                    <Route path="/admin/video-editing" element={<AdminVideoEditing />} />
                    <Route path="/videos" element={<AllVideos />} />
                    <Route path="/modules" element={<AllModules />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BackButtonProvider>
            </HashRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
