import { useRef, useEffect, useCallback } from 'react';
import { toast } from '../../components/ui/toast/toast';

export interface UseUndoableMutationConfig<TVars> {
  mutationFn: (vars: TVars) => Promise<any>;
  optimisticUpdate: (vars: TVars) => void;
  revertUpdate: (vars: TVars) => void;
  undoLabel: string | ((vars: TVars) => string);
  delayMs?: number; // default 5000ms
  onSuccess?: (vars: TVars) => void;
  onError?: (error: any, vars: TVars) => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export function useUndoableMutation<TVars = any>(
  config: UseUndoableMutationConfig<TVars>,
) {
  const pendingActionsRef = useRef<
    Map<
      string,
      {
        timerId: ReturnType<typeof setTimeout>;
        vars: TVars;
        cancel: () => void;
      }
    >
  >(new Map());

  const execute = useCallback(
    (vars: TVars) => {
      const actionId = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const delay = config.delayMs ?? 5000;
      const label =
        typeof config.undoLabel === 'function'
          ? config.undoLabel(vars)
          : config.undoLabel;

      // 1. Optimistic Update in UI immediately
      config.optimisticUpdate(vars);

      let isCancelled = false;

      const cancelAction = () => {
        if (isCancelled) return;
        isCancelled = true;

        const entry = pendingActionsRef.current.get(actionId);
        if (entry) {
          clearTimeout(entry.timerId);
          pendingActionsRef.current.delete(actionId);
        }

        // Revert UI to previous state
        config.revertUpdate(vars);
      };

      // 2. Setup delayed timer for real API execution
      const timerId = setTimeout(async () => {
        pendingActionsRef.current.delete(actionId);
        if (isCancelled) return;

        try {
          await config.mutationFn(vars);
          config.onSuccess?.(vars);
        } catch (err: any) {
          // In case server rejects, revert and show error
          config.revertUpdate(vars);
          config.onError?.(err, vars);
          toast.error(
            err?.response?.data?.message || err?.message || 'خطا در اعمال عملیات',
          );
        }
      }, delay);

      pendingActionsRef.current.set(actionId, {
        timerId,
        vars,
        cancel: cancelAction,
      });

      // 3. Show Telegram-style Undo Toast
      toast.undoable({
        message: label,
        duration: delay,
        icon: config.icon,
        onUndo: () => {
          cancelAction();
        },
      });

      return {
        actionId,
        cancel: cancelAction,
      };
    },
    [config],
  );

  // Global Ctrl+Z / Cmd+Z shortcut to undo latest pending action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const pendingEntries = Array.from(pendingActionsRef.current.values());
        if (pendingEntries.length > 0) {
          e.preventDefault();
          const latest = pendingEntries[pendingEntries.length - 1];
          latest.cancel();
          toast.success('عملیات با میان‌بر Ctrl+Z بازگردانده شد', { duration: 2500 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { execute };
}
