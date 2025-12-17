import { useState, useEffect, useRef } from 'react';
import apiClient from '@/integrations/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, Bell, Upload, Crop as CropIcon, X } from 'lucide-react';
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
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { supabase } from '@/integrations/supabase/client';

interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export const NewsManagement = () => {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Image Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Max dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const compressedFile = new File([blob], newName, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleCropComplete = async () => {
    const croppedBlob = await getCroppedImg();
    if (croppedBlob) {
      const file = new File([croppedBlob], 'cropped-news.jpg', { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(croppedBlob));
      setCrop(undefined);
      setCompletedCrop(undefined);
      toast.success('Image cropped successfully');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = editingNews?.image_url;

      if (photoFile) {
        const compressedFile = await compressImage(photoFile);
        const { url } = await apiClient.uploadFile(compressedFile, 'news-images');
        imageUrl = url;
      }

      const payload = {
        title,
        content,
        image_url: imageUrl
      };

      if (editingNews) {
        await apiClient.postNews({ id: editingNews.id, ...payload });
        toast.success('News updated successfully!');
      } else {
        await apiClient.postNews(payload);
        playNotificationSound();
        toast.success('News published!');
        
        // Send push notification
        try {
          const result = await apiClient.notifyNews({ title, content });
          if (result && result.success !== undefined) {
             toast.success(`Push sent to ${result.success} devices`);
          }
        } catch (notifyError: any) {
          console.error('Failed to send push notifications', notifyError);
          toast.warning('News published, but failed to send notifications');
        }
      }

      setShowDialog(false);
      setEditingNews(null);
      setTitle('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview('');
      fetchNews();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to save news: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

    const handleRenotify = async (item: News) => {
    if (!window.confirm(`Send push notification again for "${item.title}"?`)) return;
    
    try {
      playNotificationSound();
      toast.info('Sending notifications...');
      
      const result = await apiClient.notifyNews({ title: item.title, content: item.content });
      
      if (result && result.success !== undefined) {
         toast.success(`Push sent to ${result.success} devices`);
      } else if (result && result.message) {
         toast.info(`Push info: ${result.message}`);
      } else {
         toast.success('Push notifications sent');
      }
    } catch (notifyError: any) {
      console.error('Failed to send push notifications', notifyError);
      toast.error(`Failed to trigger push: ${notifyError.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    setTitle(newsItem.title);
    setContent(newsItem.content);
    setPhotoPreview(newsItem.image_url || '');
    setPhotoFile(null);
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
    setPhotoPreview('');
    setPhotoFile(null);
    setShowDialog(true);
  };

  return (
    <Card className="p-4 sm:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-primary">{t('newsManagementTitle')}</h2>
        <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90 gap-2">
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
            <div className="flex flex-col gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="relative w-3 h-3 flex-shrink-0">
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-admin"></span>
                    <span className="absolute inline-flex h-6 w-6 rounded-full bg-admin/30 -z-10 transform translate-x-0 translate-y-0 animate-ping"></span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{item.content}</p>
                <p className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              
              <div className="flex items-center justify-end gap-2 pt-3 border-t mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRenotify(item)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                  title="Re-notify"
                >
                  <Bell className="w-4 h-4 mr-1" />
                  {t('publishNotifyButton')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="text-admin hover:text-admin hover:bg-admin/10 h-8"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {t('edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id, item.title)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('delete')}
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
            <div className="space-y-2">
              <Input
                placeholder={t('newsTitlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Textarea
                placeholder={t('newsContentPlaceholder')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px]"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('newsImageLabel')}</label>
              <Input 
                type="file" 
                accept="image/*"
                onChange={handlePhotoChange}
                className="cursor-pointer"
              />
            </div>

            {photoPreview && (
              <div className="space-y-4 border rounded-lg p-2 bg-gray-50">
                <div className="relative w-full rounded-lg overflow-hidden">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={undefined}
                    className="max-h-[40vh]"
                  >
                    <img 
                        ref={imgRef}
                        src={photoPreview} 
                        alt="Preview" 
                        className="max-h-[40vh] w-auto mx-auto object-contain" 
                        crossOrigin="anonymous"
                    />
                  </ReactCrop>
                </div>
                
                <div className="flex justify-center gap-2">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm"
                        onClick={handleCropComplete}
                        disabled={!completedCrop?.width || !completedCrop?.height}
                        className="gap-2"
                    >
                        <CropIcon className="w-4 h-4" />
                        {t('cropSelection')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setPhotoPreview('');
                            setPhotoFile(null);
                        }}
                        className="text-destructive"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={uploading}>
                {uploading ? t('processing') : (editingNews ? t('save') : t('publishNotifyButton'))}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
