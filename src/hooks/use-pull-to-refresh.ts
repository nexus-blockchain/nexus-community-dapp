'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

export type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;    // px to pull before "ready" (default 60)
  maxPull?: number;      // max pull distance in px (default 120)
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  containerRef: React.RefObject<HTMLElement>;
  pullState: PullState;
  pullDistance: number;  // current visual offset in px
}

export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  maxPull = 120,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLElement>(null!);
  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);
  const pullStateRef = useRef(pullState);
  useEffect(() => { pullStateRef.current = pullState; }, [pullState]);

  const handleRefresh = useCallback(async () => {
    setPullState('refreshing');
    setPullDistance(threshold * 0.6); // shrink to a smaller offset while refreshing
    try {
      await onRefresh();
    } finally {
      setPullState('idle');
      setPullDistance(0);
    }
  }, [onRefresh, threshold]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only activate when scrolled to the top
      if (el.scrollTop > 0) return;
      if (pullState === 'refreshing') return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || pullState === 'refreshing') return;
      currentY.current = e.touches[0].clientY;
      const delta = currentY.current - startY.current;

      if (delta <= 0) {
        // Scrolling up — reset
        setPullDistance(0);
        setPullState('idle');
        return;
      }

      // Prevent default scroll while pulling down at top
      if (el.scrollTop <= 0) {
        e.preventDefault();
      }

      // Apply resistance: diminishing returns as you pull further
      const dampened = Math.min(delta * 0.5, maxPull);
      setPullDistance(dampened);
      setPullState(dampened >= threshold ? 'ready' : 'pulling');
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullStateRef.current === 'ready') {
        handleRefresh();
      } else {
        setPullState('idle');
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, pullState, threshold, maxPull, handleRefresh]);

  return { containerRef, pullState, pullDistance };
}
