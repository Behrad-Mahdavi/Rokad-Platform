import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary-light text-primary-darker border border-primary/20',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200',
        destructive: 'bg-rose-50 text-rose-700 border border-rose-200',
        neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
        male: 'bg-male-light text-male-dark border border-male-normal/20',
        female: 'bg-female-light text-female-dark border border-female-normal/20',
        college: 'bg-college-light text-college-dark border border-college-normal/20',
        club: 'bg-club-light text-club-dark border border-club-normal/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, ...props }) => {
  return (
    <div className={twMerge(clsx(badgeVariants({ variant }), className))} {...props} />
  );
};
