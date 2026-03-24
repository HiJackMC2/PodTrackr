'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';

type SwipeableCardProps = {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
};

const SWIPE_THRESHOLD = 100;

export default function SwipeableCard({ children, onSwipeLeft, onSwipeRight, enabled = true }: SwipeableCardProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [swiping, setSwiping] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    setSwiping(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    currentX.current = diff;

    if (cardRef.current) {
      const progress = Math.min(Math.abs(diff) / SWIPE_THRESHOLD, 1);
      cardRef.current.style.setProperty('--swipe-x', `${diff}px`);
      cardRef.current.style.setProperty('--swipe-progress', `${progress}`);
      cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg)`;
      cardRef.current.style.opacity = `${1 - progress * 0.3}`;
    }
  }, [enabled, swiping]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !swiping) return;
    setSwiping(false);

    const diff = currentX.current;

    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      // Dismiss
      setDismissed(true);
      if (cardRef.current) {
        const direction = diff > 0 ? '100vw' : '-100vw';
        cardRef.current.style.transform = `translateX(${direction})`;
        cardRef.current.style.opacity = '0';
      }

      setTimeout(() => {
        if (diff < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (diff > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }, 250);
    } else {
      // Reset
      if (cardRef.current) {
        cardRef.current.style.transform = '';
        cardRef.current.style.opacity = '';
        cardRef.current.style.removeProperty('--swipe-x');
        cardRef.current.style.removeProperty('--swipe-progress');
      }
    }
  }, [enabled, swiping, onSwipeLeft, onSwipeRight]);

  if (dismissed) return null;

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transition: swiping ? 'none' : 'transform 0.3s ease, opacity 0.3s ease' }}
    >
      {/* Swipe indicators */}
      {swiping && enabled && (
        <>
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded-full text-[10px] font-bold bg-red-500/90 text-white pointer-events-none transition-opacity"
            style={{ opacity: currentX.current < -30 ? Math.min(Math.abs(currentX.current + 30) / 70, 1) : 0 }}
          >
            HIDE
          </div>
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/90 text-white pointer-events-none transition-opacity"
            style={{ opacity: currentX.current > 30 ? Math.min((currentX.current - 30) / 70, 1) : 0 }}
          >
            SAVE
          </div>
        </>
      )}
      {children}
    </div>
  );
}
