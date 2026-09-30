import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const ADSENSE_CLIENT = 'ca-pub-7367321121987492';

interface AdUnitProps {
  slot: string;
  format?: string;
  layoutKey?: string;
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

/**
 * Renders one AdSense ad unit and requests it on mount. Each route change in this SPA
 * mounts a fresh <ins>, so a fresh adsbygoogle.push() per mount is required — AdSense's
 * script does not know about client-side navigation on its own.
 */
export const AdUnit: React.FC<AdUnitProps> = ({ slot, format = 'auto', layoutKey, fullWidthResponsive = true, className, style, label = 'Advertisement' }) => {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script blocked (ad blocker) or not yet loaded — fail silently.
    }
  }, [slot]);

  return (
    <div className={className} style={style}>
      <span className="block text-center text-[9px] font-semibold text-slate-300 uppercase tracking-wider mb-1">{label}</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout-key={layoutKey}
        data-full-width-responsive={fullWidthResponsive ? 'true' : undefined}
      />
    </div>
  );
};
