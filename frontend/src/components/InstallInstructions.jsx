import React, { useState } from 'react';
import { X, Smartphone, Monitor, Apple } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

const InstallInstructions = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 bg-black/95 border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Install GamerGrid</h2>
              <p className="text-white/70">Get the app experience on any device - it's free!</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <Tabs defaultValue="android" className="w-full">
            <TabsList className="bg-white/10 border border-white/20 mb-6 w-full grid grid-cols-3">
              <TabsTrigger value="android" className="data-[state=active]:bg-purple-600">
                <Smartphone className="w-4 h-4 mr-2" />
                Android
              </TabsTrigger>
              <TabsTrigger value="iphone" className="data-[state=active]:bg-purple-600">
                <Apple className="w-4 h-4 mr-2" />
                iPhone
              </TabsTrigger>
              <TabsTrigger value="desktop" className="data-[state=active]:bg-purple-600">
                <Monitor className="w-4 h-4 mr-2" />
                Desktop
              </TabsTrigger>
            </TabsList>

            {/* Android Instructions */}
            <TabsContent value="android" className="space-y-6">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Smartphone className="w-6 h-6 mr-2 text-green-500" />
                  Install on Android
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-semibold">Open Chrome Browser</p>
                      <p className="text-white/70 text-sm">Visit GamerGrid in Google Chrome on your Android phone</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-semibold">Tap the Menu Icon</p>
                      <p className="text-white/70 text-sm">Look for the three dots (⋮) in the top-right corner</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-semibold">Select "Install app" or "Add to Home Screen"</p>
                      <p className="text-white/70 text-sm">You might see a popup asking to install the app</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      4
                    </div>
                    <div>
                      <p className="text-white font-semibold">Tap "Install"</p>
                      <p className="text-white/70 text-sm">GamerGrid will be added to your home screen!</p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 mt-4">
                    <p className="text-green-400 font-semibold text-sm">✓ Done! Open GamerGrid from your home screen like any other app.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* iPhone Instructions */}
            <TabsContent value="iphone" className="space-y-6">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Apple className="w-6 h-6 mr-2 text-white" />
                  Install on iPhone/iPad
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-semibold">Open Safari Browser</p>
                      <p className="text-white/70 text-sm">Visit GamerGrid using Safari (not Chrome)</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-semibold">Tap the Share Button</p>
                      <p className="text-white/70 text-sm">Look for the square with arrow icon at the bottom (📤)</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-semibold">Scroll and tap "Add to Home Screen"</p>
                      <p className="text-white/70 text-sm">You might need to scroll down in the share menu</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      4
                    </div>
                    <div>
                      <p className="text-white font-semibold">Tap "Add"</p>
                      <p className="text-white/70 text-sm">The GamerGrid icon will appear on your home screen!</p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 mt-4">
                    <p className="text-green-400 font-semibold text-sm">✓ Done! Launch GamerGrid from your home screen like a native app.</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Desktop Instructions */}
            <TabsContent value="desktop" className="space-y-6">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Monitor className="w-6 h-6 mr-2 text-blue-500" />
                  Install on Desktop
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-white font-semibold">Open Chrome, Edge, or Brave Browser</p>
                      <p className="text-white/70 text-sm">Visit GamerGrid on your computer</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-white font-semibold">Look for the Install Icon</p>
                      <p className="text-white/70 text-sm">In the address bar, you'll see a computer icon (⊕) or download icon</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-white font-semibold">Click "Install GamerGrid"</p>
                      <p className="text-white/70 text-sm">Or go to Menu (⋮) → "Install GamerGrid..."</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      4
                    </div>
                    <div>
                      <p className="text-white font-semibold">Click "Install"</p>
                      <p className="text-white/70 text-sm">GamerGrid will open in its own window!</p>
                    </div>
                  </div>

                  <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 mt-4">
                    <p className="text-green-400 font-semibold text-sm">✓ Done! Find GamerGrid in your applications or launch from your desktop.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-6">
            <h4 className="text-white font-bold text-lg mb-2">Why Install?</h4>
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <span>Opens full-screen without browser bars</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <span>Faster loading with cached content</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <span>Works offline for better performance</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <span>Just like a native app - completely FREE!</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallInstructions;
