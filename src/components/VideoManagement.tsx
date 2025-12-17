import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Trash2, Edit, Plus, Save, X, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getYouTubeThumbnail } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

import { Textarea } from '@/components/ui/textarea';

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  course_category: 'Cinematography' | 'Editing';
  sub_category?: string;
  is_visible: boolean;
  order_index: number;
  description?: string;
}

export const VideoManagement = () => {
  const { t } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<'Cinematography' | 'Editing'>('Cinematography');
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    thumbnail_url: '',
    course_category: 'Cinematography' as 'Cinematography' | 'Editing',
    sub_category: '',
    is_visible: true,
    order_index: 0,
    description: '',
  });
  const [existingSubCategories, setExistingSubCategories] = useState<string[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState<{old: string, new: string} | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
      const subs = Array.from(new Set(videos
          .filter(v => v.course_category === activeTab)
          .map(v => v.sub_category)
          .filter(Boolean)
      )) as string[];
      
      // Add default subcategories for Editing if not present
      if (activeTab === 'Editing') {
          if (!subs.includes('Premiere Pro')) subs.push('Premiere Pro');
          if (!subs.includes('Photoshop')) subs.push('Photoshop');
      }
      
      setExistingSubCategories(subs);
  }, [videos, activeTab]);

  // Handle Back Button for Dialog
  useEffect(() => {
    if (isDialogOpen) {
      const state = { modal: 'videoManagement' };
      window.history.pushState(state, '', window.location.href);

      const handlePopState = () => {
        setIsDialogOpen(false);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isDialogOpen]);

  const handleCloseDialog = () => {
    if (window.history.state?.modal === 'videoManagement') {
      window.history.back();
    } else {
      setIsDialogOpen(false);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingVideo) {
        const { error } = await supabase
          .from('videos')
          .update(formData)
          .eq('id', editingVideo.id);
        
        if (error) throw error;
        toast.success('Video updated successfully');
      } else {
        const { error } = await supabase
          .from('videos')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Video added successfully');
      }
      
      handleCloseDialog();
      setEditingVideo(null);
      resetForm();
      fetchVideos();
    } catch (error: any) {
      console.error('Error saving video:', error);
      toast.error(`Failed to save video: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Video deleted successfully');
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleToggleVisibility = async (video: Video) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_visible: !video.is_visible })
        .eq('id', video.id);

      if (error) throw error;
      fetchVideos();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
      if (!confirm(`Are you sure you want to delete category "${categoryName}"? This will delete ALL videos in this category!`)) return;
      
      try {
          const { error } = await supabase
              .from('videos')
              .delete()
              .eq('course_category', activeTab)
              .eq('sub_category', categoryName);
              
          if (error) throw error;
          toast.success(`Category "${categoryName}" and its videos deleted`);
          fetchVideos();
      } catch (error: any) {
          console.error('Error deleting category:', error);
          toast.error(`Failed to delete category: ${error.message}`);
      }
  };

  const handleUpdateCategoryName = async () => {
      if (!editingCategoryName || !editingCategoryName.new.trim()) return;
      
      try {
          const { error } = await supabase
              .from('videos')
              .update({ sub_category: editingCategoryName.new })
              .eq('course_category', activeTab)
              .eq('sub_category', editingCategoryName.old);
              
          if (error) throw error;
          toast.success('Category updated');
          setEditingCategoryName(null);
          fetchVideos();
      } catch (error: any) {
          console.error('Error updating category:', error);
          toast.error(`Failed to update category: ${error.message}`);
      }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      thumbnail_url: '',
      course_category: activeTab,
      sub_category: '',
      is_visible: true,
      order_index: videos.length,
      description: '',
    });
  };

  const openEditDialog = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      url: video.url,
      thumbnail_url: video.thumbnail_url || '',
      course_category: video.course_category,
      sub_category: video.sub_category || '',
      is_visible: video.is_visible,
      order_index: video.order_index,
      description: video.description || '',
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingVideo(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const VideoList = ({ category }: { category: 'Cinematography' | 'Editing' }) => {
    const categoryVideos = videos.filter(v => v.course_category === category);

    return (
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        {categoryVideos.map((video) => (
          <div key={video.id} className="flex flex-col justify-between p-2 sm:p-4 bg-white border rounded-lg shadow-sm gap-2 h-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 overflow-hidden w-full">
              <div className="w-full sm:w-24 h-24 sm:h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                <img 
                  src={video.thumbnail_url || getYouTubeThumbnail(video.url) || 'https://placehold.co/160x90?text=No+Image'} 
                  alt={video.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/160x90?text=No+Image';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 w-full">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 break-words">{video.title}</h4>
                <p className="text-xs sm:text-sm text-gray-500 truncate w-full">{video.url}</p>
                <div className="flex items-center mt-1 space-x-2 flex-wrap gap-y-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${video.is_visible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {video.is_visible ? t('active') : t('closed')}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{t('orderIndexLabel')}: {video.order_index}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1 pt-2 border-t mt-auto w-full">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                onClick={() => handleToggleVisibility(video)}
              >
                {video.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1">{video.is_visible ? t('active') : t('closed')}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-admin hover:text-admin hover:bg-admin/10 h-8 px-2"
                onClick={() => openEditDialog(video)}
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">{t('edit')}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                onClick={() => handleDelete(video.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">{t('delete')}</span>
              </Button>
            </div>
          </div>
        ))}
        {categoryVideos.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500">{t('noVideosInCategory')}</div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="flex flex-col gap-4">
        <CardTitle className="text-primary">{t('videoManagement')}</CardTitle>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)}>
                Manage Categories
            </Button>
            <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> {t('addVideo')}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'Cinematography' | 'Editing')}>
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger 
              value="Cinematography"
              className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-primary border border-primary"
            >
              {t('cinematography')}
            </TabsTrigger>
            <TabsTrigger 
              value="Editing"
              className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-primary border border-primary"
            >
              {t('videoEditing')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="Cinematography">
            <VideoList category="Cinematography" />
          </TabsContent>
          <TabsContent value="Editing">
            <VideoList category="Editing" />
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo ? t('editVideo') : t('addVideo')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('title')}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Video Title"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('videoUrl')}</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="YouTube URL"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Video Description"
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Sub Category</Label>
              <Select 
                  value={formData.sub_category} 
                  onValueChange={(val) => setFormData({ ...formData, sub_category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or add new" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingSubCategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Category</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            {formData.sub_category === 'new' && (
                <div className="space-y-2">
                <Label>New Category Name</Label>
                <Input 
                    value={formData.sub_category === 'new' ? '' : formData.sub_category} 
                    onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                    placeholder="Enter new category name"
                />
                </div>
            )}
            <div className="space-y-2">
              <Label>{t('orderIndexLabel')}</Label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Categories ({activeTab === 'Editing' ? t('videoEditing') : activeTab})</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {existingSubCategories.length === 0 ? (
                        <p className="text-center text-gray-500">No custom categories found.</p>
                    ) : (
                        <div className="space-y-2">
                            {existingSubCategories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                    {editingCategoryName?.old === cat ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input 
                                                value={editingCategoryName.new} 
                                                onChange={(e) => setEditingCategoryName({...editingCategoryName, new: e.target.value})}
                                            />
                                            <Button size="sm" onClick={handleUpdateCategoryName}><Save className="w-4 h-4" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingCategoryName(null)}><X className="w-4 h-4" /></Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium">{cat}</span>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCategoryName({old: cat, new: cat})}>
                                                    <Edit className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(cat)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="pt-4 border-t">
                        <p className="text-sm text-gray-500 mb-2">To add a new category, use the "Add Video" button and select "Add New Category".</p>
                        <Button className="w-full" variant="outline" onClick={() => setIsCategoryManagerOpen(false)}>Close</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog> 
    </Card>
  );
};
