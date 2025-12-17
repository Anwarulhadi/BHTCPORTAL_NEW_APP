import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import apiClient from '@/integrations/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Phone, Save, Plus, X, Upload, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBackButton } from '@/contexts/BackButtonContext';

interface SchoolSettings {
  id: string;
  school_phone: string;
  school_admin_text: string;
  photo_url?: string;
}

export const ContactManagement = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    school_admin_text: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  useBackButton(() => {
    if (imgSrc) {
      setImgSrc('');
      return true;
    }
    return false;
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }
      
      if (data) {
        setSettings(data as SchoolSettings);
        const phones = data.school_phone.split(',').map((p: string) => p.trim());
        setPhoneNumbers(phones.length > 0 ? phones : ['']);
        setFormData({
          school_admin_text: data.school_admin_text,
        });
        if (data.photo_url) {
          setPhotoPreview(data.photo_url);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching settings:', err);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImgSrc(reader.result as string);
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
      setImgSrc('');
      toast.success('Image cropped successfully');
    }
  };

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validPhones = phoneNumbers.filter(p => p.trim());
    if (validPhones.length === 0 || !formData.school_admin_text.trim()) {
      toast.error('Please add at least one phone number and contact text');
      return;
    }

    setIsLoading(true);

    try {
      let photoUrl = settings?.photo_url;

      if (photoFile) {
        const uploadResult = await apiClient.uploadFile(photoFile);
        photoUrl = uploadResult.url;
      }

      const phoneString = validPhones.join(', ');
      
      if (settings) {
        const { error } = await supabase
          .from('school_settings')
          .update({
            school_phone: phoneString,
            school_admin_text: formData.school_admin_text.trim(),
            photo_url: photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
        
        if (error) throw error;
        toast.success('Contact information updated successfully!');
      } else {
        const { error } = await supabase
          .from('school_settings')
          .insert({
            school_phone: phoneString,
            school_admin_text: formData.school_admin_text.trim(),
            photo_url: photoUrl,
          });
        
        if (error) throw error;
        toast.success('Contact information saved successfully!');
      }

      fetchSettings();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save contact information: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-5 h-5 text-primary" />
        <h2 className="text-lg sm:text-xl font-bold text-primary">{t('contactInformationManagementTitle')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="relative">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="School Admin" 
                className="w-24 h-24 rounded-full object-cover border-4 border-admin"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-admin">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            <label 
              htmlFor="photo-upload" 
              className="absolute bottom-0 right-0 p-1.5 bg-admin rounded-full text-white cursor-pointer hover:bg-admin/90 transition-colors shadow-lg"
            >
              <Upload className="w-3 h-3" />
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">{t('uploadPhoto')}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {t('schoolPhoneNumbersLabel')}
            </label>
            <Button
              type="button"
              onClick={addPhoneNumber}
              size="sm"
              variant="outline"
              className="gap-1 text-admin border-admin"
            >
              <Plus className="w-3 h-3" />
              {t('addPhoneNumberButton')}
            </Button>
          </div>
          <div className="space-y-2">
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="e.g., +251-XXX-XXX-XXX"
                  value={phone}
                  onChange={(e) => updatePhoneNumber(index, e.target.value)}
                  required
                />
                {phoneNumbers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePhoneNumber(index)}
                    className="text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            {t('contactTextLabel')}
          </label>
          <Input
            type="text"
            placeholder={t('contactTextPlaceholder')}
            value={formData.school_admin_text}
            onChange={(e) => setFormData({ ...formData, school_admin_text: e.target.value })}
            required
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-admin hover:bg-admin/90 gap-2"
          disabled={isLoading}
        >
          <Save className="w-4 h-4" />
          {isLoading ? t('savingLabel') : t('saveContactInformationButton')}
        </Button>
      </form>

      {settings && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">{t('currentSettingsLabel')}</p>
          <p className="text-sm">📞 {settings.school_phone}</p>
          <p className="text-sm mt-1">📝 {settings.school_admin_text}</p>
        </div>
      )}

      <Dialog open={!!imgSrc} onOpenChange={() => setImgSrc('')}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('cropImage')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  onLoad={(e) => {
                    const { width, height } = e.currentTarget;
                    const size = Math.min(width, height);
                    const x = (width - size) / 2;
                    const y = (height - size) / 2;
                    setCrop({
                      unit: 'px',
                      x,
                      y,
                      width: size,
                      height: size,
                    });
                  }}
                  className="max-h-[60vh] object-contain"
                />
              </ReactCrop>
            )}
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={() => setImgSrc('')}>
                {t('cancel')}
              </Button>
              <Button onClick={handleCropComplete}>
                {t('applyCrop')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};