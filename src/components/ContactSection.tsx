import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Phone, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Teacher {
  id: string;
  name: string;
  phone: string;
  subject: string;
  photo_url?: string;
  telegram?: string;
}

interface SchoolSettings {
  school_phone: string;
  school_admin_text: string;
}

export const ContactSection = () => {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  const fetchTeachers = useCallback(async () => {
    const ordered = await supabase
      .from('teachers')
      .select('*')
      .order('name', { ascending: true });

    if (ordered.error) {
      console.error('Failed to fetch teachers:', ordered.error);
      return;
    }

    if (ordered.data) {
      setTeachers(ordered.data as Teacher[]);
    }
  }, []);

  const fetchSchoolSettings = useCallback(async () => {
    const { data } = await supabase
      .from('school_settings')
      .select('*')
      .single();
    
    if (data) setSchoolSettings(data as SchoolSettings);
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchSchoolSettings();
  }, [fetchTeachers, fetchSchoolSettings]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const channel = supabase
      .channel('teachers-contact-order')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        () => {
          clearTimeout(timeout);
          timeout = setTimeout(fetchTeachers, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [fetchTeachers]);

  return (
    <Card className="p-4 sm:p-6 shadow-lg bg-gradient-to-br from-green-50 to-white border-2 border-green-500">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-6 h-6 text-green-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-green-800">{t('contactInformationHeading')}</h2>
      </div>
      
      {/* School Contact */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-green-200">
        <h3 className="font-bold text-green-700 mb-2">{schoolSettings?.school_admin_text || t('contactAdminSectionTitle')}</h3>
        <p className="text-green-700 mb-2">📞 {t('contactSchoolAdmin')}</p>
        {schoolSettings?.school_phone ? (
          schoolSettings.school_phone.split(',').map((phone, index) => (
            <a 
              key={index}
              href={`tel:${phone.trim()}`}
              className="block text-green-600 font-semibold hover:underline mb-1"
            >
              {t('phoneLabel')}: {phone.trim()}
            </a>
          ))
        ) : (
          <p className="text-green-600 font-semibold">{t('phoneLabel')}: [School Phone Number]</p>
        )}
      </div>

      {/* Teachers */}
      <div>
        <h3 className="font-bold text-green-700 mb-3">{t('ourTeachersHeading')}</h3>
        {teachers.length === 0 ? (
          <p className="text-center text-green-500 py-4">{t('noTeacherInfo')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="p-3 bg-white rounded-lg border border-green-200 flex items-center gap-3 hover:shadow-md transition-shadow">
                {teacher.photo_url ? (
                  <img
                    src={teacher.photo_url}
                    alt={teacher.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-green-400"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-400">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800">{teacher.name}</h4>
                  <p className="text-xs text-green-600">{teacher.subject}</p>
                  <a 
                    href={`tel:${teacher.phone}`}
                    className="text-sm text-green-600 font-medium hover:underline block"
                  >
                    📞 {teacher.phone}
                  </a>
                  {teacher.telegram && (
                    <a
                      href={`https://t.me/${teacher.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:underline block"
                    >
                      📱 @{teacher.telegram}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
