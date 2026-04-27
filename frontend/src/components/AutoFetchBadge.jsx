import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Small "auto-fetch every 15 min" badge — used on Home banner and Profile menu.
 * size: 'sm' = compact (for dropdown), 'md' = normal (for hero/section)
 */
const AutoFetchBadge = ({ size = 'md', className = '' }) => {
  const isSm = size === 'sm';
  return (
    <div
      data-testid="auto-fetch-badge"
      className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 ${
        isSm ? 'px-2.5 py-1 text-[11px]' : 'px-4 py-2 text-xs'
      } ${className}`}
      title="GamerGrid auto-refreshes games & news every 15 minutes"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <RefreshCw className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-300`} />
      <span className={`font-bold tracking-wider uppercase text-emerald-200 ${isSm ? '' : ''}`}>
        Auto-updates every 15 min
      </span>
    </div>
  );
};

export default AutoFetchBadge;
