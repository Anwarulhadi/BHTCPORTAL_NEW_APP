import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requestAllNotificationPermissions } from '@/lib/notifications';

export const NotificationBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show if permission is not granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setVisible(Notification.permission !== 'granted');
    }
  }, []);

  const handleEnable = async () => {
    await requestAllNotificationPermissions();
    if ('Notification' in window && Notification.permission === 'granted') {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Card className="mx-auto my-3 max-w-6xl px-3 sm:px-6 py-3 bg-yellow-50 border-yellow-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-yellow-900">
          Enable notifications to get alerts when new news is published.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleEnable} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
            Enable Notifications
          </Button>
          <Button onClick={() => setVisible(false)} variant="outline" size="sm">
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NotificationBanner;
