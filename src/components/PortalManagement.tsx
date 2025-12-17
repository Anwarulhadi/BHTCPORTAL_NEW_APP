import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Globe, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export const PortalManagement = () => {
  const { t } = useLanguage();
  const [isPortalEnabled, setIsPortalEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .select('is_portal_enabled')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsPortalEnabled(data.is_portal_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching portal settings:', error);
      toast.error('Failed to load portal settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setIsPortalEnabled(checked); // Optimistic update
    
    try {
      // First check if settings exist
      const { data: existing } = await supabase
        .from('school_settings')
        .select('id')
        .maybeSingle();

      let error;
      
      if (existing) {
        const { error: updateError } = await supabase
          .from('school_settings')
          .update({ is_portal_enabled: checked })
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('school_settings')
          .insert({ is_portal_enabled: checked });
        error = insertError;
      }

      if (error) throw error;
      
      toast.success(checked ? t('portalEnabledToast') : t('portalDisabledToast'));
    } catch (error) {
      console.error('Error updating portal settings:', error);
      toast.error('Failed to update portal settings');
      setIsPortalEnabled(!checked); // Revert on error
    }
  };

  return (
    <Card className="p-6 shadow-lg border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isPortalEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">{t('studentPortalAccess')}</h2>
            <p className="text-sm text-gray-500">
              {isPortalEnabled 
                ? t('portalActiveMessage') 
                : t('portalClosedMessageAdmin')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isPortalEnabled ? 'text-blue-600' : 'text-gray-500'}`}>
            {isPortalEnabled ? <Unlock className="w-4 h-4 inline mr-1" /> : <Lock className="w-4 h-4 inline mr-1" />}
            {isPortalEnabled ? t('active') : t('closed')}
          </span>
          <Switch
            checked={isPortalEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </div>
    </Card>
  );
};
