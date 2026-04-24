import React, { useState } from 'react';
import { Share2, Check, Copy, X, Film, Star, MessageSquare, TestTube, Smartphone, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { useToast } from '../hooks/use-toast';

const ShareButton = ({ variant = 'default', size = 'default', showText = true }) => {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPWAInstructions, setShowPWAInstructions] = useState(false);
  const { toast } = useToast();
  const shareUrl = 'https://hbo-max-app.emergent.host';

  const shareMessage = `🎬 Check out GamerGrid - Movie Discovery & Trailer App!

✨ Features:
• Watch trailers for thousands of movies
• Rate & review like IMDb
• Build your watchlist
• FREE full-length movies available
• Top 10 Rankings
• What's Hot trending section

🚀 Try it now (Preview):
${shareUrl}

📝 We'd love your feedback!
• Test features & report issues
• Leave reviews
• Request content you want to see

Created by Cassius Fox | GamerGrid`;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast({
        title: 'Message copied!',
        description: 'Share this complete message with your friends!',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Share GamerGrid with your friends!',
      });
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GamerGrid - Ultimate Gaming Hub',
          text: 'Check out GamerGrid! Discover games, watch trailers, track releases on PS5, Xbox, PC & Switch!',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled
      }
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant={variant}
        size={size}
        className="group"
      >
        <Share2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
        {showText && 'Share GamerGrid'}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-black to-purple-900/20 border-purple-500/30">
          <div className="p-6 max-h-full overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <img 
                  src="/flixvault-icon.svg" 
                  alt="GamerGrid" 
                  className="w-16 h-16 animate-pulse"
                />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Share GamerGrid! 🚀</h2>
              </div>
              <p className="text-white/70">Help us grow by inviting your friends to test!</p>
            </div>

            {/* Beta Testing Warning - REMOVED FOR PRODUCTION */}
            {/* Production launch - all features live */}

            {/* PWA Installation Instructions */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
              <button
                onClick={() => setShowPWAInstructions(!showPWAInstructions)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">📱 Install GamerGrid as an App (PWA)</h3>
                </div>
                {showPWAInstructions ? (
                  <ChevronUp className="w-5 h-5 text-white/50 group-hover:text-white" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/50 group-hover:text-white" />
                )}
              </button>

              {showPWAInstructions && (
                <div className="mt-4 space-y-4 text-white/80 text-sm">
                  <div className="pl-7 space-y-3">
                    <div>
                      <p className="font-semibold text-white mb-1">🖥️ Chrome (Desktop/PC):</p>
                      <ol className="list-decimal list-inside space-y-1 text-white/70">
                        <li>Open GamerGrid in Chrome browser</li>
                        <li>Click the <strong>⋮</strong> (three dots) menu in top-right</li>
                        <li>Select <strong>"Install GamerGrid"</strong> or <strong>"Add to Desktop"</strong></li>
                        <li>Click <strong>"Install"</strong> in the popup</li>
                      </ol>
                    </div>

                    <div>
                      <p className="font-semibold text-white mb-1">📱 iPhone/iOS (Safari):</p>
                      <ol className="list-decimal list-inside space-y-1 text-white/70">
                        <li>Open GamerGrid in <strong>Safari browser</strong> (not Chrome!)</li>
                        <li>Tap the <strong>Share</strong> button (square with arrow up)</li>
                        <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                        <li>Tap <strong>"Add"</strong> in top-right corner</li>
                      </ol>
                    </div>

                    <div>
                      <p className="font-semibold text-white mb-1">📱 Android (Chrome):</p>
                      <ol className="list-decimal list-inside space-y-1 text-white/70">
                        <li>Open GamerGrid in Chrome browser</li>
                        <li>Tap the <strong>⋮</strong> (three dots) menu in top-right</li>
                        <li>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                        <li>Tap <strong>"Add"</strong> or <strong>"Install"</strong></li>
                      </ol>
                    </div>

                    <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded mt-3">
                      <p className="text-blue-200 text-xs">
                        💡 <strong>Tip:</strong> Installing as a PWA gives you a native app experience with offline support and faster loading!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Testing Instructions */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TestTube className="w-5 h-5 text-purple-400" />
                How to Use GamerGrid
              </h3>
              
              <div className="space-y-3 text-white/80">
                <div className="flex items-start gap-3">
                  <Gamepad2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">What You Can Do:</p>
                    <p className="text-sm">Discover games across PS5, Xbox, PC & Switch • Watch gameplay trailers • Track Game Pass & PS Plus • Build your game library • Rate & review games</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">🐛 Found a Bug? Report It!</p>
                    <p className="text-sm">
                      Click <strong>"Report Issues"</strong> in the footer (bottom of any page). 
                      Select "Bug Report", describe what happened, and include screenshots if possible. 
                      The more details, the better we can fix it!
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">💬 Leave Feedback & Reviews:</p>
                    <p className="text-sm">
                      Rate your experience on the <strong>"Rate GamerGrid"</strong> page (footer link). 
                      You can also use <strong>"Report Issues"</strong> to request new features or suggest improvements!
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Enjoy GamerGrid!</strong> Discover games, watch trailers, track releases, and never miss a launch!
                </p>
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <Button
                onClick={handleCopyMessage}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                size="lg"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" />
                    Copy Complete Message
                  </>
                )}
              </Button>

              <Button
                onClick={handleCopyUrl}
                variant="outline"
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                size="lg"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copy Link Only
              </Button>

              {navigator.share && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                  size="lg"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share via Apps
                </Button>
              )}
            </div>

            {/* Preview URL Display */}
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-white/60 text-xs mb-2">Preview URL:</p>
              <p className="text-white font-mono text-sm break-all">{shareUrl}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareButton;