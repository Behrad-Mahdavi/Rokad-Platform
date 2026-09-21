import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Trash2, Clock } from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';

export interface UndoToastProps {
  id: string | number;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // default 5000ms
  icon?: React.ComponentType<{ className?: string }>;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  id,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  icon: Icon = Trash2,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);

  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        setRemainingTime(remaining);

        if (remaining <= 0) {
          onDismiss();
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, onDismiss]);

  const pauseTimer = () => {
    // Record remaining time and pause countdown
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setRemainingTime(remainingTimeRef.current);
    setIsPaused(true);
  };

  const resumeTimer = () => {
    // Reset start time and resume countdown
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const handleUndoClick = () => {
    onUndo();
    onDismiss();
  };

  const secondsLeft = Math.max(1, Math.ceil(remainingTime / 1000));

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onTouchStart={pauseTimer}
      onTouchEnd={resumeTimer}
      onTouchCancel={resumeTimer}
      className="relative overflow-hidden w-[380px] max-w-full rounded-2xl bg-gray-900/95 dark:bg-[#151D2A]/95 text-white shadow-2xl backdrop-blur-md border border-gray-700/60 dark:border-gray-700 p-3.5 transition-all select-none"
      dir="rtl"
    >
      {/* Toast Content */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-gray-800 text-gray-300 dark:bg-gray-800/80 shrink-0">
            <Icon className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-xs font-bold truncate leading-tight text-gray-100">
            {message}
          </span>
        </div>

        {/* Actions: Countdown Timer Badge & Undo Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Numerical Countdown Timer */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
              isPaused
                ? 'bg-amber-950/40 border-amber-700/50 text-amber-300'
                : 'bg-gray-800/90 border-gray-700 text-amber-400'
            }`}
            title={isPaused ? 'تایمر متوقف شد (با خروج نشانگر ماوس ادامه می‌یابد)' : 'زمان باقی‌مانده برای بازگردانی'}
          >
            <Clock className={`h-3.5 w-3.5 ${isPaused ? '' : 'animate-pulse text-amber-400'}`} />
            <span>{toPersianDigits(secondsLeft)} ثانیه</span>
          </div>

          {/* Undo Action Button */}
          <button
            type="button"
            onClick={handleUndoClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>بازگردانی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
