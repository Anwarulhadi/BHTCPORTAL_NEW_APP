import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentAuth from "./pages/StudentAuth";
import Student from "./pages/Student";
import AdminCinematography from './pages/AdminCinematography';
import AdminVideoEditing from './pages/AdminVideoEditing';
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/notifications";
import { registerPushNotifications } from "@/integrations/push";

import { BackButtonProvider } from "@/contexts/BackButtonContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OfflineAlert } from "@/components/OfflineAlert";
import { SplashScreen } from "@/components/SplashScreen";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Registering the service worker is safe without prompting the user yet
    registerServiceWorker();
    // Only runs if VITE_ENABLE_PUSH=true and native platform; skips re-prompting users
    registerPushNotifications(undefined, { promptUser: false });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            <OfflineAlert />
            <NotificationPermissionPrompt />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <BackButtonProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/student-auth" element={<StudentAuth />} />
                  <Route path="/student" element={<Student />} />
                  <Route path="/admin/cinematography" element={<AdminCinematography />} />
                  <Route path="/admin/video-editing" element={<AdminVideoEditing />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BackButtonProvider>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
