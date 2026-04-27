import React from 'react';
import { Moon } from 'lucide-react';

const NotificationsTab = () => (
  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/10">
    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
      <Moon className="w-5 h-5" />
      Appearance
    </h2>
    <p className="text-white/60 text-sm mb-4">GamerGrid is optimized for dark mode</p>

    <div className="flex items-center space-x-3 p-4 bg-white/5 border border-white/10 rounded-lg">
      <div className="p-3 bg-purple-600 rounded-lg">
        <Moon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-white font-medium">Dark Mode</p>
        <p className="text-white/60 text-sm">Perfect for gaming</p>
      </div>
      <div className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm font-medium">
        Active
      </div>
    </div>
  </div>
);

export default NotificationsTab;
