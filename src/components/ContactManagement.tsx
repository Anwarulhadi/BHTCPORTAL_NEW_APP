import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Phone, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface SchoolSettings {
  id: string;
  school_phone: string;
  school_admin_text: string;
}

export const ContactManagement = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    school_admin_text: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('school_settings')
      .select('*')
      .single();
    
    if (data) {
      setSettings(data as SchoolSettings);
      const phones = data.school_phone.split(',').map((p: string) => p.trim());
      setPhoneNumbers(phones.length > 0 ? phones : ['']);
      setFormData({
        school_admin_text: data.school_admin_text,
      });
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
      const phoneString = validPhones.join(', ');
      
      if (settings) {
        const { error } = await supabase
          .from('school_settings')
          .update({
            school_phone: phoneString,
            school_admin_text: formData.school_admin_text.trim(),
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
          });
        
        if (error) throw error;
        toast.success('Contact information saved successfully!');
      }

      fetchSettings();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save contact information');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-5 h-5 text-admin" />
        <h2 className="text-lg sm:text-xl font-bold">{t('contactInformationManagementTitle')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
    </Card>
  );
};