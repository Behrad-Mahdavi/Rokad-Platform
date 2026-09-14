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
  description,
  subtitle,
  badge,
  actions,
  className,
}) => {
  const displayDescription = description || subtitle;

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
        <div className="flex flex-wrap items-center gap-2">
          {icon && (
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-primary-light dark:bg-primary-darker/60 flex items-center justify-center text-primary-darker dark:text-primary-light shrink-0 border border-primary/20 dark:border-primary/40 shadow-xs">
              {React.isValidElement(icon) ? (
                icon
              ) : (
                React.createElement(icon as React.ComponentType<{ className?: string }>, {
                  className: 'h-3.5 w-3.5 sm:h-4 sm:w-4',
                })
              )}
            </div>
          )}
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-ink-darker dark:text-white leading-snug">
            {title}
          </h2>
          {badge}
        </div>
        {displayDescription && (
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {displayDescription}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
          {actions}
        </div>
      )}
    </div>
  );
};
