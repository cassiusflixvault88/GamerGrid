import React, { useEffect, useState, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating scroll-to-top button.
 * - Hidden until the user scrolls more than `threshold` pixels.
 * - Positioned bottom-right, above mobile bottom nav safely.
 * - Smooth scroll + keyboard accessible.
 */
const ScrollToTopButton = ({ threshold = 500 }) => {
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(() => {
    const y = window.pageYOffset || document.documentElement.scrollTop;
    setVisible(y > threshold);
  }, [threshold]);

  useEffect(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const scrollUp = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Scroll to top"
      data-testid="scroll-to-top-btn"
      className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl shadow-black/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white/20"
      style={{
        // Respect iPhone notch/safe-area on PWAs
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
    </button>
  );
};

export default ScrollToTopButton;
