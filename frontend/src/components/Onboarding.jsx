import React, { useState, useEffect } from 'react';
import { X, Film, Tv, Star, Heart, Download, Share2, Play, Gamepad2, Crown, Bookmark } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

const Onboarding = ({ forceOpen = false, onForceClose = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setCurrentStep(0);
      setIsOpen(true);
      return;
    }
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('gamergrid_onboarding_complete');
    if (!hasSeenOnboarding) {
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, [forceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep(0);
    localStorage.setItem('gamergrid_onboarding_complete', 'true');
    if (onForceClose) onForceClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const steps = [
    {
      title: 'Welcome to GamerGrid! 🎮',
      description: 'Your ultimate gaming hub - discover games, watch trailers, track releases across PS5, Xbox, PC & Switch!',
      icon: <Gamepad2 className="w-16 h-16 text-purple-400" />,
      features: [
        'Browse games with HD trailers',
        'Track releases on all platforms',
        'Discover trending & upcoming games'
      ]
    },
    {
      title: 'Discover Games 🔥',
      description: 'Browse 5,000+ games across PS5, Xbox, PC, and Nintendo Switch with gameplay trailers.',
      icon: <Star className="w-16 h-16 text-yellow-400" />,
      features: [
        'HD gameplay trailers',
        'What\'s Trending in gaming',
        'Browse by platform & genre'
      ]
    },
    {
      title: 'Track Your Games 💜',
      description: 'Build your game library - track what you own, want to play, and have completed.',
      icon: <Heart className="w-16 h-16 text-red-400" />,
      features: [
        'Add games to library',
        'Track across platforms',
        'Never miss a release'
      ]
    },
    {
      title: 'Monthly Free Games 🎉',
      description: 'Stay updated on Xbox Game Pass and PlayStation Plus monthly free games!',
      icon: <Play className="w-16 h-16 text-green-400" />,
      features: [
        'Xbox Game Pass games',
        'PS Plus monthly titles',
        'Never miss free games'
      ]
    },
    {
      title: 'Rate & Review Games 🎮',
      description: 'Share your gaming opinions! Rate games and read community reviews.',
      icon: <Share2 className="w-16 h-16 text-blue-400" />,
      features: [
        'Rate games like IGN/Metacritic',
        'Leave detailed reviews',
        'See community ratings'
      ]
    },
    {
      title: 'Go Pro for $4.99/mo 👑',
      description: 'Unlock the full GamerGrid experience and support an indie creator. Cancel anytime.',
      icon: <Crown className="w-16 h-16 text-yellow-400" />,
      features: [
        '100% ad-free browsing',
        'Save trailers to your personal library',
        'Early access to new features',
        'Priority support from the founder',
        'More Pro perks coming as the app grows — at no extra cost'
      ]
    },
    {
      title: 'Install as an App 📱',
      description: 'Get the full GamerGrid experience by installing it on your device!',
      icon: <Download className="w-16 h-16 text-purple-400" />,
      features: [
        'Works like a native app',
        'Offline access',
        'Quick launch from home screen'
      ]
    },
    {
      title: 'Share with Gamers 🚀',
      description: 'Love GamerGrid? Share it with your gaming friends!',
      icon: <Share2 className="w-16 h-16 text-green-400" />,
      features: [
        'Copy link instantly',
        'Share on Discord/Twitter',
        'Grow the gaming community'
      ]
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-gray-900 via-black to-purple-900/20 border-purple-500/30">
        <DialogTitle className="sr-only">{currentStepData.title}</DialogTitle>
        <DialogDescription className="sr-only">{currentStepData.description}</DialogDescription>
        <div className="relative p-8 max-h-full overflow-y-auto">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-purple-500'
                    : index < currentStep
                    ? 'w-2 bg-purple-400'
                    : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              {currentStepData.icon}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              {currentStepData.title}
            </h2>
            
            <p className="text-white/70 text-lg mb-6">
              {currentStepData.description}
            </p>

            <div className="space-y-3 text-left max-w-md mx-auto">
              {currentStepData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-white/80">
                  <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={handleSkip}
              className="text-white/50 hover:text-white transition-colors text-sm"
            >
              Skip Tour
            </button>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Back
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Onboarding;
