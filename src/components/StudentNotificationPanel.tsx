import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { playNotificationSound, requestAllNotificationPermissions, showNotification } from '@/lib/notifications';
import { useLanguage } from '@/contexts/LanguageContext';

interface News {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface StudentNotificationPanelProps {
  onNewsClick: () => void;
}

export const StudentNotificationPanel = ({ onNewsClick }: StudentNotificationPanelProps) => {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNews();
    requestAllNotificationPermissions();

    // Load read news from localStorage
    const stored = localStorage.getItem('readNewsIds');
    if (stored) {
      setReadNewsIds(new Set(JSON.parse(stored)));
    }

    // Set up real-time subscription for news
    const channel = supabase
      .channel('student-news-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news',
        },
        (payload) => {
          playNotificationSound();
          fetchNews();
          const newItem = payload.new as News;
          showNotification('New School Announcement!', newItem.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Calculate unread count
    const unread = news.filter(n => !readNewsIds.has(n.id)).length;
    setUnreadCount(unread);
  }, [news, readNewsIds]);

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setNews(data);
  };

  const handleNewsClick = (newsId: string) => {
    const updated = new Set(readNewsIds);
    updated.add(newsId);
    setReadNewsIds(updated);
    localStorage.setItem('readNewsIds', JSON.stringify([...updated]));
    onNewsClick();
    setShowPanel(false);
  };

  const handleClearAll = () => {
    const allIds = new Set(news.map(n => n.id));
    setReadNewsIds(allIds);
    localStorage.setItem('readNewsIds', JSON.stringify([...allIds]));
  };

  const handleRemoveNotification = (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(readNewsIds);
    updated.add(newsId);
    setReadNewsIds(updated);
    localStorage.setItem('readNewsIds', JSON.stringify([...updated]));
  };

  const unreadNews = news.filter(n => !readNewsIds.has(n.id));

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-0.5 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showPanel && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPanel(false)}
          />
          <Card className="absolute right-0 top-12 w-80 sm:w-96 max-h-96 overflow-y-auto z-50 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{t('schoolNewsTitle')}</h3>
              {unreadNews.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs"
                >
                  {t('clearAll')}
                </Button>
              )}
            </div>

            {unreadNews.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                {t('noNewNotifications')}
              </p>
            ) : (
              <div className="space-y-2">
                {unreadNews.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 cursor-pointer transition-colors group relative"
                    onClick={() => handleNewsClick(item.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveNotification(item.id, e)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <h4 className="font-semibold text-sm text-green-800 mb-1 pr-6">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {item.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
