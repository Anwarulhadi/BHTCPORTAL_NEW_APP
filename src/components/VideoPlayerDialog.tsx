import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, X, Loader2, RotateCcw, RotateCw, ArrowLeft, Download } from 'lucide-react';
import { cn, getYouTubeThumbnail, getYouTubeId } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { App } from '@capacitor/app';

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  course_category: string;
  sub_category?: string;
  description?: string;
}

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: Video;
  relatedVideos: Video[];
  onVideoSelect: (video: Video) => void;
}

export const VideoPlayerDialog = ({ open, onOpenChange, video, relatedVideos, onVideoSelect }: VideoPlayerDialogProps) => {
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(80);
    const [muted, setMuted] = useState(false);
    const [played, setPlayed] = useState(0);
    const [duration, setDuration] = useState(0);
    const [seeking, setSeeking] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Handle Back Button logic moved to bottom


    const handleClose = () => {
        if (window.history.state?.modal === 'video') {
            window.history.back();
        } else {
            onOpenChange(false);
        }
    };

    const handleMouseMove = () => {
        // If paused, always show controls
        if (!playing) {
            setShowControls(true);
            return;
        }

        // If playing, show controls then hide after delay
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (playing) {
                setShowControls(false);
            }
        }, 2000);
    };

    // Effect to manage controls visibility based on playing state
    useEffect(() => {
        if (playing) {
            // Start timer to hide controls
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 2000);
        } else {
            // Keep controls visible when paused
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            setShowControls(true);
        }
    }, [playing]);

    const togglePlay = () => {
        if (playerRef.current) {
            if (playing) {
                playerRef.current.pauseVideo();
            } else {
                playerRef.current.playVideo();
            }
            setPlaying(!playing);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVol = value[0];
        setVolume(newVol);
        if (playerRef.current) {
            playerRef.current.setVolume(newVol);
            if (newVol > 0 && muted) {
                playerRef.current.unMute();
                setMuted(false);
            }
        }
    };

    const toggleMute = () => {
        if (playerRef.current) {
            if (muted) {
                playerRef.current.unMute();
                setMuted(false);
            } else {
                playerRef.current.mute();
                setMuted(true);
            }
        }
    };

    // Progress tracking
    useEffect(() => {
        if (playing && !seeking) {
            progressIntervalRef.current = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    const currentTime = playerRef.current.getCurrentTime();
                    const totalDuration = playerRef.current.getDuration();
                    setPlayed(currentTime / totalDuration);
                    setDuration(totalDuration);
                }
            }, 1000);
        } else {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        }
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [playing, seeking]);

    const handleSeekChange = (value: number[]) => {
        setSeeking(true);
        setPlayed(value[0]);
    };

    const handleSeekMouseUp = (value: number[]) => {
        setSeeking(false);
        if (playerRef.current) {
            const seekTime = value[0] * duration;
            playerRef.current.seekTo(seekTime);
        }
    };

    const seekRelative = (seconds: number) => {
        if (playerRef.current) {
            const currentTime = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(currentTime + seconds);
        }
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            try {
                await containerRef.current?.requestFullscreen();
                setIsFullscreen(true);
                // Attempt to lock orientation to landscape on mobile
                if (screen.orientation && 'lock' in screen.orientation) {
                    // @ts-ignore
                    await screen.orientation.lock('landscape').catch(() => {});
                }
            } catch (e) {
                console.error("Fullscreen error:", e);
            }
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
            // Unlock orientation
            if (screen.orientation && 'unlock' in screen.orientation) {
                screen.orientation.unlock();
            }
        }
    };

    const handleBackAction = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            setIsFullscreen(false);
            if (screen.orientation && 'unlock' in screen.orientation) {
                screen.orientation.unlock();
            }
        } else {
            handleClose();
        }
    };

    // Handle Hardware Back Button & Browser Back
    useEffect(() => {
        if (!open) return;

        // Browser history handling
        const state = { modal: 'video' };
        window.history.pushState(state, '', window.location.href);
        
        const handlePopState = (event: PopStateEvent) => {
            // If we are fullscreen, exit fullscreen first
            if (document.fullscreenElement) {
                 document.exitFullscreen().catch(() => {});
                 // Push state back because we consumed one "back" action for fullscreen
                 window.history.pushState(state, '', window.location.href);
                 return;
            }
            onOpenChange(false);
        };

        window.addEventListener('popstate', handlePopState);

        // Capacitor Hardware Back Button
        let backButtonListener: any;
        const setupBackButton = async () => {
            try {
                backButtonListener = await App.addListener('backButton', () => {
                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => {});
                        if (screen.orientation && 'unlock' in screen.orientation) {
                            screen.orientation.unlock();
                        }
                    } else {
                        handleClose();
                    }
                });
            } catch (e) {
                console.warn('Back button listener failed:', e);
            }
        };
        setupBackButton();

        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (backButtonListener) {
                backButtonListener.remove();
            }
        };
    }, [open, onOpenChange]);


    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Reset state when dialog opens or video changes
    useEffect(() => {
        if (open) {
            setPlaying(false);
            setMuted(false);
            setPlayed(0);
            setIsLoading(true);
            setShowControls(true);
            setHasStarted(false);
        } else {
            setPlaying(false);
            setHasStarted(false);
        }
    }, [open, video.id]);

    const onPlayerReady = (event: any) => {
        playerRef.current = event.target;
        setIsLoading(false);
        console.log("YouTube Player Ready");
        // Auto play
        event.target.playVideo();
        setPlaying(true);
    };

    const onPlayerStateChange = (event: any) => {
        // 1 = Playing, 2 = Paused, 0 = Ended
        if (event.data === 1) {
            setPlaying(true);
            setHasStarted(true);
            setIsLoading(false);
        } else if (event.data === 2) {
            setPlaying(false);
        } else if (event.data === 0) {
            setPlaying(false);
        }
    };

    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            fs: 0,
            playsinline: 1,
            origin: window.location.origin
        },
    };

    const formatTime = (seconds: number) => {
        const date = new Date(seconds * 1000);
        const hh = date.getUTCHours();
        const mm = date.getUTCMinutes();
        const ss = date.getUTCSeconds().toString().padStart(2, '0');
        if (hh) {
            return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
        }
        return `${mm}:${ss}`;
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose();
        }}>
            <DialogContent 
                className="max-w-none w-screen h-screen p-0 bg-primary border-none select-none flex flex-col [&>button]:hidden"
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Video Player Container */}
                <div 
                    ref={containerRef}
                    className="relative w-full aspect-video bg-black group flex flex-col justify-center shrink-0"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => playing && setShowControls(false)}
                >
                    <div className="absolute inset-0 pointer-events-none">
                        {(() => {
                            const currentVideoId = getYouTubeId(video?.url || '');
                            if (!currentVideoId) {
                                console.error('Invalid YouTube URL for video:', video);
                                return (
                                    <div className="w-full h-full flex items-center justify-center text-white/80 p-4">
                                        <div>
                                            <div className="font-semibold mb-2">Invalid video URL</div>
                                            <div className="text-sm">This video cannot be played because the URL is missing or invalid.</div>
                                        </div>
                                    </div>
                                );
                            }
                            return (
                                <YouTube
                                    videoId={currentVideoId}
                                    opts={opts}
                                    onReady={onPlayerReady}
                                    onStateChange={onPlayerStateChange}
                                    onError={(e) => {
                                        console.error('YouTube Player Error:', e);
                                        setIsLoading(false);
                                        try { alert('Video Error: ' + JSON.stringify(e)); } catch {}
                                    }}
                                    className="w-full h-full pointer-events-auto"
                                    iframeClassName="w-full h-full"
                                />
                            );
                        })()}
                    </div>
                    
                    {/* Click overlay to toggle play/pause */}
                    <div 
                        className={cn(
                            "absolute inset-0 z-10 flex items-center justify-center",
                            !hasStarted && "bg-black/50" // Darken background before start
                        )}
                        onClick={(e) => {
                            // Only toggle controls if not clicking controls themselves
                            if ((e.target as HTMLElement).closest('.controls-layer')) return;
                            
                            // Toggle play/pause and show controls
                            togglePlay();
                            setShowControls(true);
                        }}
                    >
                        {/* Center Controls (Play/Pause/Rewind/Forward) */}
                        <div className={cn(
                            "flex items-center gap-8 transition-opacity duration-300 controls-layer",
                            showControls || !hasStarted ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}>
                            {hasStarted && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20 hover:text-white rounded-full w-12 h-12"
                                    onClick={(e) => { e.stopPropagation(); seekRelative(-10); }}
                                >
                                    <RotateCcw className="w-8 h-8" />
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "text-white hover:bg-white/20 hover:text-white rounded-full bg-black/40 backdrop-blur-sm transition-all",
                                    !hasStarted ? "w-20 h-20" : "w-16 h-16"
                                )}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    togglePlay(); 
                                }}
                            >
                                {playing ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className={cn("ml-1", !hasStarted ? "w-10 h-10" : "w-8 h-8")} fill="currentColor" />}
                            </Button>

                            {hasStarted && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20 hover:text-white rounded-full w-12 h-12"
                                    onClick={(e) => { e.stopPropagation(); seekRelative(10); }}
                                >
                                    <RotateCw className="w-8 h-8" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Loading Spinner */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                        </div>
                    )}

                    {/* Top Bar (Back Button) */}
                    <div className={cn(
                        "absolute top-0 left-0 right-0 p-4 z-30 transition-opacity duration-300 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent controls-layer",
                        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 hover:text-white rounded-full"
                            onClick={(e) => { e.stopPropagation(); handleBackAction(); }}
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </div>

                    {/* Progress Bar at Absolute Bottom */}
                    <div
                        className={cn(
                            "absolute left-0 right-0 bottom-0 z-40 flex items-center px-4 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 controls-layer",
                            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        <span className="text-white text-xs font-medium w-12 text-right select-none">
                            {formatTime(duration * played)}
                        </span>
                        <Slider
                            value={[played]}
                            max={1}
                            step={0.001}
                            onValueChange={handleSeekChange}
                            onValueCommit={handleSeekMouseUp}
                            className="cursor-pointer flex-1 mx-3"
                        />
                        <span className="text-white text-xs font-medium w-12 select-none">
                            {formatTime(duration)}
                        </span>
                    </div>

                    {/* Main Controls above progress bar */}
                    <div
                        className={cn(
                            "absolute left-0 right-0 bottom-10 px-4 pb-2 flex items-center justify-between z-30 controls-layer transition-opacity duration-300",
                            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 group/volume">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20 hover:text-white"
                                onClick={toggleMute}
                            >
                                {muted || volume === 0 ? (
                                    <VolumeX className="h-5 w-5" />
                                ) : (
                                    <Volume2 className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 hover:text-white"
                            onClick={toggleFullscreen}
                        >
                            {isFullscreen ? (
                                <Minimize className="h-5 w-5" />
                            ) : (
                                <Maximize className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Video Details Section */}
                <ScrollArea className="flex-1 bg-primary text-white p-4">
                    <div className="space-y-6 pb-8">
                        {/* No download button, just description and details */}
                        <div>
                            <h2 className="text-2xl font-bold mb-2">{video.title}</h2>
                            <p className="text-white/80 text-sm whitespace-pre-wrap break-words break-all max-w-full">
                                {video.description || "No description available."}
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4">Related Videos</h3>
                            {relatedVideos.length === 0 ? (
                                <div className="text-white/60 text-sm italic">
                                    No related content found.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {relatedVideos.map((relatedVideo) => (
                                        <Card 
                                            key={relatedVideo.id || Math.random()}
                                            className="bg-black/20 border-white/10 cursor-pointer hover:bg-black/30 transition-colors"
                                            onClick={() => {
                                                // Defensive: Only proceed if required fields exist
                                                if (!relatedVideo || !relatedVideo.id || !relatedVideo.url || !relatedVideo.title) {
                                                    alert('This video is missing required information and cannot be played.');
                                                    return;
                                                }
                                                try {
                                                    onVideoSelect(relatedVideo);
                                                } catch (e) {
                                                    console.error('onVideoSelect threw:', e, relatedVideo);
                                                    alert('An error occurred while selecting the video. See console for details.');
                                                    return;
                                                }
                                                setHasStarted(true);
                                                setPlaying(true);
                                                setIsLoading(true);
                                                setPlayed(0);
                                                setSeeking(false);
                                                // If YouTube player is ready, force play
                                                setTimeout(() => {
                                                    try {
                                                        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                                                            playerRef.current.playVideo();
                                                        }
                                                    } catch (e) {
                                                        console.error('Error forcing playVideo:', e);
                                                    }
                                                }, 300);
                                            }}
                                        >
                                            <CardContent className="p-0 flex">
                                                <div className="w-32 h-20 relative shrink-0">
                                                    <img 
                                                        src={relatedVideo.thumbnail_url || getYouTubeThumbnail(relatedVideo.url) || 'https://placehold.co/600x400?text=No+Thumbnail'} 
                                                        alt={relatedVideo.title}
                                                        className="w-full h-full object-cover rounded-l-lg"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Play className="w-6 h-6 text-white opacity-80" fill="currentColor" />
                                                    </div>
                                                </div>
                                                <div className="p-2 flex-1 min-w-0">
                                                    <h4 className="text-white text-sm font-medium line-clamp-2">{relatedVideo.title}</h4>
                                                    <p className="text-white/60 text-xs mt-1 line-clamp-1">{relatedVideo.sub_category || relatedVideo.course_category}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
