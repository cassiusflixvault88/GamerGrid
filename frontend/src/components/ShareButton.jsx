import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';

const ShareButton = ({ variant = 'default', size = 'default', showText = true }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const shareUrl = 'https://hbo-max-app.preview.emergentagent.com';

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FlixVault - Premium Streaming',
          text: 'Check out FlixVault! Thousands of movies, TV shows, and free content!',
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to copy
      }
    }

    // Fallback to copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share FlixVault with your friends!',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share FlixVault with your friends!',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className="group"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          {showText && 'Copied!'}
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          {showText && 'Share FlixVault'}
        </>
      )}
    </Button>
  );
};

export default ShareButton;