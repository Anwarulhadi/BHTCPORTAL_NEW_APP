import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, X, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { VideoAuthDialog } from '@/components/VideoAuthDialog';
import { VideoPlayerDialog } from '@/components/VideoPlayerDialog';
import { registerPlugin } from '@capacitor/core';
import { getYouTubeThumbnail } from '@/lib/utils';
import { App } from '@capacitor/app';
import { useBackButton } from '@/contexts/BackButtonContext';

// Define the Privacy plugin interface
interface PrivacyPlugin {
  enable(): Promise<void>;
  disable(): Promise<void>;
}

const Privacy = registerPlugin<PrivacyPlugin>('Privacy');

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  course_category: string;
  sub_category?: string;
  description?: string;
}

const AllVideos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const targetVideoId = searchParams.get('videoId');
  const { t } = useLanguage();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');

  // Auth & Player State
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [highlightedVideoId, setHighlightedVideoId] = useState<string | null>(targetVideoId);

  // Get related videos (videos in the same current filtered list, excluding the selected one)
  const getRelatedVideos = (currentVideoId: string) => {
      return filteredVideos.filter(v => v.id !== currentVideoId);
  };

  useEffect(() => {
      setHighlightedVideoId(targetVideoId);
  }, [targetVideoId]);

  useEffect(() => {
    if (highlightedVideoId) {
        const timer = setTimeout(() => {
            setHighlightedVideoId(null);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [highlightedVideoId]);

  const handleBackButton = useCallback(async () => {
    if (showPlayerDialog || showAuthDialog) {
      return false;
    }
    navigate('/', { state: { scrollTo: 'video-section' } });
    return true;
  }, [showPlayerDialog, showAuthDialog, navigate]);

  useBackButton(handleBackButton);

  // Enable privacy screen when entering this page
  useEffect(() => {
    const enablePrivacy = async () => {
      try {
        await Privacy.enable();
      } catch (e) {
        console.error('Privacy plugin not available', e);
      }
    };
    
    enablePrivacy();

    return () => {
      // Disable when leaving
      const disablePrivacy = async () => {
        try {
          await Privacy.disable();
        } catch (e) {
          console.error('Privacy plugin not available', e);
        }
      };
      disablePrivacy();
    };
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [category]);

  useEffect(() => {
    let result = videos;

    // Filter by sub-category
    if (activeSubCategory && activeSubCategory !== 'All') {
      result = result.filter(v => v.sub_category === activeSubCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => v.title.toLowerCase().includes(query));
    }

    setFilteredVideos(result);
  }, [videos, searchQuery, activeSubCategory]);

  useEffect(() => {
    if (targetVideoId && !loading && filteredVideos.length > 0) {
        // Small delay to ensure rendering
        setTimeout(() => {
            const element = document.getElementById(`video-${targetVideoId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 500);
    }
  }, [targetVideoId, loading, filteredVideos]);

  const fetchVideos = async () => {
    try {
      let query = supabase
        .from('videos')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });

      if (category) {
        query = query.eq('course_category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVideos(data || []);
      setFilteredVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to highlight text
  const HighlightedText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-300 text-black px-0.5 rounded">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const handleVideoClick = (video: Video) => {
    // Ensure video has a valid URL before opening player
    if (!video || !video.url) {
      alert('This video is missing a valid URL and cannot be opened.');
      return;
    }
    if (isAuthenticated) {
        setSelectedVideo(video);
        setShowPlayerDialog(true);
    } else {
        setSelectedVideo(video);
        setShowAuthDialog(true);
    }
  };

  const handleAuthSuccess = () => {
      setIsAuthenticated(true);
      setShowAuthDialog(false);
      setShowPlayerDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 select-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="mr-4"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {category === 'Editing' ? 'Vision & Sound Editing' : (category ? `${category} Videos` : 'All Videos')}
              </h1>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {category === 'Editing' && (
              <div className="flex gap-2">
                <Button 
                  variant={activeSubCategory === 'All' ? 'default' : 'outline'}
                  onClick={() => setActiveSubCategory('All')}
                  className={`text-sm shadow-md transition-all ${activeSubCategory === 'All' ? 'bg-primary text-white' : 'bg-white hover:bg-gray-100'}`}
                >
                  ALL
                </Button>
                <Button 
                  variant={activeSubCategory === 'Photoshop' ? 'default' : 'outline'}
                  onClick={() => setActiveSubCategory('Photoshop')}
                  className={`text-sm shadow-md transition-all ${activeSubCategory === 'Photoshop' ? 'bg-primary text-white' : 'bg-white hover:bg-gray-100'}`}
                >
                  PHOTOSHOP
                </Button>
                <Button 
                  variant={activeSubCategory === 'Premiere Pro' ? 'default' : 'outline'}
                  onClick={() => setActiveSubCategory('Premiere Pro')}
                  className={`text-sm shadow-md transition-all ${activeSubCategory === 'Premiere Pro' ? 'bg-primary text-white' : 'bg-white hover:bg-gray-100'}`}
                >
                  PREMIERE PRO
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div 
                key={video.id} 
                id={`video-${video.id}`}
                className="flex flex-col"
              >
                <div className="relative">
                    <Card 
                      className={`cursor-pointer hover:shadow-lg transition-shadow duration-300 overflow-hidden bg-white group relative z-10 ${highlightedVideoId === video.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      onClick={() => handleVideoClick(video)}
                    >
                      <CardContent className="p-0 relative aspect-video">
                        <img 
                          src={video.thumbnail_url || getYouTubeThumbnail(video.url) || 'https://placehold.co/600x400?text=No+Thumbnail'} 
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Thumbnail';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="h-6 w-6 text-primary ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                </div>
                <h3 className="mt-3 font-semibold text-lg leading-tight text-gray-900 group-hover:text-primary transition-colors">
                  <HighlightedText text={video.title} highlight={searchQuery} />
                </h3>
              </div>
            ))}
            {filteredVideos.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No videos found matching your criteria.
              </div>
            )}
          </div>
        )}
      </div>

      <VideoAuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog} 
        onSuccess={handleAuthSuccess}
      />

      {selectedVideo && (
        <VideoPlayerDialog 
          open={showPlayerDialog} 
          onOpenChange={setShowPlayerDialog} 
          video={selectedVideo}
          relatedVideos={getRelatedVideos(selectedVideo.id)}
          onVideoSelect={(video) => setSelectedVideo(video)}
        />
      )}
    </div>
  );
};

export default AllVideos;
