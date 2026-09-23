import React, { useState, useEffect, useMemo } from 'react';
import { EventIdea, EventIdeaSubmissionStep } from './EventIdeaSubmissionStep';
import { EventIdeasListStep } from './EventIdeasListStep';
import { EventVotingPorscadStep } from './EventVotingPorscadStep';
import { EventTeamFormationStep } from './EventTeamFormationStep';
import { EventCanvasMaterialsStep } from './EventCanvasMaterialsStep';
import { EventTaskDefinitionStep } from './EventTaskDefinitionStep';
import { EventLeaderboardStep } from './EventLeaderboardStep';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../utils/jalali';
import { EVENT_MODULE_REGISTRY, WorkflowModuleEntry, renumberWorkflowModules } from '../constants/event-modules';
import { parseJsonArray } from '../constants/event-access';
import {
  CheckCircle2,
  Workflow,
  Lock,
  Unlock,
  ShieldCheck,
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
  { key: 'LEADERBOARD', step: 7, enabled: true },
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

  // Dynamic steps config derived from workflowModules (always contiguous 1..n)
  const STEPS_CONFIG = useMemo(() => {
    const entries = renumberWorkflowModules(
      (workflowModules && workflowModules.length > 0 ? workflowModules : DEFAULT_WORKFLOW).filter(
        (m) => m.enabled !== false
      )
    );

    return entries.map((entry, index) => {
      const def = EVENT_MODULE_REGISTRY[entry.key as keyof typeof EVENT_MODULE_REGISTRY];
      const displayStep = index + 1;
      return {
        step: displayStep,
        key: entry.key,
        title: `${toPersianDigits(displayStep)}. ${def.title}`,
        subtitle: def.subtitle,
        icon: def.icon,
        activeColor: def.activeColor,
      };
    });
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

  return (
    <div className="space-y-6">
      {/* Stepper Navigation Bar */}
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-4 md:p-5 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" />
            <h3 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100">
              چرخه گام‌به‌گام و تعاملی رویداد
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
                <span>مراحل باز: {toPersianDigits(unlockedSteps.length)} از {toPersianDigits(STEPS_CONFIG.length)}</span>
              </span>
            )}
            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">
              مرحله فعلی: {toPersianDigits(currentStep)}
            </span>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                    ? `border-zinc-900 ${s.activeColor} shadow-[3px_3px_0px_0px_#202A5A] cursor-pointer`
                    : isPassed
                    ? 'border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 cursor-pointer'
                    : 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className={`w-8 h-8 rounded-lg border-2 border-zinc-900 flex items-center justify-center font-black text-xs shadow-[1px_1px_0px_0px_#202A5A] flex-shrink-0 ${
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
                    className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border transition-all ${
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
                  onGoToNextStep={() => goToStepByKey('IDEA_HALL')}
                  onGoToVotingStep={() => goToStepByKey('VOTING')}
                />
              );
            case 'IDEA_HALL':
              return (
                <EventIdeasListStep
                  key={cfg.key}
                  ideas={ideas}
                  onUpdateIdea={handleUpdateIdea}
                  onSelectIdeaForVote={(id) => setSelectedIdeaForVote(id)}
                  onGoToSubmitStep={() => goToStepByKey('IDEA_SUBMISSION')}
                  onGoToVotingStep={() => goToStepByKey('VOTING')}
                  onGoToCanvasStep={() => goToStepByKey('EVENT_CANVAS')}
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
                  onGoToIdeasList={() => goToStepByKey('IDEA_HALL')}
                  onGoToCanvasStep={() => goToStepByKey('EVENT_CANVAS')}
                  onGoToTeamFormation={() => goToStepByKey('TEAM_FORMATION')}
                />
              );
            case 'TEAM_FORMATION':
              return (
                <EventTeamFormationStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                  onGoToVotingStep={() => goToStepByKey('VOTING')}
                  onGoToCanvasStep={() => goToStepByKey('EVENT_CANVAS')}
                />
              );
            case 'EVENT_CANVAS':
              return (
                <EventCanvasMaterialsStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  onGoToVotingStep={() => goToStepByKey('VOTING')}
                  onGoToIdeasList={() => goToStepByKey('IDEA_HALL')}
                />
              );
            case 'TASK_DEFINITION':
              return (
                <EventTaskDefinitionStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                  onGoToLeaderboard={() => goToStepByKey('LEADERBOARD')}
                  onGoToTeamFormation={() => goToStepByKey('TEAM_FORMATION')}
                />
              );
            case 'LEADERBOARD':
              return (
                <EventLeaderboardStep
                  key={cfg.key}
                  eventId={eventId}
                  eventTitle={eventTitle}
                  ideas={ideas}
                  onGoToTasks={() => goToStepByKey('TASK_DEFINITION')}
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
