import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Maximize2, Minimize2, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const canDownload = Boolean(user && (user.is_admin || user.is_pro));

  const watchOnYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${video?.key}`, '_blank');
    onClose();
  };

  const downloadTrailer = async () => {
    if (!video?.key || downloading) return;
    setDownloading(true);
    toast({
      title: 'Preparing download…',
      description: 'Fetching the trailer from YouTube. This may take 10-30 seconds.',
    });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/trailer/download/${video.key}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        timeout: 180000, // 3 min
      });
      const blob = new Blob([response.data], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (video?.name || 'trailer').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80);
      a.download = `${safeName}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      toast({
        title: 'Download complete ✅',
        description: 'Check your Downloads folder.',
      });
    } catch (e) {
      let msg = 'Download failed. Try again in a moment.';
      if (e.response?.data) {
        try {
          // Backend may return JSON error inside a blob
          const text = await e.response.data.text?.();
          if (text) {
            const j = JSON.parse(text);
            msg = j.detail || msg;
          }
        } catch { /* keep default */ }
      } else if (e.message) {
        msg = e.message;
      }
      toast({
        title: 'Download failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
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
            <div className="flex items-center gap-2 flex-wrap">
              {canDownload && (
                <Button
                  onClick={downloadTrailer}
                  data-testid="video-download"
                  disabled={downloading}
                  variant="outline"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white border-0 disabled:opacity-60"
                  title={user?.is_admin ? 'CEO / Admin — Download trailer' : 'GamerGrid Pro — Download trailer'}
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Trailer
                    </>
                  )}
                </Button>
              )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
