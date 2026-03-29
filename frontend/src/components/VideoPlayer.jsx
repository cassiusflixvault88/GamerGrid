import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';

const VideoPlayer = ({ video, isOpen, onClose }) => {
  if (!video) return null;

  const watchOnYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${video.key}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0 bg-black border-0">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {/* YouTube Embed */}
          <div className="aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.key}?autoplay=1&rel=0`}
              title={video.name}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              frameBorder="0"
            />
          </div>
          
          {/* Fallback button if embed doesn't work */}
          <div className="p-4 bg-black/90 border-t border-white/10 flex items-center justify-between">
            <p className="text-white/70 text-sm">Video not playing?</p>
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
