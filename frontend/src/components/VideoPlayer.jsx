import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';

const VideoPlayer = ({ video, isOpen, onClose }) => {
  const [embedError, setEmbedError] = useState(false);
  
  if (!video) return null;

  const watchOnYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${video.key}`, '_blank');
  };

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
          
          {embedError ? (
            <div className="flex flex-col items-center justify-center h-full bg-black/90 p-8">
              <p className="text-white text-lg mb-4">This video is age-restricted and cannot be embedded.</p>
              <Button 
                onClick={watchOnYouTube}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Watch on YouTube
              </Button>
            </div>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${video.key}?autoplay=1`}
              title={video.name}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
              onError={() => setEmbedError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
