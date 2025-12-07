import { useState, useEffect, useRef } from 'react';
import apiClient from '@/integrations/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, User, Upload } from 'lucide-react';
import { toast } from 'sonner';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBackButton } from '@/contexts/BackButtonContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Teacher {
  id: string;
  name: string;
  phone: string;
  subject: string;
  photo_url?: string;
  telegram?: string;
}

export const TeacherManagement = () => {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: '',
    telegram: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [imgSrc, setImgSrc] = useState<string>('');
  const [imageViewerSrc, setImageViewerSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  useBackButton(() => {
    if (imgSrc) {
      setImgSrc('');
      return true;
    }
    if (showDialog) {
      setShowDialog(false);
      return true;
    }
    return false;
  });

  useEffect(() => {
    fetchTeachers();
    fetchSchoolPhone();
  }, []);

  const fetchTeachers = async () => {
    try {
      const data = await apiClient.getTeachers();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
      toast.error('Failed to load teachers');
    }
  };

  const fetchSchoolPhone = async () => {
    setSchoolPhone('[School Phone]');
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

  const uploadPhoto = async (teacherId: string): Promise<string | null> => {
    if (!photoFile) return null;
    try {
      const data = await apiClient.uploadFile(photoFile);
      return data?.url || null;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let photoUrl = editingTeacher?.photo_url || null;
      
      if (photoFile) {
        const tempId = editingTeacher?.id || `temp-${Date.now()}`;
        photoUrl = await uploadPhoto(tempId);
      }

      const teacherData: any = {
        name: formData.name,
        phone: formData.phone,
        subject: formData.subject,
        telegram: formData.telegram || null,
      };

      if (photoUrl) {
        teacherData.photo_url = photoUrl;
      }

      if (editingTeacher) {
        await apiClient.upsertTeacher({ id: editingTeacher.id, ...teacherData });
        toast.success('Teacher updated successfully!');
      } else {
        await apiClient.upsertTeacher(teacherData);
        toast.success('Teacher added successfully!');
      }

      setShowDialog(false);
      setEditingTeacher(null);
      setFormData({ name: '', phone: '', subject: '', telegram: '' });
      setPhotoFile(null);
      setPhotoPreview('');
      setImgSrc('');
      fetchTeachers();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save teacher');
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      phone: teacher.phone,
      subject: teacher.subject,
      telegram: teacher.telegram || '',
    });
    setPhotoPreview(teacher.photo_url || '');
    setShowDialog(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await apiClient.deleteTeacher(id);
        toast.success('Teacher deleted');
        fetchTeachers();
      } catch (err) {
        console.error('Failed to delete teacher', err);
        toast.error('Failed to delete teacher');
      }
    }
  };

  const handleAddNew = () => {
    setEditingTeacher(null);
    setFormData({ name: '', phone: '', subject: '', telegram: '' });
    setPhotoFile(null);
    setPhotoPreview('');
    setImgSrc('');
    setShowDialog(true);
  };

  return (
    <Card className="p-4 sm:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold">{t('teacherManagementTitle')}</h2>
        <Button onClick={handleAddNew} className="bg-admin hover:bg-admin/90 gap-2">
          <Plus className="w-4 h-4" />
          {t('addTeacherButton')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
          >
            <div className="flex items-start gap-3">
              {teacher.photo_url ? (
                <img
                  src={teacher.photo_url}
                  alt={teacher.name}
                  onClick={() => setImageViewerSrc(teacher.photo_url || '')}
                  className="w-16 h-16 rounded-full object-cover border-2 border-admin cursor-pointer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-admin relative">
                  <span className="absolute inset-0 rounded-full animate-ping bg-admin/20"></span>
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{teacher.name}</h3>
                <p className="text-sm text-muted-foreground">{teacher.subject}</p>
                <p className="text-sm">📞 {teacher.phone}</p>
                {teacher.telegram && <p className="text-sm">📱 @{teacher.telegram}</p>}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(teacher)}
                  className="text-admin hover:text-admin hover:bg-admin/10 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(teacher.id, teacher.name)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {teachers.length === 0 && (
        <p className="text-center text-muted-foreground py-8">{t('noTeacherInfo')}</p>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? t('editTeacherTitle') : t('addTeacherButton')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-admin"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-admin">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer flex flex-col items-center">
                <div className="flex items-center gap-1 text-sm text-admin hover:underline">
                  <Upload className="w-4 h-4" />
                  {t('uploadPhoto')}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <Input
              placeholder={t('teacherNamePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              placeholder={t('teacherPhonePlaceholder')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              placeholder={t('teacherSubjectPlaceholder')}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
            <Input
              placeholder={t('teacherTelegramPlaceholder')}
              value={formData.telegram}
              onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
            />

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="bg-admin hover:bg-admin/90">
                {editingTeacher ? t('updateLabel') : t('addTeacherButton')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
        {imageViewerSrc && (
          <Dialog open={!!imageViewerSrc} onOpenChange={() => setImageViewerSrc('')}>
            <DialogContent className="max-w-sm">
              <div className="flex items-center justify-center p-6 bg-blue-600 rounded-lg">
                <img src={imageViewerSrc} alt="Preview" className="w-48 h-48 rounded-full object-cover border-4 border-white" />
              </div>
            </DialogContent>
          </Dialog>
        )}

      {imgSrc && (
        <Dialog open={!!imgSrc} onOpenChange={() => setImgSrc('')}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crop Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img ref={imgRef} src={imgSrc} alt="Crop" className="max-h-96 mx-auto" />
              </ReactCrop>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setImgSrc('')}>Cancel</Button>
                <Button onClick={handleCropComplete} className="bg-admin hover:bg-admin/90">Apply Crop</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

