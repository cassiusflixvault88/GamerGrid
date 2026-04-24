import React, { useEffect, useState } from 'react';
import { Download, X, HelpCircle, Info } from 'lucide-react';
import { Button } from './ui/button';
import InstallInstructions from './InstallInstructions';
import AboutGamerGrid from './AboutGamerGrid';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  const handleShowInstructions = () => {
    setShowInstall(false);
    setShowInstructions(true);
  };

  if (!showInstall) return (
    <>
      <InstallInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
      <AboutGamerGrid isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-2xl z-50 animate-in slide-in-from-bottom">
        <button
          onClick={() => setShowInstall(false)}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 bg-white/20 p-2 rounded-lg">
            <Download className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install GamerGrid</h3>
            <p className="text-sm text-white/90 mb-3">
              Install our app for offline access, faster performance, and native app experience!
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-white text-purple-600 hover:bg-white/90 font-semibold"
              >
                Install Now
              </Button>
              <Button
                onClick={() => setShowAbout(true)}
                variant="outline"
                className="bg-white/20 hover:bg-white/30 border-white/40 text-white"
                title="Learn More"
              >
                <Info className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleShowInstructions}
                variant="outline"
                className="bg-white/20 hover:bg-white/30 border-white/40 text-white"
                title="Install Instructions"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <InstallInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
      <AboutGamerGrid isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};

export default InstallPWA;
