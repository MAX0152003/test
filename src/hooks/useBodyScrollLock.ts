import { useEffect } from 'react';

/**
 * Custom hook to cleanly lock body & document scrolling when a modal, 
 * drawer, or overlay is active, preventing background scroll bleed on mobile.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // Lock body and HTML scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    // Prevent background touchmove drag events on mobile WebKit/Blink
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Allow scrolling only if the target or its ancestor is explicitly marked scrollable
      const scrollableParent = target.closest('.modal-scrollable-content, [data-scrollable="true"]');
      if (!scrollableParent) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isLocked]);
}
