import { useEffect, useState } from 'react';
import apiClient from '@/integrations/apiClient';
import { Card } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface News {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export const NewsSection = () => {
  const { t } = useLanguage();
  const [news, setNews] = useState<News[]>([]);

  // Keyframes for slow zoom in/out used on news cards
  const slowZoomKeyframes = `
    @keyframes slowZoom {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
  `;

  useEffect(() => {
    fetchNews();
    // Real-time not available on scaffold backend; consider polling or WS later.
  }, []);

  const fetchNews = async () => {
    try {
      const data = await apiClient.listNews();
      setNews(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (err) {
      console.error('Failed to fetch news', err);
    }
  };

  return (
    <Card id="news-section" className="p-4 sm:p-6 shadow-lg bg-gradient-to-br from-green-50 to-white border-2 border-green-500">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-6 h-6 text-green-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-green-800">{t('schoolNewsHeading')}</h2>
      </div>
      
      {news.length === 0 ? (
        <p className="text-center text-gray-500 py-4">{t('noAnnouncements')}</p>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              style={{ animation: 'slowZoom 6s ease-in-out infinite' }}
            >
              <h3 className="font-bold text-green-700 mb-2 flex items-center gap-3">
                <span className="relative inline-flex w-3 h-3">
                  <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-600"></span>
                  <span className="absolute inline-flex h-6 w-6 rounded-full bg-green-600/30 -z-10 transform translate-x-0 translate-y-0 animate-ping"></span>
                </span>
                {item.title}
              </h3>
              <p className="text-gray-700 text-sm mb-2 transform-gpu">{item.content}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          ))}
        </div>
      )}
      {/* Inject keyframes for slow zoom animation */}
      <style>{slowZoomKeyframes}</style>
    </Card>
  );
};