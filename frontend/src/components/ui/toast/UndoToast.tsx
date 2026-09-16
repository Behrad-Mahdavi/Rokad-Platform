import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Trash2, AlertCircle } from 'lucide-react';

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
  const [progress, setProgress] = useState(100);

  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        const percent = (remaining / duration) * 100;
        setProgress(percent);

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
  }, [isPaused, duration, onDismiss]);

  const handleMouseEnter = () => {
    // Record remaining time and pause
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    // Reset start time and resume
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const handleUndoClick = () => {
    onUndo();
    onDismiss();
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden w-[360px] max-w-full rounded-2xl bg-gray-900/95 dark:bg-[#151D2A]/95 text-white shadow-2xl backdrop-blur-md border border-gray-700/60 dark:border-gray-700 p-3.5 transition-all select-none"
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

      {/* Telegram-style Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
        <div
          className="h-full bg-primary transition-all ease-linear"
          style={{
            width: `${progress}%`,
            transitionDuration: isPaused ? '0ms' : '50ms',
          }}
        />
      </div>
    </div>
  );
};
