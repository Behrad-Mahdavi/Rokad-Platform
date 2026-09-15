import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ResponsivePageHeaderProps {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: string;
  description?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ResponsivePageHeader: React.FC<ResponsivePageHeaderProps> = ({
  icon,
  title,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-[#151C28] p-3.5 sm:p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-xs print:hidden',
          className,
        ),
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {icon && (
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary-light dark:bg-primary-darker/60 flex items-center justify-center text-primary-darker dark:text-primary-light shrink-0 border border-primary/20 dark:border-primary/40 shadow-xs">
              {React.isValidElement(icon) ? (
                icon
              ) : (
                React.createElement(icon as React.ComponentType<{ className?: string }>, {
                  className: 'h-4 w-4 sm:h-5 sm:w-5',
                })
              )}
            </div>
          )}
          <h1 className="text-base sm:text-lg md:text-xl font-black text-ink-darker dark:text-white leading-tight">
            {title}
          </h1>
          {badge}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
          {actions}
        </div>
      )}
    </div>
  );
};
