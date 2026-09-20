import React from 'react';

export interface CustomNavIconProps {
  className?: string;
  solid?: boolean;
}

/**
 * CoinStackIcon: Multiple coins stacked on each other (چندتا سکه روی هم)
 * - Outline mode: 3 cylindrical stacked coins with top ellipse face and curved rims
 * - Solid mode: 100% solid filled 3D coins with clean negative space separation seams
 */
export const CoinStackIcon: React.FC<CustomNavIconProps> = ({
  className = 'h-6 w-6 shrink-0',
  solid = false,
}) => {
  if (solid) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`${className} fill-current transition-all`}
        aria-hidden="true"
      >
        {/* Top Coin Face (Solid) */}
        <ellipse cx="12" cy="4.8" rx="7.5" ry="2.4" />

        {/* Coin 1 Side */}
        <path d="M4.5 5.8v3c0 1.33 3.36 2.4 7.5 2.4s7.5-1.07 7.5-2.4V5.8c-1.6 1-4.3 1.6-7.5 1.6s-5.9-.6-7.5-1.6z" />

        {/* Coin 2 Side */}
        <path d="M4.5 10.6v3c0 1.33 3.36 2.4 7.5 2.4s7.5-1.07 7.5-2.4v-3c-1.6 1-4.3 1.6-7.5 1.6s-5.9-.6-7.5-1.6z" />

        {/* Coin 3 Side */}
        <path d="M4.5 15.4v3c0 1.33 3.36 2.4 7.5 2.4s7.5-1.07 7.5-2.4v-3c-1.6 1-4.3 1.6-7.5 1.6s-5.9-.6-7.5-1.6z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} fill-none stroke-current transition-all`}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Top Coin Face */}
      <ellipse cx="12" cy="4.8" rx="7.5" ry="2.4" />
      {/* Coin 1 Side */}
      <path d="M4.5 4.8v4c0 1.33 3.36 2.4 7.5 2.4s7.5-1.07 7.5-2.4v-4" />
      {/* Coin 2 Side */}
      <path d="M4.5 9.6v4c0 1.33 3.36 2.4 7.5 2.4s7.5-1.07 7.5-2.4v-4" />
      {/* Coin 3 Side */}
      <path d="M4.5 14.4v4c0 1.33 3.36 2.4 7.5 2.4s7.5-1.07 7.5-2.4v-4" />
    </svg>
  );
};
