import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/integrations/apiClient';
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
  photo_url?: string;
}

export const ContactSection = () => {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const [teachersData, settingsData] = await Promise.all([
        apiClient.getTeachers(),
        apiClient.getSchoolSettings()
      ]);

      if (Array.isArray(teachersData)) {
        // Sort teachers alphabetically by name
        const sortedTeachers = [...teachersData].sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(sortedTeachers);
      }

      if (settingsData) {
        setSchoolSettings(settingsData);
      }
    } catch (e) {
      console.error("Failed to fetch contact info", e);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return (
    <Card className="p-4 sm:p-6 shadow-lg bg-gradient-to-br from-green-50 to-white border-2 border-green-500">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-6 h-6 text-green-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-green-800">{t('contactInformationHeading')}</h2>
      </div>
      
      {/* School Contact */}
      <div className="mb-6">
        <div className="p-4 bg-white rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
          {schoolSettings?.photo_url ? (
            <img 
              src={schoolSettings.photo_url} 
              alt="School Admin" 
              className="w-12 h-12 rounded-full object-cover border-2 border-green-100"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-200">
              <User className="w-6 h-6 text-green-600" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-green-800 truncate">
              {schoolSettings?.school_admin_text || t('contactAdminSectionTitle')}
            </h3>
            <p className="text-sm text-green-600 mb-1 truncate">
              {t('contactSchoolAdmin')}
            </p>
            
            {schoolSettings?.school_phone ? (
              schoolSettings.school_phone.split(',').map((phone, index) => (
                <a 
                  key={index}
                  href={`tel:${phone.trim()}`}
                  className="text-sm text-gray-600 hover:text-green-600 block truncate"
                >
                  📞 {phone.trim()}
                </a>
              ))
            ) : (
              <p className="text-sm text-gray-600 block truncate">
                📞 [School Phone Number]
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Teachers Contact */}
      <div>
        <h3 className="font-bold text-green-700 mb-4">{t('contactTeachersSectionTitle')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {teachers.map((teacher) => (
            <div 
              key={teacher.id} 
              className="p-4 bg-white rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
            >
              {teacher.photo_url ? (
                <img 
                  src={teacher.photo_url} 
                  alt={teacher.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-green-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-200">
                  <User className="w-6 h-6 text-green-600" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-green-800 truncate">{teacher.name}</h4>
                <p className="text-sm text-green-600 mb-1 truncate">{teacher.subject}</p>
                <a 
                  href={`tel:${teacher.phone}`}
                  className="text-sm text-gray-600 hover:text-green-600 block truncate"
                >
                  📞 {teacher.phone}
                </a>
                {teacher.telegram && (
                  <a 
                    href={teacher.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline block truncate mt-1"
                  >
                    Telegram
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        {teachers.length === 0 && (
          <p className="text-center text-gray-500 py-4">{t('noTeachersContact')}</p>
        )}
      </div>
    </Card>
  );
};
