import { useEffect, useState } from 'react';
import apiClient from '@/integrations/apiClient';
import { Card } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface News {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

interface NewsSectionProps {
  highlightedNewsId?: string | null;
}

export const NewsSection = ({ highlightedNewsId }: NewsSectionProps) => {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);

  // Keyframes for slow zoom in/out used on news cards
  const slowZoomKeyframes = `
    @keyframes slowZoom {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    @keyframes highlightPulse {
      0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
      100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
    }
  `;

  useEffect(() => {
    fetchNews();
    // Real-time not available on scaffold backend; consider polling or WS later.
  }, []);

  useEffect(() => {
    if (highlightedNewsId && news.length > 0) {
      const element = document.getElementById(`news-${highlightedNewsId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedNewsId, news]);

  const fetchNews = async () => {
    try {
      const data = await apiClient.listNews();
      setNews(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (err) {
      console.error('Failed to fetch news', err);
    }
  };

  return (
    <Card id="news-section" className="p-4 sm:p-6 shadow-lg bg-gradient-to-br from-primary/5 to-white border-2 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-6 h-6 text-primary" />
        <h2 className="text-xl sm:text-2xl font-bold text-primary">{t('schoolNewsHeading')}</h2>
      </div>
      
      {news.length === 0 ? (
        <p className="text-center text-gray-500 py-4">{t('noAnnouncements')}</p>
      ) : (
        <div className="space-y-3">
          {news.map((item) => {
            const isHighlighted = item.id === highlightedNewsId;
            return (
            <div
              key={item.id}
              id={`news-${item.id}`}
              className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                isHighlighted 
                  ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' 
                  : 'bg-white border-primary/20'
              }`}
              style={{ 
                animation: isHighlighted ? 'highlightPulse 2s infinite' : 'slowZoom 6s ease-in-out infinite' 
              }}
            >
              <h3 className="font-bold text-primary mb-2 flex items-center gap-3">
                <span className="relative inline-flex w-3 h-3">
                  <span className="absolute inline-flex h-3 w-3 rounded-full bg-primary"></span>
                  <span className="absolute inline-flex h-6 w-6 rounded-full bg-primary/30 -z-10 transform translate-x-0 translate-y-0 animate-ping"></span>
                </span>
                {item.title}
              </h3>
              
              {item.image_url && (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-100">
                  <img 
                    src={item.image_url} 
                    alt={item.title} 
                    className="w-full h-auto object-cover max-h-[300px]"
                    loading="lazy"
                  />
                </div>
              )}

              <p className="text-gray-700 text-sm mb-2 transform-gpu whitespace-pre-wrap">{item.content}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          );
          })}
        </div>
      )}
      {/* Inject keyframes for slow zoom animation */}
      <style>{slowZoomKeyframes}</style>
    </Card>
  );
};