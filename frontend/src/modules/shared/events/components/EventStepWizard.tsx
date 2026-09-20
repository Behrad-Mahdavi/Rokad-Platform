import React, { useState, useEffect } from 'react';
import { EventIdea, EventIdeaSubmissionStep } from './EventIdeaSubmissionStep';
import { EventIdeasListStep } from './EventIdeasListStep';
import { EventVotingPorscadStep } from './EventVotingPorscadStep';
import { EventCanvasMaterialsStep } from './EventCanvasMaterialsStep';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../utils/jalali';
import {
  Lightbulb,
  Sparkles,
  Star,
  Layers,
  CheckCircle2,
  Workflow,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';

interface EventStepWizardProps {
  eventId: string;
  eventTitle: string;
  initialStep?: number;
}

const DEFAULT_EVENT_IDEAS: EventIdea[] = [];

export const EventStepWizard: React.FC<EventStepWizardProps> = ({
  eventId,
  eventTitle,
  initialStep = 1,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [selectedIdeaForVote, setSelectedIdeaForVote] = useState<string | null>(null);

  // Step Unlocking state for students
  const unlockedStepsKey = `rokad_event_unlocked_steps_${eventId}`;
  const [unlockedSteps, setUnlockedSteps] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(unlockedStepsKey);
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });

  // Storage key for event ideas & lock state
  const storageKey = `rokad_event_ideas_${eventId}`;
  const lockKey = `rokad_event_locked_${eventId}`;

  const [isIdeaSubmissionLocked, setIsIdeaSubmissionLocked] = useState<boolean>(() => {
    return localStorage.getItem(lockKey) === 'true';
  });

  const handleToggleIdeaLock = () => {
    setIsIdeaSubmissionLocked((prev) => {
      const next = !prev;
      localStorage.setItem(lockKey, String(next));
      if (next) {
        toast.info('ثبت ایده قفل شد. اکنون می‌توانید فرم نظرسنجی را در مرحله سوم طراحی نمایید.');
      } else {
        toast.info('ثبت ایده مجدداً بازگشایی شد.');
      }
      return next;
    });
  };

  const handleToggleStepUnlock = (stepNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlockedSteps((prev) => {
      let next: number[];
      if (prev.includes(stepNum)) {
        next = prev.filter((s) => s !== stepNum);
        toast.info(`مرحله ${toPersianDigits(stepNum)} برای دانش‌آموزان قفل شد 🔒`);
      } else {
        next = [...prev, stepNum];
        toast.success(`مرحله ${toPersianDigits(stepNum)} برای دانش‌آموزان بازگشایی شد 🔓`);
      }
      localStorage.setItem(unlockedStepsKey, JSON.stringify(next));
      return next;
    });
  };

  const handleStepClick = (stepNum: number) => {
    if (!isManager && !unlockedSteps.includes(stepNum)) {
      toast.error(`مرحله ${toPersianDigits(stepNum)} هنوز توسط مدیر رویداد بازگشایی نشده و قفل است.`);
      return;
    }
    setCurrentStep(stepNum);
  };

  const [ideas, setIdeas] = useState<EventIdea[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved ideas', e);
    }
    return DEFAULT_EVENT_IDEAS.map((item) => ({ ...item, eventId }));
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(ideas));
    } catch (e) {
      console.error('Failed to save ideas', e);
    }
  }, [ideas, storageKey]);

  const handleIdeaSubmitted = (newIdea: EventIdea) => {
    const updatedIdeas = [newIdea, ...ideas];
    setIdeas(updatedIdeas);
  };

  const handleUpdateIdea = (updatedIdea: EventIdea) => {
    setIdeas((prev) => prev.map((item) => (item.id === updatedIdea.id ? updatedIdea : item)));
  };

  const handleRateIdea = (ideaId: string, rating: { score: number; comment?: string }) => {
    setIdeas((prev) =>
      prev.map((item) => {
        if (item.id !== ideaId) return item;
        const newRating = {
          userId: 'user_' + Date.now(),
          userName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'شما (کاربر فعال)',
          score: rating.score,
          comment: rating.comment,
          createdAt: new Date().toISOString(),
        };
        return {
          ...item,
          starRatings: [newRating, ...(item.starRatings || [])],
        };
      })
    );
  };

  const STEPS_CONFIG = [
    {
      step: 1,
      title: '۱. ثبت ایده',
      subtitle: 'ارسال طرح و پیشنهاد',
      icon: Lightbulb,
      activeColor: 'bg-amber-400 text-zinc-950 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]',
    },
    {
      step: 2,
      title: '۲. تالار ایده‌ها',
      subtitle: 'بانک و ویترین ایده‌ها',
      icon: Sparkles,
      activeColor: 'bg-indigo-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]',
    },
    {
      step: 3,
      title: '۳. رای‌گیری و پرس‌کاد',
      subtitle: 'ستاره‌دهی و نظرسنجی',
      icon: Star,
      activeColor: 'bg-purple-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]',
    },
    {
      step: 4,
      title: '۴. بوم و ورک‌شیت',
      subtitle: 'بوم رویداد و متریال‌ها',
      icon: Layers,
      activeColor: 'bg-emerald-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stepper Navigation Bar */}
      <div className="rounded-2xl border-3 border-zinc-900 bg-white p-4 md:p-5 shadow-[5px_5px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[5px_5px_0px_0px_#f4f4f5]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            <h3 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100">
              چرخه گام‌به‌گام و تعاملی رویداد (ایده ➔ رای‌گیری ➔ بوم)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {isManager ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-indigo-700 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-black">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>پنل مدیر: روی آیکون قفل هر مرحله برای باز/بستن کلیک کنید</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-xs font-black">
                <span>مراحل باز: {toPersianDigits(unlockedSteps.length)} از ۴</span>
              </span>
            )}
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              مرحله فعلی: {toPersianDigits(currentStep)}
            </span>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STEPS_CONFIG.map((s) => {
            const IconComp = s.icon;
            const isCurrent = currentStep === s.step;
            const isPassed = currentStep > s.step;
            const isUnlocked = unlockedSteps.includes(s.step);
            const isLockedForStudent = !isManager && !isUnlocked;

            return (
              <div
                key={s.step}
                onClick={() => handleStepClick(s.step)}
                className={`relative flex items-center justify-between p-3 rounded-xl border-2 transition-all text-right ${
                  isLockedForStudent
                    ? 'border-zinc-300 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 opacity-60 cursor-not-allowed text-zinc-400'
                    : isCurrent
                    ? `border-zinc-900 ${s.activeColor} shadow-[3px_3px_0px_0px_#18181b] cursor-pointer`
                    : isPassed
                    ? 'border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 cursor-pointer'
                    : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className={`w-8 h-8 rounded-lg border-2 border-zinc-900 flex items-center justify-center font-black text-xs shadow-[1px_1px_0px_0px_#18181b] flex-shrink-0 ${
                      isLockedForStudent
                        ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500'
                        : isCurrent
                        ? 'bg-white text-zinc-950'
                        : isPassed
                        ? 'bg-emerald-400 text-zinc-950'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {isLockedForStudent ? (
                      <Lock className="w-3.5 h-3.5 text-zinc-600" />
                    ) : isPassed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <IconComp className="w-4 h-4" />
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <div className="text-xs font-black truncate">{s.title}</div>
                    <div className="text-[10px] font-bold opacity-80 truncate">{s.subtitle}</div>
                  </div>
                </div>

                {/* Lock/Unlock Toggle for Manager */}
                {isManager && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleStepUnlock(s.step, e)}
                    title={isUnlocked ? 'کلیک کنید تا این مرحله برای دانش‌آموزان قفل شود' : 'کلیک کنید تا این مرحله برای دانش‌آموزان بازگشایی شود'}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isUnlocked
                        ? 'border-emerald-600 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'border-rose-600 bg-rose-100 text-rose-950 hover:bg-rose-200 dark:bg-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                )}

                {!isManager && !isUnlocked && (
                  <div className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                    قفل مدیر
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Render Current Step Component */}
      <div>
        {currentStep === 1 && (
          <EventIdeaSubmissionStep
            eventId={eventId}
            eventTitle={eventTitle}
            ideas={ideas}
            isLocked={isIdeaSubmissionLocked}
            onToggleLock={handleToggleIdeaLock}
            onIdeaSubmitted={handleIdeaSubmitted}
            onUpdateIdea={handleUpdateIdea}
            onGoToNextStep={() => setCurrentStep(2)}
            onGoToVotingStep={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 2 && (
          <EventIdeasListStep
            ideas={ideas}
            onUpdateIdea={handleUpdateIdea}
            onSelectIdeaForVote={(id) => setSelectedIdeaForVote(id)}
            onGoToSubmitStep={() => setCurrentStep(1)}
            onGoToVotingStep={() => setCurrentStep(3)}
            onGoToCanvasStep={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 3 && (
          <EventVotingPorscadStep
            eventId={eventId}
            eventTitle={eventTitle}
            ideas={ideas}
            selectedIdeaId={selectedIdeaForVote}
            onRateIdea={handleRateIdea}
            onGoToIdeasList={() => setCurrentStep(2)}
            onGoToCanvasStep={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <EventCanvasMaterialsStep
            eventId={eventId}
            eventTitle={eventTitle}
            onGoToVotingStep={() => setCurrentStep(3)}
            onGoToIdeasList={() => setCurrentStep(2)}
          />
        )}
      </div>
    </div>
  );
};
