import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';

const VideoPlayer = ({ video, isOpen, onClose }) => {
  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0 bg-black border-0">
        <div className="relative aspect-video w-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <iframe
            src={`https://www.youtube.com/embed/${video.key}?autoplay=1`}
            title={video.name}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
