import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { useLanguage, AppLanguage } from '@/contexts/LanguageContext';

interface LanguageSwitcherProps {
  direction?: 'up' | 'down';
  splashMode?: boolean;
}

export const LanguageSwitcher = ({ direction = 'up', splashMode = false }: LanguageSwitcherProps) => {
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

  const getButtonClasses = () => {
    const baseClasses = "gap-2 rounded-full transition-colors duration-300 font-semibold";
    
    if (splashMode) {
      // Smaller size for splash screen
      const splashClasses = `${baseClasses} px-4 py-2 h-auto text-xs`;
      if (open) {
        return `${splashClasses} bg-green-600 text-white hover:bg-green-700 border-green-600 border`;
      }
      return `${splashClasses} bg-white text-black hover:bg-gray-100 border-white border`;
    }
    
    // Default size
    return `${baseClasses} px-6 py-3 h-auto text-sm`;
  };

  const getLabel = (lang: AppLanguage) => {
    switch (lang) {
      case 'en': return t('englishLabel');
      case 'am': return t('amharicLabel');
      case 'or': return t('oromoLabel');
      case 'ar': return t('arabicLabel');
      default: return t('englishLabel');
    }
  };

  return (
    <div className="flex justify-center" ref={containerRef}>
      <div className="relative">
        <Button
          variant={splashMode ? "ghost" : "outline"}
          className={getButtonClasses()}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Globe className="w-4 h-4" />
          {t('languageButton')}: {getLabel(language)}
        </Button>
        {open && (
          <div className={`absolute left-1/2 -translate-x-1/2 bg-white border rounded-2xl shadow-xl w-56 p-4 space-y-3 z-30 ${
            direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-3'
          }`}>
            <div>
              <p className="text-sm font-semibold">{t('languageMenuTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('languageHint')}</p>
            </div>
            <div className="space-y-2">
              {(['en', 'am', 'or', 'ar'] as AppLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition ${
                    language === lang
                      ? 'border-admin text-admin bg-admin/10'
                      : 'border-transparent text-muted-foreground hover:border-border'
                  }`}
                >
                  <span>{getLabel(lang)}</span>
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
