import React, { useState, useEffect, useMemo } from 'react';
import { EventIdea, EventIdeaSubmissionStep } from './EventIdeaSubmissionStep';
import { EventIdeasListStep } from './EventIdeasListStep';
import { EventVotingPorscadStep } from './EventVotingPorscadStep';
import { EventTeamFormationStep } from './EventTeamFormationStep';
import { EventCanvasMaterialsStep } from './EventCanvasMaterialsStep';
import { EventTaskDefinitionStep } from './EventTaskDefinitionStep';
import { EventPresentationUploadStep } from './EventPresentationUploadStep';
import { EventLeaderboardStep } from './EventLeaderboardStep';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../utils/jalali';
import { EVENT_MODULE_REGISTRY, WorkflowModuleEntry, renumberWorkflowModules } from '../constants/event-modules';
import { parseJsonArray } from '../constants/event-access';
import {
  CheckCircle2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface EventStepWizardProps {
  eventId: string;
  eventTitle: string;
  workflowModules?: WorkflowModuleEntry[];
  initialStep?: number;
}

const DEFAULT_WORKFLOW: WorkflowModuleEntry[] = [
  { key: 'IDEA_SUBMISSION', step: 1, enabled: true },
  { key: 'IDEA_HALL', step: 2, enabled: true },
  { key: 'VOTING', step: 3, enabled: true },
  { key: 'TEAM_FORMATION', step: 4, enabled: true },
  { key: 'EVENT_CANVAS', step: 5, enabled: true },
  { key: 'TASK_DEFINITION', step: 6, enabled: true },
  { key: 'PRESENTATION_UPLOAD', step: 7, enabled: true },
  { key: 'LEADERBOARD', step: 8, enabled: true },
];

const DEFAULT_EVENT_IDEAS: EventIdea[] = [];

export const EventStepWizard: React.FC<EventStepWizardProps> = ({
  eventId,
  eventTitle,
  workflowModules,
  initialStep = 1,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  const [selectedIdeaForVote, setSelectedIdeaForVote] = useState<string | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const activeStepRef = React.useRef<HTMLDivElement>(null);

  // Dynamic steps config derived from workflowModules (always contiguous 1..n)
  const STEPS_CONFIG = useMemo(() => {
    const rawList =
      workflowModules !== undefined
        ? workflowModules
        : DEFAULT_WORKFLOW;

    const activeList = rawList.filter((m) => m.enabled !== false);
    const entries = renumberWorkflowModules(activeList);

    return entries
      .map((entry, index) => {
        const def = EVENT_MODULE_REGISTRY[entry.key as keyof typeof EVENT_MODULE_REGISTRY];
        if (!def) return null;
        const displayStep = index + 1;
        return {
          step: displayStep,
          key: entry.key,
          title: `${toPersianDigits(displayStep)}. ${def.title}`,
          subtitle: def.subtitle,
          icon: def.icon,
          activeColor: def.activeColor,
        };
      })
      .filter(Boolean) as Array<{
      step: number;
      key: keyof typeof EVENT_MODULE_REGISTRY;
      title: string;
      subtitle: string;
      icon: any;
      activeColor: string;
    }>;
  }, [workflowModules]);

  const stepNumbers = useMemo(() => new Set(STEPS_CONFIG.map((s) => s.step)), [STEPS_CONFIG]);

  // Step Unlocking state for students
  const unlockedStepsKey = `rokad_event_unlocked_steps_${eventId}`;
  const [unlockedSteps, setUnlockedSteps] = useState<number[]>(() => {
    const fallback = STEPS_CONFIG.length > 0 ? [STEPS_CONFIG[0].step] : [1];
    try {
      return parseJsonArray<number>(localStorage.getItem(unlockedStepsKey), fallback);
    } catch {
      return fallback;
    }
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    let preferred = initialStep;
    if (!isManager && unlockedSteps.length > 0 && !unlockedSteps.includes(initialStep)) {
      preferred = Math.min(...unlockedSteps);
    }
    // Fallback when preferred step is outside the active step list (avoids blank wizard)
    if (!stepNumbers.has(preferred)) {
      return STEPS_CONFIG[0]?.step ?? 1;
    }
    return preferred;
  });

  // Auto redirect student if current step gets locked
  useEffect(() => {
    if (!isManager && unlockedSteps.length > 0 && !unlockedSteps.includes(currentStep)) {
      const firstAvailable = Math.min(...unlockedSteps);
      setCurrentStep(firstAvailable);
    }
  }, [unlockedSteps, isManager, currentStep]);

  // Smooth scroll active step into view in horizontal roadmap
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentStep]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -220 : 220;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Storage key for event ideas & lock state
  const storageKey = `rokad_event_ideas_${eventId}`;
  const lockKey = `rokad_event_locked_${eventId}`;

  const [isIdeaSubmissionLocked, setIsIdeaSubmissionLocked] = useState<boolean>(() => {
    return localStorage.getItem(lockKey) === 'true';
  });

  const isStep1Locked = isIdeaSubmissionLocked || (!isManager && !unlockedSteps.includes(STEPS_CONFIG[0]?.step ?? 1));

  const firstStep = STEPS_CONFIG[0]?.step ?? 1;

  const handleToggleIdeaLock = () => {
    setIsIdeaSubmissionLocked((prev) => {
      const next = !prev;
      localStorage.setItem(lockKey, String(next));
      if (next) {
        toast.info('ثبت ایده قفل شد.');
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
        toast.info(`مرحله ${toPersianDigits(stepNum)} برای دانش‌آموزان قفل شد.`);
      } else {
        next = [...prev, stepNum];
        toast.success(`مرحله ${toPersianDigits(stepNum)} برای دانش‌آموزان بازگشایی شد.`);
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
      const parsed = parseJsonArray<EventIdea>(
        localStorage.getItem(storageKey),
        DEFAULT_EVENT_IDEAS.map((item) => ({ ...item, eventId })),
      );
      if (parsed.length > 0 || localStorage.getItem(storageKey) === '[]') return parsed;
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

  const goToStepByKey = (key: string) => {
    const target = STEPS_CONFIG.find((s) => s.key === key);
    if (target) handleStepClick(target.step);
  };

  const handleIdeaSubmitted = (newIdea: EventIdea) => {
    const updatedIdeas = [newIdea, ...ideas];
    setIdeas(updatedIdeas);
  };

  const handleUpdateIdea = (updatedIdea: EventIdea) => {
    setIdeas((prev) => prev.map((item) => (item.id === updatedIdea.id ? updatedIdea : item)));
  };

  const handleDeleteIdea = (ideaId: string) => {
    setIdeas((prev) => prev.filter((item) => item.id !== ideaId));
  };

  return (
    <div className="space-y-6">
      {/* Horizontal Step-by-Step Roadmap */}
      <div className="relative group/roadmap">
        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          title="اسکرول به چپ"
          className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary transition-all opacity-0 group-hover/roadmap:opacity-100 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          title="اسکرول به راست"
          className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 shadow-md items-center justify-center text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary transition-all opacity-0 group-hover/roadmap:opacity-100 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Horizontal Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none py-2 px-1 w-full touch-pan-x select-none"
        >
          {STEPS_CONFIG.map((s, index) => {
            const IconComp = s.icon;
            const isCurrent = currentStep === s.step;
            const isPassed = currentStep > s.step;
            const isUnlocked = unlockedSteps.includes(s.step);
            const isLockedForStudent = !isManager && !isUnlocked;

            return (
              <React.Fragment key={s.step}>
                <div
                  ref={isCurrent ? activeStepRef : null}
                  onClick={() => handleStepClick(s.step)}
                  className={`group flex-shrink-0 flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl transition-all text-right select-none ${
                    isLockedForStudent
                      ? 'border border-gray-200/60 dark:border-gray-800/80 bg-gray-100/60 dark:bg-gray-900/40 opacity-60 cursor-not-allowed'
                      : isCurrent
                      ? 'border-[1.5px] border-primary bg-primary/10 dark:bg-primary/20 shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#1F413D] ring-2 ring-primary/20 cursor-pointer'
                      : isPassed
                      ? 'border border-emerald-300/80 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/25 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40 hover:border-emerald-400 cursor-pointer shadow-2xs'
                      : 'border border-gray-200/90 dark:border-[#242F42] bg-white dark:bg-[#151C28] hover:bg-gray-50 dark:hover:bg-[#1C2536] hover:border-primary/40 cursor-pointer shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                      isLockedForStudent
                        ? 'bg-gray-200/80 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        : isCurrent
                        ? 'bg-primary text-white shadow-sm'
                        : isPassed
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-2xs group-hover:text-primary group-hover:border-primary/30'
                    }`}
                  >
                    {isLockedForStudent ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </div>

                  <span
                    className={`text-xs sm:text-[13px] whitespace-nowrap ${
                      isLockedForStudent
                        ? 'font-medium text-gray-400 dark:text-gray-500'
                        : isCurrent
                        ? 'font-black text-primary'
                        : isPassed
                        ? 'font-bold text-emerald-900 dark:text-emerald-200'
                        : 'font-bold text-ink-darker dark:text-gray-200 group-hover:text-primary transition-colors'
                    }`}
                  >
                    {s.title}
                  </span>

                  {/* Lock/Unlock Toggle for Manager */}
                  {isManager && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleStepUnlock(s.step, e)}
                      title={isUnlocked ? 'کلیک کنید تا این مرحله برای دانش‌آموزان قفل شود' : 'کلیک کنید تا این مرحله برای دانش‌آموزان بازگشایی شود'}
                      className={`p-1 w-6 h-6 flex items-center justify-center rounded-md border transition-all shrink-0 cursor-pointer shadow-2xs ${
                        isUnlocked
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                      }`}
                    >
                      {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    </button>
                  )}

                  {!isManager && !isUnlocked && (
                    <div className="px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      <span>قفل</span>
                    </div>
                  )}
                </div>

                {/* Arrow connector between steps */}
                {index < STEPS_CONFIG.length - 1 && (
                  <div className="flex items-center justify-center shrink-0 text-gray-300 dark:text-gray-600">
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Render Current Step Component */}
      <div>
        {STEPS_CONFIG.map((cfg) => {
          if (currentStep !== cfg.step) return null;
          const def = EVENT_MODULE_REGISTRY[cfg.key as keyof typeof EVENT_MODULE_REGISTRY];
          if (!def) return null;

          switch (cfg.key) {
            case 'IDEA_SUBMISSION':
              return (
                <EventIdeaSubmissionStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                  isLocked={isStep1Locked}
                  onToggleLock={handleToggleIdeaLock}
                  onIdeaSubmitted={handleIdeaSubmitted}
                  onUpdateIdea={handleUpdateIdea}
                  onDeleteIdea={handleDeleteIdea}
                />
              );
            case 'IDEA_HALL':
              return (
                <EventIdeasListStep
                  key={cfg.key}
                  ideas={ideas}
                  onUpdateIdea={handleUpdateIdea}
                  onSelectIdeaForVote={(id) => setSelectedIdeaForVote(id)}
                />
              );
            case 'VOTING':
              return (
                <EventVotingPorscadStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                  selectedIdeaId={selectedIdeaForVote}
                />
              );
            case 'TEAM_FORMATION':
              return (
                <EventTeamFormationStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                />
              );
            case 'EVENT_CANVAS':
              return (
                <EventCanvasMaterialsStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                />
              );
            case 'TASK_DEFINITION':
              return (
                <EventTaskDefinitionStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                />
              );
            case 'PRESENTATION_UPLOAD':
              return (
                <EventPresentationUploadStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                />
              );
            case 'LEADERBOARD':
              return (
                <EventLeaderboardStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
