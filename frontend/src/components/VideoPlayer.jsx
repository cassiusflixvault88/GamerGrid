import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

/**
 * Cross-browser fullscreen helpers (handle webkit/moz prefixes for iOS Safari).
 */
const requestFs = (el) => {
  if (!el) return Promise.resolve();
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitEnterFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!fn) return Promise.resolve();
  try {
    const result = fn.call(el);
    return result && result.then ? result : Promise.resolve(result);
  } catch (e) {
    return Promise.resolve();
  }
};

const exitFs = () => {
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (!fn) return Promise.resolve();
  if (
    !document.fullscreenElement &&
    !document.webkitFullscreenElement &&
    !document.mozFullScreenElement
  ) {
    return Promise.resolve();
  }
  try {
    const result = fn.call(document);
    return result && result.then ? result : Promise.resolve(result);
  } catch (e) {
    return Promise.resolve();
  }
};

const isLandscapeOrientation = () => {
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('landscape');
  }
  return window.matchMedia('(orientation: landscape)').matches;
};

const VideoPlayer = ({ video, isOpen, onClose }) => {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [isFs, setIsFs] = useState(false);

  const watchOnYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${video?.key}`, '_blank');
    onClose();
  };

  // Track fullscreen state across vendor prefixes
  useEffect(() => {
    const onChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement;
      setIsFs(Boolean(fsEl));
    };
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'];
    events.forEach((e) => document.addEventListener(e, onChange));
    return () => events.forEach((e) => document.removeEventListener(e, onChange));
  }, []);

  // 🔁 Auto-rotate to fullscreen when device flips to landscape (only while modal open)
  useEffect(() => {
    if (!isOpen) return;

    const handleOrientation = () => {
      const target = iframeRef.current || containerRef.current;
      if (!target) return;
      if (isLandscapeOrientation()) {
        requestFs(target);
      } else {
        exitFs();
      }
    };

    // Run once on open in case the device is already landscape
    handleOrientation();

    // Listen on both APIs (newer + legacy)
    const screenOrientation = window.screen?.orientation;
    if (screenOrientation && screenOrientation.addEventListener) {
      screenOrientation.addEventListener('change', handleOrientation);
    }
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      if (screenOrientation && screenOrientation.removeEventListener) {
        screenOrientation.removeEventListener('change', handleOrientation);
      }
      window.removeEventListener('orientationchange', handleOrientation);
      // Always exit fullscreen when player closes
      exitFs();
    };
  }, [isOpen]);

  const toggleFullscreen = () => {
    const target = iframeRef.current || containerRef.current;
    if (!target) return;
    if (isFs) exitFs();
    else requestFs(target);
  };

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0 bg-black border-0">
        <DialogTitle className="sr-only">{video?.name || 'Video player'}</DialogTitle>
        <div ref={containerRef} className="relative bg-black" data-testid="video-player">
          <button
            onClick={onClose}
            data-testid="video-close"
            className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
            aria-label="Close video"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={toggleFullscreen}
            data-testid="video-fullscreen-toggle"
            className="absolute top-4 right-16 z-50 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
            aria-label={isFs ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFs ? 'Exit fullscreen' : 'Enter fullscreen (or rotate your phone)'}
          >
            {isFs ? (
              <Minimize2 className="w-5 h-5 text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 text-white" />
            )}
          </button>

          {/* YouTube embed with fs=1 + the playsinline + native fullscreen support */}
          <div className="aspect-video w-full bg-black">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${video.key}?autoplay=1&rel=0&playsinline=1&fs=1&modestbranding=1`}
              title={video.name}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
              frameBorder="0"
            />
          </div>

          {/* Hint + fallback */}
          <div className="p-4 bg-black/90 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <p className="text-white/60 text-xs">
              📱 Rotate your phone for fullscreen
            </p>
            <Button
              onClick={watchOnYouTube}
              variant="outline"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in YouTube
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
