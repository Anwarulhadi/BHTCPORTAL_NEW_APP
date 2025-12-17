import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


import { getYouTubeThumbnail } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  course_category: string;
}

export const VideoSection = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .eq('is_visible', true)
        .order('order_index', { ascending: true });
      
      if (data) setVideos(data);
    };
    fetchVideos();
  }, []);

  const cinematographyVideos = videos.filter(v => v.course_category === 'Cinematography');
  const editingVideos = videos.filter(v => v.course_category === 'Editing');

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 px-1">Video Tutorials</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VideoColumn title="CINEMATOGRAPHY" videos={cinematographyVideos} onSeeAll={() => navigate('/videos?category=Cinematography')} />
        <VideoColumn title="VISION & SOUND EDITING" videos={editingVideos} onSeeAll={() => navigate('/videos?category=Editing')} />
      </div>
    </div>
  );
};

const VideoColumn = ({ title, videos, onSeeAll }: { title: string, videos: Video[], onSeeAll: () => void }) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null); // For "Coming Soon" overlay
  
  // Auth & Player State
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Duplicate videos for infinite scroll illusion (if enough videos)
  const displayVideos = videos.length > 0 ? [...videos, ...videos, ...videos, ...videos] : [];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isPaused || displayVideos.length === 0) return;

    let animationFrameId: number;
    
    const scroll = () => {
      if (scrollContainer.scrollLeft >= (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 2) {
         if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth - 1) {
             scrollContainer.scrollLeft = 0;
         } else {
             scrollContainer.scrollLeft += 0.5;
         }
      } else {
         scrollContainer.scrollLeft += 0.5;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, displayVideos.length]);

  const handleInteractionStart = () => setIsPaused(true);
  const handleInteractionEnd = () => {
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handleVideoClick = (video: Video) => {
    if (video.url && video.url !== '#' && !video.url.includes('coming-soon')) {
        // Navigate to All Videos page with the selected video ID
        navigate(`/videos?category=${video.course_category}&videoId=${video.id}`);
    } else {
        // Show "Coming Soon" overlay
        setPlayingVideoId(video.id);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-none shadow-lg bg-white">
        <CardHeader className="pb-2 relative flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold uppercase tracking-wider text-primary">{title}</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
            onClick={onSeeAll}
          >
            SEE ALL
          </Button>
        </CardHeader>
        <CardContent className="p-0 relative pb-4">
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto gap-4 px-4 py-2 scrollbar-hide"
            style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onMouseEnter={handleInteractionStart}
            onMouseLeave={handleInteractionEnd}
          >
            {displayVideos.map((video, index) => (
              <div 
                key={`${video.id}-${index}`} 
                className="flex flex-col flex-shrink-0 w-40 group cursor-pointer"
                onClick={() => handleVideoClick(video)}
              >
                <div className="relative w-40 h-24 rounded-xl overflow-hidden shadow-md hover:scale-105 transition-transform duration-300 bg-gray-200">
                  {/* Thumbnail */}
                  <img 
                    src={video.thumbnail_url || getYouTubeThumbnail(video.url) || 'https://placehold.co/160x90?text=Video'} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/160x90?text=Video';
                    }}
                  />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  {/* Coming Soon Overlay */}
                  {playingVideoId === video.id && (
                    <div className="absolute inset-0 bg-black/90 z-10 flex flex-col items-center justify-center text-center p-1 animate-in fade-in duration-200">
                      <span className="text-yellow-500 font-black text-sm tracking-widest">COMING</span>
                      <span className="text-white font-bold text-xs tracking-widest">SOON</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-0 right-0 text-white/50 hover:text-white h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayingVideoId(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                {/* Title Outside */}
                <p className="mt-2 text-xs font-semibold text-gray-700 line-clamp-2 leading-tight px-1">
                  {video.title}
                </p>
              </div>
            ))}
            {displayVideos.length === 0 && (
               <div className="w-full text-center py-8 text-gray-400 text-sm">No videos available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Dialog components moved to separate files

