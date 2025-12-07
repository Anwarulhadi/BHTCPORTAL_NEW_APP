import { useState, useEffect } from 'react';
import apiClient from '@/integrations/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBackButton } from '@/contexts/BackButtonContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface News {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const NewsManagement = () => {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useBackButton(() => {
    if (showDialog) {
      setShowDialog(false);
      return true;
    }
    return false;
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const data = await apiClient.listNews();
      setNews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch news', err);
      toast.error('Failed to load news');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingNews) {
        await apiClient.postNews({ id: editingNews.id, title, content });
        toast.success('News updated successfully!');
      } else {
        await apiClient.postNews({ title, content });
        playNotificationSound();
        toast.success('News published!');
        // scaffold backend does not call FCM; integrate notify endpoint when ready
      }

      setShowDialog(false);
      setEditingNews(null);
      setTitle('');
      setContent('');
      fetchNews();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save news');
    }
  };

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    setTitle(newsItem.title);
    setContent(newsItem.content);
    setShowDialog(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await apiClient.deleteNews(id);
        toast.success('News deleted');
        fetchNews();
      } catch (err) {
        console.error('Delete failed', err);
        toast.error('Failed to delete news');
      }
    }
  };

  const handleAddNew = () => {
    setEditingNews(null);
    setTitle('');
    setContent('');
    setShowDialog(true);
  };

  return (
    <Card className="p-4 sm:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold">{t('newsManagementTitle')}</h2>
        <Button onClick={handleAddNew} className="bg-green-600 hover:bg-green-700 gap-2">
          <Bell className="w-4 h-4" />
          {t('addNewsButton')}
        </Button>
      </div>

      <div className="space-y-3">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow relative overflow-hidden"
            style={{ animation: 'slowZoom 5.5s ease-in-out infinite' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="relative w-3 h-3">
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-admin"></span>
                    <span className="absolute inline-flex h-6 w-6 rounded-full bg-admin/30 -z-10 transform translate-x-0 translate-y-0 animate-ping"></span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="text-admin hover:text-admin hover:bg-admin/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id, item.title)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {/* Inject slow zoom keyframes for the admin news cards */}
        <style>{`@keyframes slowZoom {0%{transform:scale(1)}50%{transform:scale(1.02)}100%{transform:scale(1)}}`}</style>
      </div>

      {news.length === 0 && (
        <p className="text-center text-muted-foreground py-8">{t('noNewsMessage')}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNews ? t('editNewsTitle') : t('addNewsButton')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="News Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              placeholder="News Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px]"
              required
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {editingNews ? t('updateLabel') : t('publishNotifyButton')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
