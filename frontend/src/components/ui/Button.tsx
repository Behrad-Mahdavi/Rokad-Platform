import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white hover:bg-primary-hover shadow-brand-ecosystem border border-primary-darker/20',
        male:
          'bg-male-normal text-white hover:bg-male-normal-hover shadow-brand-male border border-male-darker/20',
        female:
          'bg-female-normal text-white hover:bg-female-normal-hover shadow-brand-female border border-female-darker/20',
        college:
          'bg-college-normal text-white hover:bg-college-normal-hover shadow-brand-college border border-college-darker/20',
        club:
          'bg-club-normal text-white hover:bg-club-normal-hover shadow-brand-club border border-club-darker/20',
        secondary:
          'bg-gray-100 text-ink-normal hover:bg-gray-200 border border-gray-300 shadow-brand-neutral',
        outline:
          'border border-gray-300 bg-white hover:bg-gray-50 text-ink-normal',
        ghost: 'hover:bg-gray-100 text-ink-normal',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-sm',
        md: 'h-10 px-4 py-2 text-sm rounded-md',
        lg: 'h-12 px-6 text-base rounded-lg',
        icon: 'h-10 w-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={twMerge(clsx(buttonVariants({ variant, size, className })))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
