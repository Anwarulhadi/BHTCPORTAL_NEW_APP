import { useRef } from 'react';

interface UseSwipeOptions {
  threshold?: number; // minimum px distance
  maxTime?: number; // maximum ms duration
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function useSwipe({ threshold = 60, maxTime = 500, onSwipeLeft, onSwipeRight }: UseSwipeOptions) {
  const startX = useRef(0);
  const startTime = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    startX.current = touch.clientX;
    startTime.current = Date.now();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const dt = Date.now() - startTime.current;
    if (dt > maxTime) return;

    if (dx <= -threshold) {
      onSwipeLeft && onSwipeLeft();
    } else if (dx >= threshold) {
      onSwipeRight && onSwipeRight();
    }
  };

  return { onTouchStart, onTouchEnd };
}
