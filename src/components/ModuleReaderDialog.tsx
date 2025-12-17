import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ModuleReaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: { title: string; file_url: string } | null;
}

const clampScale = (value: number) => Math.min(3, Math.max(0.75, value));

export const ModuleReaderDialog = ({ open, onOpenChange, module }: ModuleReaderDialogProps) => {
  const [scale, setScale] = useState(1);
  const [isBlurred, setIsBlurred] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Prevent right click
  useEffect(() => {
    if (!open) return;
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [open]);

  // Prevent copy
  useEffect(() => {
    if (!open) return;
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [open]);

  // Prevent keyboard shortcuts for print/save
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'c')) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Harden against screenshots & devtools shortcuts (best-effort)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = async (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isBlocked = key === 'printscreen' || key === 'f12' || ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 's');
      if (isBlocked) {
        event.preventDefault();
        try {
          await navigator.clipboard?.writeText('Screenshots are disabled in protected view.');
        } catch {
          // Silent fallback
        }
        setIsBlurred(true);
        setTimeout(() => setIsBlurred(false), 1200);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Close dialog via browser back button instead of leaving the page
  useEffect(() => {
    if (!open || !module) return;
    const state = { modal: 'moduleReader' };
    window.history.pushState(state, '', window.location.href);
    const handlePopState = () => {
      onOpenChange(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onOpenChange, module]);

  // Reset zoom when dialog re-opens
  useEffect(() => {
    if (open) {
      setScale(1);
      setIsBlurred(false);
    }
  }, [open, module]);

  // Blur on visibility change (best-effort screen-record deterrent)
  useEffect(() => {
    if (!open) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [open]);

  // Track pinch gestures (capture phase so iframe can't swallow them)
  useEffect(() => {
    const surface = contentRef.current;
    if (!surface) return;
    const pointers = new Map<number, PointerEvent>();
    let lastDistance = 0;

    const distanceBetween = () => {
      if (pointers.size !== 2) return 0;
      const [first, second] = Array.from(pointers.values());
      const dx = first.clientX - second.clientX;
      const dy = first.clientY - second.clientY;
      return Math.hypot(dx, dy);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      pointers.set(event.pointerId, event);
      if (pointers.size === 2) {
        lastDistance = distanceBetween();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, event);
      if (pointers.size === 2 && lastDistance) {
        event.preventDefault();
        const currentDistance = distanceBetween();
        if (currentDistance) {
          setScale(prev => clampScale(prev * (currentDistance / lastDistance)));
          lastDistance = currentDistance;
        }
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) {
        lastDistance = 0;
      }
    };

    surface.addEventListener('pointerdown', handlePointerDown, { passive: false, capture: true });
    surface.addEventListener('pointermove', handlePointerMove, { passive: false, capture: true });
    surface.addEventListener('pointerup', handlePointerUp, { capture: true });
    surface.addEventListener('pointercancel', handlePointerUp, { capture: true });

    return () => {
      surface.removeEventListener('pointerdown', handlePointerDown, true);
      surface.removeEventListener('pointermove', handlePointerMove, true);
      surface.removeEventListener('pointerup', handlePointerUp, true);
      surface.removeEventListener('pointercancel', handlePointerUp, true);
    };
  }, []);

  // Trackpad / ctrl + scroll zoom support
  useEffect(() => {
    const surface = contentRef.current;
    if (!surface) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setScale(prev => clampScale(prev - event.deltaY * 0.0015));
    };
    surface.addEventListener('wheel', handleWheel, { passive: false });
    return () => surface.removeEventListener('wheel', handleWheel);
  }, []);

  const handleClose = () => {
    onOpenChange(false);
    if (window.history.state?.modal === 'moduleReader') {
      window.history.back();
    }
  };

  if (!module) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none border-0 bg-slate-900 overflow-hidden">
        <DialogHeader className="sr-only">
            <DialogTitle>{module.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-2 bg-slate-800 text-white z-10 shadow-md">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-200">
              <Shield className="w-4 h-4 text-emerald-300" />
              Protected View
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-200">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div 
            ref={contentRef}
            className="flex-1 relative bg-white select-none overflow-hidden touch-none"
            onDragStart={(event) => event.preventDefault()}
          >
             <div
                className="w-full h-full"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 100ms ease-out',
                }}
             >
              <iframe 
                src={`https://docs.google.com/gview?url=${encodeURIComponent(module.file_url)}&embedded=true`}
                className="w-full h-full border-0 pointer-events-auto"
                title={module.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                allow="clipboard-read; clipboard-write"
                draggable={false}
              />
             </div>
             {isBlurred && (
               <div className="absolute inset-0 bg-slate-900/80 backdrop-blur flex flex-col items-center justify-center text-white text-sm font-semibold z-50">
                 Secure mode active
                 <span className="text-xs font-normal mt-1 opacity-80">Resume reading to continue</span>
               </div>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
