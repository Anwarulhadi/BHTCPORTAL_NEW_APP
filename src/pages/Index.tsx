import { useState } from 'react';
import { StudentView } from '@/components/StudentView';
import { AdminView } from '@/components/AdminView';
import { NewsSection } from '@/components/NewsSection';
import { ContactSection } from '@/components/ContactSection';
import { StudentNotificationPanel } from '@/components/StudentNotificationPanel';
import { NotificationBanner } from '@/components/NotificationBanner';
import { Button } from '@/components/ui/button';
import { GraduationCap, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const [view, setView] = useState<'student' | 'admin'>('student');
  const { t } = useLanguage();

  const handleNewsClick = () => {
    document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen gradient-bg">
      <NotificationBanner />
      {/* Icons above header */}
      <div className="pt-4 pb-2">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex justify-center items-center gap-3">
          <div className="flex gap-3 flex-1 justify-center">
            <Button
              onClick={() => setView('student')}
              variant="outline"
              size="lg"
              className={
                view === 'student'
                  ? 'bg-student hover:bg-student/90 text-white rounded-full px-6 py-3 h-auto gap-2 border-2 border-student font-semibold'
                  : 'bg-white hover:bg-white/90 text-student rounded-full px-6 py-3 h-auto gap-2 border-2 border-student font-semibold'
              }
            >
              <GraduationCap className="w-5 h-5" />
              {t('studentPanelButton')}
            </Button>
            <Button
              onClick={() => setView('admin')}
              variant="outline"
              size="lg"
              className={
                view === 'admin' 
                  ? 'bg-admin hover:bg-admin/90 text-white rounded-full px-6 py-3 h-auto gap-2 border-2 border-admin font-semibold' 
                  : 'bg-white hover:bg-white/90 text-admin rounded-full px-6 py-3 h-auto gap-2 border-2 border-admin font-semibold'
              }
            >
              <Shield className="w-5 h-5" />
              {t('adminPanelButton')}
            </Button>
          </div>
          {view === 'student' && (
            <StudentNotificationPanel onNewsClick={handleNewsClick} />
          )}
        </div>
      </div>

      {/* Header */}
      <Card className="bg-gradient-student shadow-glow-student border-0 rounded-none">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <div className="text-center">
            {view === 'student' && (
              <>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white">
                  {t('studentPanelHeroTitle')}
                </h1>
                <p className="text-white text-base sm:text-lg mt-2">
                  {t('studentPanelHeroSubtitle')}
                </p>
              </>
            )}
            {view === 'admin' && (
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white">
                {t('adminPanelHeroTitle')}
              </h1>
            )}
          </div>
        </div>
      </Card>

      {view === 'student' ? (
        <div className="max-w-6xl mx-auto px-3 sm:px-6 space-y-6">
          <StudentView />
          <div id="news-section">
            <NewsSection />
          </div>
          <ContactSection />
        </div>
      ) : (
        <AdminView />
      )}

      {/* Language Switcher & Footer */}
      <div className="mt-8">
        <LanguageSwitcher />
      </div>
      <div className="py-6 text-center">
        <p className="text-sm text-white font-medium">
          {t('poweredBy')}{' '}
          <a
            href="https://t.me/AnwarulHadi1"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline cursor-pointer"
          >
            AnwarulHadi
          </a>
        </p>
      </div>
    </div>
  );
};

export default Index;
