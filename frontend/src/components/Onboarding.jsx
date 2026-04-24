import React, { useState, useEffect } from 'react';
import { X, Film, Tv, Star, Heart, Download, Share2, Play } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';

const Onboarding = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('flixvault_onboarding_complete');
    if (!hasSeenOnboarding) {
      // Show onboarding after a short delay
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('flixvault_onboarding_complete', 'true');
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
      title: 'Welcome to GamerGrid! 🎬',
      description: 'Your movie & TV series discovery vault - watch trailers, rate content, and explore films & shows!',
      icon: <Film className="w-16 h-16 text-purple-400" />,
      features: [
        'Browse movies with HD trailers',
        'Free full-length movies available',
        'Rate & review like IMDb'
      ]
    },
    {
      title: 'Watch Movie Trailers 🔥',
      description: 'Browse movies with high-quality YouTube trailers.',
      icon: <Star className="w-16 h-16 text-yellow-400" />,
      features: [
        'HD trailers for movies',
        'What\'s Hot trending section',
        'Discover by genre'
      ]
    },
    {
      title: 'Build Your Watchlist 💜',
      description: 'Save movies you want to watch and never lose track of your favorites.',
      icon: <Heart className="w-16 h-16 text-red-400" />,
      features: [
        'Add movies to watchlist',
        'Sync across devices',
        'Track what you want to watch'
      ]
    },
    {
      title: 'Bonus: Free Movies! 🎉',
      description: 'Enjoy classic public domain films completely free!',
      icon: <Play className="w-16 h-16 text-green-400" />,
      features: [
        'Free full-length movies',
        'Classic cinema & horror',
        'No subscription needed'
      ]
    },
    {
      title: 'Rate & Review Movies 🎬',
      description: 'Share your opinions! Rate movies and read community reviews.',
      icon: <Share2 className="w-16 h-16 text-blue-400" />,
      features: [
        'Rate movies like IMDb',
        'Leave reviews',
        'See what others think'
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
      title: 'Share with Friends 🚀',
      description: 'Love GamerGrid? Share it with your friends and family!',
      icon: <Share2 className="w-16 h-16 text-green-400" />,
      features: [
        'Copy link instantly',
        'Share on social media',
        'Help us grow the community'
      ]
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-gray-900 via-black to-purple-900/20 border-purple-500/30">
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
