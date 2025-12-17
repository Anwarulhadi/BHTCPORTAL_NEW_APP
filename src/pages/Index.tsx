import { useState, Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { StudentView } from '@/components/StudentView';
// Lazy load AdminView to prevent Supabase initialization on startup
const AdminView = lazy(() => import('@/components/AdminView').then(module => ({ default: module.AdminView })));
import { NewsSection } from '@/components/NewsSection';
import { VideoSection } from '@/components/VideoSection';
import { ModuleSection } from '@/components/ModuleSection';
import { ContactSection } from '@/components/ContactSection';
import { StudentNotificationPanel } from '@/components/StudentNotificationPanel';
import { NotificationBanner } from '@/components/NotificationBanner';
import { Button } from '@/components/ui/button';
import { GraduationCap, Shield, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

const HERO_IMAGES = [
  '/hero-slides/slide (1).jpg',
  '/hero-slides/slide (2).jpg',
  '/hero-slides/slide (3).jpg',
  '/hero-slides/slide (4).jpg',
  '/hero-slides/slide (5).jpg',
  '/hero-slides/slide (6).jpg',
  '/hero-slides/slide (7).jpg',
  '/hero-slides/slide (8).jpg',
  '/hero-slides/slide (9).jpg',
  '/hero-slides/slide (10).jpg',
  '/hero-slides/slide (11).jpg',
  '/hero-slides/slide (12).jpg',
  '/hero-slides/slide (13).jpg',
  '/hero-slides/slide (14).jpg',
  '/hero-slides/slide (15).jpg',
  '/hero-slides/slide (16).jpg',
];

const Index = () => {
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroImages, setHeroImages] = useState<string[]>(HERO_IMAGES);
  const [highlightedNewsId, setHighlightedNewsId] = useState<string | null>(null);
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).scrollTo) {
      const sectionId = (location.state as any).scrollTo;
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, [location]);

  useEffect(() => {
    const handleNavigateToNews = (event: CustomEvent<string>) => {
      const newsId = event.detail;
      setView('student');
      setHighlightedNewsId(newsId);
      // Wait for render then scroll
      setTimeout(() => {
        document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    window.addEventListener('navigate-to-news' as any, handleNavigateToNews);
    return () => {
      window.removeEventListener('navigate-to-news' as any, handleNavigateToNews);
    };
  }, []);

  useEffect(() => {
    const fetchSliderImages = async () => {
      try {
        const { data } = await supabase
          .from('hero_slider')
          .select('image_url')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (data && data.length > 0) {
          setHeroImages(data.map(img => img.image_url));
        } else {
          setHeroImages(HERO_IMAGES);
        }
      } catch (error) {
        console.error('Error fetching slider images:', error);
      }
    };
    
    fetchSliderImages();

    // Realtime subscription
    const channel = supabase
      .channel('public:hero_slider_home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hero_slider'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          fetchSliderImages();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages]);

  const handleAdminClick = () => {
    if (view === 'admin') return;
    
    const now = Date.now();
    
    // If it's the first tap or too much time has passed since the last tap
    if (adminTapCount === 0 || (now - lastTapTime > 300)) {
      setAdminTapCount(1);
      setLastTapTime(now);
      return;
    }

    // Consecutive fast tap
    const newCount = adminTapCount + 1;
    setAdminTapCount(newCount);
    setLastTapTime(now);
    
    if (newCount >= 4) {
      setView('admin');
      setAdminTapCount(0);
      toast.success("Admin Access Unlocked");
    }
  };

  const handleNewsClick = (newsId: string) => {
    setHighlightedNewsId(newsId);
    document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen gradient-bg">
      <NotificationBanner />
      {/* Icons above header */}
      <div className="pt-4 pb-2">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-wrap justify-center items-center gap-3">
          <div className="flex flex-wrap gap-3 flex-1 justify-center">
            <Button
              onClick={() => setView('student')}
              variant="outline"
              size="lg"
              className={
                view === 'student'
                  ? 'bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-3 h-auto gap-2 border-2 border-white/20 font-semibold shadow-lg active:bg-primary active:text-white focus:bg-primary focus:text-white focus:ring-0 focus-visible:ring-0'
                  : 'bg-white hover:bg-white/90 text-primary rounded-full px-6 py-3 h-auto gap-2 border-2 border-white/20 font-semibold shadow-lg active:bg-white active:text-primary focus:bg-white focus:text-primary focus:ring-0 focus-visible:ring-0'
              }
            >
              <GraduationCap className="w-5 h-5" />
              {t('studentPanelButton')}
            </Button>
            <Button
              onClick={handleAdminClick}
              variant="outline"
              size="lg"
              className={
                view === 'admin' 
                  ? 'bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-3 h-auto gap-2 border-2 border-white/20 font-semibold shadow-lg active:bg-primary active:text-white focus:bg-primary focus:text-white focus:ring-0 focus-visible:ring-0' 
                  : 'bg-white text-primary/70 rounded-full px-6 py-3 h-auto gap-2 border-2 border-white/20 font-semibold shadow-lg cursor-default hover:bg-white active:bg-white active:text-primary/70 focus:bg-white focus:text-primary/70 active:scale-100 transition-none focus:ring-0 focus-visible:ring-0'
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
      <Card className="relative bg-black shadow-lg border-0 rounded-none mb-6 overflow-hidden min-h-[200px] flex items-end">
        {/* Slider Background */}
        <div className="absolute inset-0 z-0">
          {heroImages.map((img, index) => {
            const isActive = index === currentSlide;
            const isPrev = index === (currentSlide - 1 + heroImages.length) % heroImages.length;
            const shouldAnimate = isActive || isPrev;
            
            return (
            <div
              key={`${img}-${index}`}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out overflow-hidden ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={img}
                alt={`Slide ${index + 1}`}
                className={`w-full h-full object-cover ${
                  shouldAnimate 
                    ? (index % 2 === 0 ? 'animate-ken-burns-in' : 'animate-ken-burns-out') 
                    : ''
                }`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            );
          })}
          {/* Gradient Overlay - Bottom Half Only */}
          <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pb-4 w-full">
          <div className="text-center">
            {view === 'student' && (
              <>
                <h1 className="text-sm sm:text-base font-bold leading-tight text-white drop-shadow-md">
                  {t('studentPanelHeroTitle')}
                </h1>
                <p className="text-white/90 text-[10px] sm:text-xs mt-1 font-medium drop-shadow-sm">
                  {t('studentPanelHeroSubtitle')}
                </p>
              </>
            )}
            {view === 'admin' && (
              <h1 className="text-sm sm:text-base font-bold leading-tight text-white drop-shadow-md">
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
            <NewsSection highlightedNewsId={highlightedNewsId} />
          </div>
          <div id="module-section">
            <ModuleSection />
          </div>
          <div id="video-section">
            <VideoSection />
          </div>
          <div id="contact-section">
            <ContactSection />
          </div>
        </div>
      ) : (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <AdminView />
        </Suspense>
      )}

      {/* Footer */}
      <div className="mt-8 py-6 text-center space-y-4 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <p className="text-sm text-primary font-bold">
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
