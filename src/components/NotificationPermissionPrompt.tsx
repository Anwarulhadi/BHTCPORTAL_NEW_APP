import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestAllNotificationPermissions } from '@/lib/notifications';
import { isNative, registerPushNotifications } from '@/integrations/push';
import { PushNotifications } from '@capacitor/push-notifications';

const DISMISS_KEY = 'notificationPromptDismissed';

type PermissionState = 'granted' | 'denied' | 'prompt';

export const NotificationPermissionPrompt = () => {
  const pushEnabled = import.meta.env.VITE_ENABLE_PUSH === 'true';
  const [open, setOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const dismissedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);

  const checkStatus = useCallback(async (): Promise<PermissionState> => {
    if (!pushEnabled) {
      setPermissionState('denied');
      setOpen(false);
      return 'denied';
    }

    let status: PermissionState = 'prompt';

    if (isNative()) {
      try {
        const perm = await PushNotifications.checkPermissions();
        status = perm.receive === 'granted' ? 'granted' : perm.receive === 'denied' ? 'denied' : 'prompt';
      } catch (error) {
        console.warn('Unable to check native push permission', error);
        status = 'denied';
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      status = Notification.permission === 'granted'
        ? 'granted'
        : Notification.permission === 'denied'
          ? 'denied'
          : 'prompt';
    } else {
      status = 'denied';
    }

    setPermissionState(status);
    // Only open custom dialog if denied (to guide to settings)
    // For 'prompt', we will trigger native request directly
    if (!dismissedRef.current && status === 'denied') {
      setOpen(true);
    } else {
      setOpen(false);
    }

    return status;
  }, [pushEnabled]);

  const handleEnable = async () => {
    if (!pushEnabled) {
      setOpen(false);
      return;
    }
    setIsRequesting(true);
    try {
      if (isNative()) {
        await registerPushNotifications(undefined, { promptUser: true });
      } else {
        await requestAllNotificationPermissions();
      }

      const latestStatus = await checkStatus();
      if (latestStatus === 'granted') {
        localStorage.setItem(DISMISS_KEY, 'true');
        dismissedRef.current = true;
        setOpen(false);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pushEnabled) {
      setInitialized(true);
      return;
    }
    
    // Check immediately on mount
    const check = async () => {
        dismissedRef.current = localStorage.getItem(DISMISS_KEY) === 'true';
        const status = await checkStatus();
        
        // If status is prompt, ask immediately!
        if (status === 'prompt' && !dismissedRef.current) {
             // Trigger native request directly
             if (isNative()) {
                await registerPushNotifications(undefined, { promptUser: true });
             } else {
                await requestAllNotificationPermissions();
             }
             // Re-check status after user responds
             await checkStatus();
        }
        
        setInitialized(true);
    };
    check();
  }, [checkStatus, pushEnabled]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    dismissedRef.current = true;
    setOpen(false);
  };

  if (!initialized) {
    return null;
  }

  if (!pushEnabled) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : handleDismiss())}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-admin/10 p-3">
              <BellRing className="h-6 w-6 text-admin" />
            </div>
            <DialogTitle className="text-xl">Enable instant alerts</DialogTitle>
          </div>
          <DialogDescription className="space-y-2">
            <p>
              Stay in sync with new announcements. We&apos;ll use your device&apos;s default
              ringtone so you don&apos;t miss urgent news from administrators.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>
                {permissionState === 'denied'
                  ? 'Notifications are blocked. Enable them from system settings and try again.'
                  : 'Allow notifications to receive sounds and banners on every device you use.'}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleDismiss} disabled={isRequesting}>
            Maybe later
          </Button>
          <Button onClick={handleEnable} disabled={isRequesting} className="bg-admin hover:bg-admin/90">
            {isRequesting ? 'Requesting...' : 'Allow notifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
