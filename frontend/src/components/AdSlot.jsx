/**
 * AdSlot — graceful Google AdSense ad unit.
 *
 * Does nothing unless BOTH of these env vars are set at build time:
 *   REACT_APP_ADSENSE_CLIENT   e.g. "ca-pub-1234567890123456"
 *   REACT_APP_ADSENSE_SLOT_<slot name upper>  e.g. REACT_APP_ADSENSE_SLOT_HOME_BANNER=1234567890
 *
 * In preview/dev, renders a subtle "Ad slot — configure REACT_APP_ADSENSE_CLIENT"
 * placeholder so you can see where ads will appear without pulling in AdSense.
 */
import React, { useEffect } from 'react';

const ADSENSE_CLIENT = process.env.REACT_APP_ADSENSE_CLIENT; // ca-pub-XXXX

const AdSlot = ({ slot, name = 'banner', format = 'auto', className = '', responsive = true }) => {
  const slotId = slot || process.env[`REACT_APP_ADSENSE_SLOT_${name.toUpperCase()}`];
  const enabled = Boolean(ADSENSE_CLIENT && slotId);

  useEffect(() => {
    if (!enabled) return;
    try {
      // Inject AdSense script once (if not already present)
      const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      const already = document.querySelector(`script[src="${src}"]`);
      if (!already) {
        const s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = src;
        document.head.appendChild(s);
      }
      // eslint-disable-next-line no-unused-expressions
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // noop
    }
  }, [enabled]);

  if (!enabled) {
    return (
      <div
        className={`mx-auto my-6 max-w-5xl rounded-lg border border-dashed border-white/10 bg-white/5 text-center py-6 text-xs text-white/30 tracking-wider uppercase ${className}`}
        data-testid={`adslot-${name}-placeholder`}
      >
        Ad slot · "{name}" · set REACT_APP_ADSENSE_CLIENT + REACT_APP_ADSENSE_SLOT_{name.toUpperCase()} to enable
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle mx-auto my-6 max-w-5xl ${className}`}
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
      data-testid={`adslot-${name}`}
    />
  );
};

export default AdSlot;
