import React from 'react';
import { Share2, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';

const ShareButtons = ({ content }) => {
  const { toast } = useToast();
  const title = content?.title || content?.name || 'Check this out on StreamFlix';
  const currentUrl = window.location.href;
  
  const shareUrl = `${window.location.origin}?content=${content?.id}`;
  
  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleTwitterShare = () => {
    const text = `Check out "${title}" on StreamFlix! 🎬`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };
  
  const handleWhatsAppShare = () => {
    const text = `Check out "${title}" on StreamFlix! ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link copied!',
      description: 'Share link has been copied to clipboard',
    });
  };
  
  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={handleFacebookShare}
        variant="outline"
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white border-0"
      >
        <Facebook className="w-4 h-4 mr-1" />
        Share
      </Button>
      
      <Button
        onClick={handleTwitterShare}
        variant="outline"
        size="sm"
        className="bg-black hover:bg-gray-900 text-white border-0"
      >
        <Twitter className="w-4 h-4 mr-1" />
        Tweet
      </Button>
      
      <Button
        onClick={handleWhatsAppShare}
        variant="outline"
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white border-0"
      >
        <Share2 className="w-4 h-4 mr-1" />
        WhatsApp
      </Button>
      
      <Button
        onClick={handleCopyLink}
        variant="outline"
        size="sm"
        className="bg-white/20 hover:bg-white/30 text-white border-white/40"
      >
        <LinkIcon className="w-4 h-4 mr-1" />
        Copy Link
      </Button>
    </div>
  );
};

export default ShareButtons;
