import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { playNotificationSound, requestAllNotificationPermissions, showNotification } from '@/lib/notifications';
import { useLanguage } from '@/contexts/LanguageContext';
import apiClient from '@/integrations/apiClient';

interface News {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface StudentNotificationPanelProps {
  onNewsClick: (newsId: string) => void;
}

export const StudentNotificationPanel = ({ onNewsClick }: StudentNotificationPanelProps) => {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const [deletedNewsIds, setDeletedNewsIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNews();
    requestAllNotificationPermissions();

    // Load read/deleted news from localStorage
    const storedRead = localStorage.getItem('readNewsIds');
    if (storedRead) {
      setReadNewsIds(new Set(JSON.parse(storedRead)));
    }
    
    const storedDeleted = localStorage.getItem('deletedNewsIds');
    if (storedDeleted) {
      setDeletedNewsIds(new Set(JSON.parse(storedDeleted)));
    }

    // Real-time subscription removed for local backend compatibility
    // We could implement polling here if needed
    const interval = setInterval(fetchNews, 60000); // Poll every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Calculate unread count (excluding deleted ones)
    const visibleNews = news.filter(n => !deletedNewsIds.has(n.id));
    const unread = visibleNews.filter(n => !readNewsIds.has(n.id)).length;
    setUnreadCount(unread);
  }, [news, readNewsIds, deletedNewsIds]);

  const fetchNews = async () => {
    try {
      const data = await apiClient.listNews();
      if (Array.isArray(data)) {
        // Sort by created_at desc
        const sorted = data.sort((a: News, b: News) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 10);
        setNews(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch news', err);
    }
  };

  const handleNewsClick = (newsId: string) => {
    const updated = new Set(readNewsIds);
    updated.add(newsId);
    setReadNewsIds(updated);
    localStorage.setItem('readNewsIds', JSON.stringify([...updated]));
    onNewsClick(newsId);
    setShowPanel(false);
  };

  const handleClearAll = () => {
    const allIds = new Set(news.map(n => n.id));
    const updated = new Set([...deletedNewsIds, ...allIds]);
    setDeletedNewsIds(updated);
    localStorage.setItem('deletedNewsIds', JSON.stringify([...updated]));
  };

  const handleRemoveNotification = (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = new Set(deletedNewsIds);
    updated.add(newsId);
    setDeletedNewsIds(updated);
    localStorage.setItem('deletedNewsIds', JSON.stringify([...updated]));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showPanel && !target.closest('.notification-panel-container') && !target.closest('.notification-trigger-btn')) {
        setShowPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);

  const visibleNews = news.filter(item => !deletedNewsIds.has(item.id));

  if (news.length === 0) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative notification-trigger-btn"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showPanel && (
        <div className="absolute top-16 right-4 z-50 w-80 sm:w-96 animate-in fade-in slide-in-from-top-5 notification-panel-container">
          <Card className="shadow-xl border-2 border-primary/20">
            <div className="p-4 border-b flex items-center justify-between bg-muted/50">
              <h3 className="font-semibold">{t('notifications')}</h3>
              <div className="flex items-center gap-2">
                {visibleNews.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs h-8 px-2"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setShowPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {visibleNews.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('noNotifications')}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {visibleNews.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer group ${
                        !readNewsIds.has(item.id) ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleNewsClick(item.id)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 pr-2">
                          <h4 className={`text-sm font-medium mb-1 ${
                            !readNewsIds.has(item.id) ? 'text-primary' : ''
                          }`}>
                            {item.title}
                          </h4>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {item.content}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleRemoveNotification(item.id, e)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {!readNewsIds.has(item.id) && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
