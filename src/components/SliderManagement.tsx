import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Upload, ArrowUp, ArrowDown, Save, Edit, Crop as CropIcon, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/integrations/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface SliderImage {
  id: string;
  image_url: string;
  sort_order: number;
  is_active?: boolean;
}

export const SliderManagement = () => {
  const { t } = useLanguage();
  const [images, setImages] = useState<SliderImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Cropping State
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
    fetchImages();

    // Realtime subscription for admin panel
    const channel = supabase
      .channel('public:hero_slider_admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hero_slider'
        },
        () => {
          fetchImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkConnection = () => {
    if (!supabase || !supabase.storage) {
      setConnectionError("Supabase client is not fully initialized. Storage is missing.");
      return;
    }
    // Check if URL is configured
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) {
      setConnectionError("VITE_SUPABASE_URL is missing in environment variables.");
    }
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      if (!supabase || !supabase.from) {
         throw new Error("Supabase client not initialized");
      }
      const { data, error } = await supabase
        .from('hero_slider')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      console.error('Error fetching slider images:', error);
      // Don't show toast on initial load if it's just empty
      if (error.code !== 'PGRST116') {
          toast.error(`Failed to load slider images: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (image: SliderImage) => {
    try {
      const newStatus = !image.is_active;
      const { error } = await supabase
        .from('hero_slider')
        .update({ is_active: newStatus })
        .eq('id', image.id);

      if (error) throw error;
      
      // Optimistic update
      setImages(images.map(img => 
        img.id === image.id ? { ...img, is_active: newStatus } : img
      ));
      
      toast.success(newStatus ? 'Image is now visible' : 'Image is now hidden');
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Failed to update visibility');
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

          // Max dimensions (Increased for better quality)
          const MAX_WIDTH = 2560;
          const MAX_HEIGHT = 1440;
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
                // Ensure filename ends in .jpg
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
            0.95 // Quality (Increased to 95%)
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
      const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(croppedBlob));
      setCrop(undefined);
      setCompletedCrop(undefined);
      toast.success('Image cropped successfully');
    }
  };

  const handleUpload = async () => {
    if (!photoFile) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      // Compress before upload (High Quality)
      const compressedFile = await compressImage(photoFile);
      // const compressedFile = photoFile; // Raw upload disabled
      
      const { url } = await apiClient.uploadFile(compressedFile, 'hero-slider');
      
      if (url) {
        if (editingImageId) {
            // Update existing image
            const { error } = await supabase
                .from('hero_slider')
                .update({ image_url: url })
                .eq('id', editingImageId);
            
            if (error) throw error;
            toast.success('Image updated successfully');
        } else {
            // Insert new image
            const { error } = await supabase
            .from('hero_slider')
            .insert([{
                image_url: url,
                sort_order: images.length
            }]);

            if (error) throw error;
            toast.success('Image uploaded successfully');
        }
        
        setIsDialogOpen(false);
        setPhotoFile(null);
        setPhotoPreview('');
        setEditingImageId(null);
        fetchImages();
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      // Show FULL error details
      const errorMsg = error?.message || error?.error_description || JSON.stringify(error);
      toast.error(`Upload failed: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (image: SliderImage) => {
      setEditingImageId(image.id);
      setPhotoPreview(image.image_url);
      setPhotoFile(null); // Reset file input, we are starting with a URL
      setIsDialogOpen(true);
  };

  const openAddDialog = () => {
      setEditingImageId(null);
      setPhotoPreview('');
      setPhotoFile(null);
      setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const { error } = await supabase
        .from('hero_slider')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Image deleted successfully');
      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    
    // Update local state immediately for UI responsiveness
    setImages(newImages);

    try {
      // Update all order indexes in DB
      const updates = newImages.map((img, idx) => ({
        id: img.id,
        image_url: img.image_url,
        sort_order: idx
      }));

      const { error } = await supabase
        .from('hero_slider')
        .upsert(updates);

      if (error) throw error;
    } catch (error) {
      console.error('Error reordering images:', error);
      toast.error('Failed to save order');
      fetchImages(); // Revert on error
    }
  };

  return (
    <Card className="w-full shadow-lg mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <CardTitle className="text-primary">{t('sliderManagement')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchImages} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
        </div>
        <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> {t('addImage')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div key={image.id} className="relative group bg-white rounded-lg overflow-hidden shadow-sm border flex flex-col">
              <div className="aspect-video w-full relative">
                <img 
                  src={image.image_url} 
                  alt={`Slide ${index + 1}`} 
                  className={`w-full h-full object-cover ${image.is_active === false ? 'opacity-50 grayscale' : ''}`}
                />
              </div>
              
              <div className="p-1.5 flex flex-wrap items-center justify-center gap-1 bg-gray-50 border-t">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 bg-white hover:bg-gray-100"
                  onClick={() => openEditDialog(image)}
                >
                  <Edit className="h-3 w-3 text-blue-600" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 bg-white hover:bg-gray-100"
                  onClick={() => handleToggleVisibility(image)}
                  title={image.is_active !== false ? "Hide Image" : "Show Image"}
                >
                  {image.is_active !== false ? (
                    <Eye className="h-3 w-3 text-green-600" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-gray-400" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 bg-white hover:bg-red-50 border-red-100"
                  onClick={() => handleDelete(image.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
          {connectionError && (
            <div className="col-span-full p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Connection Error:</strong> {connectionError}
              <br/>
              Please check your internet connection and ensure the app is built with the correct environment variables.
            </div>
          )}
          
          {images.length === 0 && !loading && (
            <div className="col-span-full text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              <p className="mb-2">No custom slider images found.</p>
              <p className="text-sm text-gray-400">The home screen is currently using the default built-in images.</p>
              <p className="text-sm text-gray-400 mt-2">Upload images here to override the defaults.</p>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingImageId ? t('editSlide') : t('addSlide')}</DialogTitle>
            {editingImageId && <p className="text-sm text-muted-foreground">Upload a new image or crop the existing one to replace it.</p>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('slideImage')}</Label>
              <div className="flex items-center gap-4">
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
            
            {photoPreview && (
              <div className="space-y-4">
                <div className="relative w-full rounded-lg overflow-hidden border bg-black/5">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    // Free crop (no aspect ratio)
                    aspect={undefined}
                    className="max-h-[60vh]"
                  >
                    <img 
                        ref={imgRef}
                        src={photoPreview} 
                        alt="Preview" 
                        className="max-h-[60vh] w-auto mx-auto object-contain" 
                        crossOrigin="anonymous"
                    />
                  </ReactCrop>
                </div>
                
                <div className="flex justify-center">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleCropComplete}
                        disabled={!completedCrop?.width || !completedCrop?.height}
                        className="gap-2"
                    >
                        <CropIcon className="w-4 h-4" />
                        {t('cropSelection')}
                    </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
              <Button 
                onClick={handleUpload} 
                disabled={uploading || !photoFile}
                className={editingImageId ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {uploading ? t('processing') : (editingImageId ? "Update" : t('saveSlide'))}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
