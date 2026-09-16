import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { UndoToast } from './UndoToast';

export interface UndoableToastOptions {
  message: string;
  onUndo: () => void;
  onConfirm?: () => void;
  duration?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export const toast = {
  success: (message: string, options?: { duration?: number; description?: string }) => {
    return sonnerToast.success(message, {
      duration: options?.duration ?? 3000,
      description: options?.description,
    });
  },

  error: (message: string, options?: { duration?: number; description?: string }) => {
    return sonnerToast.error(message, {
      duration: options?.duration ?? 5000,
      description: options?.description,
    });
  },

  warning: (message: string, options?: { duration?: number; description?: string }) => {
    return sonnerToast.warning(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
    });
  },

  info: (message: string, options?: { duration?: number; description?: string }) => {
    return sonnerToast.info(message, {
      duration: options?.duration ?? 3000,
      description: options?.description,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    data: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
  ) => {
    return sonnerToast.promise(promise, data);
  },

  /**
   * نمایش توست بازگردانی تلگرامی با نوار پیشرفت و تایمر ۵ ثانیه
   */
  undoable: (options: UndoableToastOptions) => {
    const duration = options.duration ?? 5000;

    return sonnerToast.custom(
      (t) => (
        <UndoToast
          id={t}
          message={options.message}
          duration={duration}
          icon={options.icon}
          onUndo={() => {
            options.onUndo();
            sonnerToast.dismiss(t);
            sonnerToast.success('تغییرات با موفقیت بازگردانده شد', { duration: 2500 });
          }}
          onDismiss={() => {
            if (options.onConfirm) {
              options.onConfirm();
            }
            sonnerToast.dismiss(t);
          }}
        />
      ),
      {
        duration,
      },
    );
  },

  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
