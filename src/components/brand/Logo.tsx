import React, { useId } from 'react';

/**
 * JobCharcha brand mark: the "C" of Charcha drawn as two concentric arcs with a growth arrow
 * leaving through the opening — the same idea as the original logo, redrawn as crisp vectors.
 */
export const LogoMark: React.FC<{ className?: string; tone?: 'color' | 'white' }> = ({ className, tone = 'color' }) => {
  const id = useId().replace(/:/g, '');
  const stroke = tone === 'white' ? '#ffffff' : `url(#jc-g-${id})`;
  const arrow = tone === 'white' ? '#fbbf24' : `url(#jc-a-${id})`;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`jc-g-${id}`} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id={`jc-a-${id}`} x1="14" y1="26" x2="34" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <path d="M30.04 8.85 A15 15 0 1 0 30.04 31.15" fill="none" stroke={stroke} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M24.88 13.04 A8.5 8.5 0 1 0 24.88 26.96" fill="none" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M15.5 24.5 L32 8" fill="none" stroke={arrow} strokeWidth="3.8" strokeLinecap="round" />
      <path d="M24.4 7.6 H32.4 V15.6" fill="none" stroke={arrow} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * Full wordmark: "Job" + mark + "harcha". Text is live (Inter), so it stays sharp at any size and
 * comes in a white version for dark panels. Size it with a text-size class, e.g. `text-[24px]`.
 */
export const Logo: React.FC<{ tone?: 'color' | 'white'; className?: string }> = ({ tone = 'color', className }) => (
  <span
    role="img"
    aria-label="JobCharcha"
    className={`inline-flex items-center leading-none tracking-[-0.035em] select-none whitespace-nowrap ${className ?? 'text-[24px]'}`}
  >
    <span aria-hidden className={`font-black ${tone === 'white' ? 'text-white' : 'text-blue-700'}`}>Job</span>
    <LogoMark tone={tone} className="w-[1.04em] h-[1.04em] ml-[0.03em] -mr-[0.07em] translate-y-[0.02em] shrink-0" />
    <span aria-hidden className={`font-semibold ${tone === 'white' ? 'text-white' : 'text-blue-600'}`}>harcha</span>
  </span>
);
