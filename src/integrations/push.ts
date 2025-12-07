import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, Channel } from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const isNative = () => Capacitor.isNativePlatform();

type RegisterPushOptions = {
  promptUser?: boolean;
};

let listenersRegistered = false;
let channelCreated = false;
let latestTokenCallback: ((token: string) => void) | undefined;

const ensureAndroidChannel = async () => {
  if (channelCreated || Capacitor.getPlatform() !== 'android') return;

  const channel: Channel = {
    id: 'news-alerts',
    name: 'News & Announcements',
    description: 'Alerts whenever administrators publish new updates',
    importance: 5,
    vibration: true,
    visibility: 1,
    lights: true,
    lightColor: '#ff6b00',
    sound: 'default',
  };

  try {
    await PushNotifications.createChannel(channel);
    channelCreated = true;
  } catch (error) {
    console.warn('Unable to create Android notification channel', error);
  }
};

export async function registerPushNotifications(
  onToken?: (token: string) => void,
  options: RegisterPushOptions = {}
) {
  // Opt-in via env flag to avoid crashes when FCM isn't configured yet
  const enabled = import.meta.env.VITE_ENABLE_PUSH === 'true';
  if (!enabled) return;
  if (!isNative()) return; // Only register on native platforms

  const { promptUser = true } = options;
  latestTokenCallback = onToken;

  try {
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      if (!promptUser) {
        return;
      }
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') {
        toast.error('Push notifications permission denied');
        return;
      }
    }

    await ensureAndroidChannel();

    if (!listenersRegistered) {
      listenersRegistered = true;

      PushNotifications.addListener('registration', async (token: Token) => {
        latestTokenCallback?.(token.value);
        try {
          // Save token to Supabase for later FCM sends
          await supabase.from('device_tokens').upsert(
            {
              token: token.value,
              platform: Capacitor.getPlatform(),
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'token' }
          );
        } catch (e) {
          console.error('Failed saving device token', e);
        }
        toast.success('Push registered');
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error', error);
        toast.error('Push registration failed');
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Notification received in foreground
        console.log('Push received', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push action', action);
      });
    }

    await PushNotifications.register();
  } catch (e) {
    console.error('Push init error', e);
  }
}
