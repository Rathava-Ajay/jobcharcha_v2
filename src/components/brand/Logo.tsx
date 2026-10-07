import React from 'react';

/**
 * The real JobCharcha logo (HD raster of the brand wordmark, blue + white versions). Size it with a
 * text-size class, e.g. `text-[24px]` — the image height follows the font size (1.15em).
 */
export const Logo: React.FC<{ tone?: 'color' | 'white'; className?: string }> = ({ tone = 'color', className }) => (
  <span className={`inline-flex items-center leading-none select-none ${className ?? 'text-[24px]'}`}>
    <img
      src={tone === 'white' ? '/icons/logo-wordmark-white.png' : '/icons/logo-wordmark.png'}
      alt="JobCharcha"
      width={1800}
      height={261}
      className="h-[1.15em] w-auto max-w-none"
      draggable={false}
    />
  </span>
);
