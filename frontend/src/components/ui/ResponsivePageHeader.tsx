import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ResponsivePageHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ResponsivePageHeader: React.FC<ResponsivePageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs print:hidden',
          className,
        ),
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {Icon && (
            <div className="h-9 w-9 rounded-xl bg-primary-light flex items-center justify-center text-primary shrink-0 border border-primary/20">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-ink-darker leading-tight truncate">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 sm:line-clamp-none">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {actions}
        </div>
      )}
    </div>
  );
};
