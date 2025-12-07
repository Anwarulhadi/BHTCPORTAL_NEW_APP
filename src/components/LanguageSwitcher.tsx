import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { useLanguage, AppLanguage } from '@/contexts/LanguageContext';

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (value: AppLanguage) => {
    setLanguage(value);
    setOpen(false);
  };

  return (
    <div className="flex justify-center" ref={containerRef}>
      <div className="relative">
        <Button
          variant="outline"
          className="gap-2 rounded-full px-6 py-3 h-auto text-sm font-semibold"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Globe className="w-4 h-4" />
          {t('languageButton')}: {language === 'en' ? t('englishLabel') : t('amharicLabel')}
        </Button>
        {open && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white border rounded-2xl shadow-xl w-56 p-4 space-y-3 z-30">
            <div>
              <p className="text-sm font-semibold">{t('languageMenuTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('languageHint')}</p>
            </div>
            <div className="space-y-2">
              {(['en', 'am'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                    language === lang
                      ? 'border-admin text-admin bg-admin/10'
                      : 'border-transparent text-muted-foreground hover:border-border'
                  }`}
                >
                  <span>{lang === 'en' ? t('englishLabel') : t('amharicLabel')}</span>
                  {language === lang && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
