import React from 'react';

export interface CustomNavIconProps {
  className?: string;
  solid?: boolean;
}

/**
 * KaLogoIcon (Official Rokad Ka Platform Logo)
 * - Solid mode: ka-logo-fill.svg (geometric filled grid blocks)
 * - Outline mode: ka-logo-outline.svg (clean geometric outline boundary)
 */
export const KaLogoIcon: React.FC<CustomNavIconProps> = ({
  className = 'h-6 w-6 shrink-0',
  solid = false,
}) => {
  if (solid) {
    return (
      <svg
        viewBox="0 0 1517 2268"
        className={`${className} fill-current transition-all`}
        aria-hidden="true"
      >
        <path d="M0 0H378V378H0V0Z" />
        <path d="M0 378H378V756H0V378Z" />
        <path d="M0 756H378V1134H0V756Z" />
        <path d="M0 1134H378V1512H0V1134Z" />
        <path d="M0 1512H378V1890H0V1512Z" />
        <path d="M0 1890H378V2268H0V1890Z" />
        <path d="M378 1890H756V2268H378V1890Z" />
        <path d="M756 1890H1134V2268H756V1890Z" />
        <path d="M1134 1890H1512V2268H1134V1890Z" />
        <path d="M1134 1512H1512V1890H1134V1512Z" />
        <path d="M759 1138H1137V1516H759V1138Z" />
        <path d="M759 378H1137V756H759V378Z" />
        <path d="M1139 0H1517V378H1139V0Z" />
        <path d="M378 756H756V1134H378V756Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1543 2294"
      className={`${className} fill-none stroke-current transition-all`}
      aria-hidden="true"
    >
      <path
        d="M397.5 6.5V762.5H765.5V384.5H1145.5V6.5H1536.5V397.5H1156.5V775.5H775.5V1144.5H1156.5V1518.5H1531.5V2287.5H6.5V6.5H397.5ZM397.5 1896.5H1140.5V1535.5H765.5V1153.5H397.5V1896.5Z"
        strokeWidth="140"
        strokeLinejoin="miter"
      />
    </svg>
  );
};

// Aliased as CoinStackIcon for backward compatibility
export const CoinStackIcon = KaLogoIcon;
