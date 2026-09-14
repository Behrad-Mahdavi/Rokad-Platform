import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:translate-x-[1.5px] active:translate-y-[1.5px]',
  {
    variants: {
      variant: {
        primary:
          'bg-ecosystem-normal hover:bg-ecosystem-normal-hover text-white border-[1.5px] border-ecosystem-dark shadow-[2.5px_2.5px_0_#1F413D] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#1F413D] active:shadow-[1px_1px_0_#1F413D]',
        sec:
          'bg-male-normal hover:bg-male-normal-hover text-white border-[1.5px] border-male-dark dark:border-male-light/30 shadow-[2.5px_2.5px_0_#0B0F1F] dark:shadow-[2.5px_2.5px_0_#59BBAF] dark:bg-[#2B3875] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]',
        secondary:
          'bg-male-normal hover:bg-male-normal-hover text-white border-[1.5px] border-male-dark dark:border-male-light/30 shadow-[2.5px_2.5px_0_#0B0F1F] dark:shadow-[2.5px_2.5px_0_#59BBAF] dark:bg-[#2B3875] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]',
        male:
          'bg-male-normal hover:bg-male-normal-hover text-white border-[1.5px] border-male-dark dark:border-male-light/30 shadow-[2.5px_2.5px_0_#0B0F1F] dark:shadow-[2.5px_2.5px_0_#59BBAF] dark:bg-[#2B3875] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]',
        outline:
          'bg-white dark:bg-[#161D2A] text-ink-normal dark:text-white border-[1.5px] border-[#DFDFDF] dark:border-[#2D3A50] shadow-[2px_2px_0_#BDBCBC] dark:shadow-[2px_2px_0_#0F172A] hover:bg-[#F8F9FA] hover:border-ink-normal hover:shadow-[2.5px_2.5px_0_#292827]',
        female:
          'bg-female-normal hover:bg-female-normal-hover text-white border-[1.5px] border-female-dark shadow-[2.5px_2.5px_0_#4E0920] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]',
        girl:
          'bg-female-normal hover:bg-female-normal-hover text-white border-[1.5px] border-female-dark shadow-[2.5px_2.5px_0_#4E0920] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]',
        college:
          'bg-college-normal hover:bg-college-normal-hover text-white border-[1.5px] border-college-dark shadow-[2.5px_2.5px_0_#57390A] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#57390A] active:shadow-[1px_1px_0_#57390A]',
        club:
          'bg-club-normal hover:bg-club-normal-hover text-white border-[1.5px] border-club-dark shadow-[2.5px_2.5px_0_#231032] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#231032] active:shadow-[1px_1px_0_#231032]',
        ghost:
          'bg-transparent hover:bg-gray-100/80 dark:hover:bg-gray-800 text-ink-normal dark:text-white',
        destructive:
          'bg-red-600 hover:bg-red-700 text-white border-[1.5px] border-red-800 shadow-[2.5px_2.5px_0_#7F1D1D] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#7F1D1D] active:shadow-[1px_1px_0_#7F1D1D]',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
        md: 'h-10 px-4 py-2 text-sm rounded-xl gap-2',
        lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
        icon: 'h-10 w-10 rounded-xl',
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
        {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
