import {
  LucideIcon,
  Lightbulb,
  Sparkles,
  Star,
  Users,
  Layers,
  ListChecks,
  Trophy,
  FileUp,
} from 'lucide-react';

export type EventModuleKey =
  | 'IDEA_SUBMISSION'
  | 'IDEA_HALL'
  | 'VOTING'
  | 'TEAM_FORMATION'
  | 'EVENT_CANVAS'
  | 'TASK_DEFINITION'
  | 'PRESENTATION_UPLOAD'
  | 'LEADERBOARD';

export interface EventModuleDef {
  key: EventModuleKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  activeColor: string;
}

export const EVENT_MODULE_REGISTRY: Record<EventModuleKey, EventModuleDef> = {
  IDEA_SUBMISSION: {
    key: 'IDEA_SUBMISSION',
    title: 'ثبت ایده',
    subtitle: 'ارسال طرح و پیشنهاد',
    icon: Lightbulb,
    activeColor: 'bg-amber-400 text-zinc-950 border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  IDEA_HALL: {
    key: 'IDEA_HALL',
    title: 'تالار ایده‌ها',
    subtitle: 'بانک و ویترین ایده‌ها',
    icon: Sparkles,
    activeColor: 'bg-indigo-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  VOTING: {
    key: 'VOTING',
    title: 'رای‌گیری و پرس‌کاد',
    subtitle: 'ستاره‌دهی و نظرسنجی',
    icon: Star,
    activeColor: 'bg-purple-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  TEAM_FORMATION: {
    key: 'TEAM_FORMATION',
    title: 'تشکیل تیم و اعضاء',
    subtitle: 'ترکیب اعضای ایده‌ها',
    icon: Users,
    activeColor: 'bg-blue-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  EVENT_CANVAS: {
    key: 'EVENT_CANVAS',
    title: 'بوم و ورک‌شیت',
    subtitle: 'بوم رویداد و متریال‌ها',
    icon: Layers,
    activeColor: 'bg-emerald-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  TASK_DEFINITION: {
    key: 'TASK_DEFINITION',
    title: 'تعریف تسک تیم‌ها',
    subtitle: 'تسک و امتیاز هر تیم',
    icon: ListChecks,
    activeColor: 'bg-cyan-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  PRESENTATION_UPLOAD: {
    key: 'PRESENTATION_UPLOAD',
    title: 'ارائه و تحویل فایل‌ها',
    subtitle: 'ارسال اسلاید و فایل توسط سرتیم',
    icon: FileUp,
    activeColor: 'bg-rose-600 text-white border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
  LEADERBOARD: {
    key: 'LEADERBOARD',
    title: 'لیدربورد امتیازات',
    subtitle: 'جدول رتبه‌بندی تیم‌ها',
    icon: Trophy,
    activeColor: 'bg-amber-500 text-zinc-950 border-zinc-900 shadow-[3px_3px_0px_0px_#202A5A]',
  },
};

export const EVENT_MODULE_LIST: EventModuleDef[] = Object.values(EVENT_MODULE_REGISTRY);

export const DEFAULT_WORKFLOW_MODULES: { key: EventModuleKey; step: number; enabled: boolean }[] = [
  { key: 'IDEA_SUBMISSION', step: 1, enabled: true },
  { key: 'IDEA_HALL', step: 2, enabled: true },
  { key: 'VOTING', step: 3, enabled: true },
  { key: 'TEAM_FORMATION', step: 4, enabled: true },
  { key: 'EVENT_CANVAS', step: 5, enabled: true },
  { key: 'TASK_DEFINITION', step: 6, enabled: true },
  { key: 'PRESENTATION_UPLOAD', step: 7, enabled: true },
  { key: 'LEADERBOARD', step: 8, enabled: true },
];

export interface WorkflowModuleEntry {
  key: EventModuleKey;
  step: number;
  enabled?: boolean;
}

export function normalizeWorkflowModules(raw: unknown): WorkflowModuleEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: WorkflowModuleEntry[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'key' in item && 'step' in item) {
      const obj = item as Record<string, unknown>;
      const key = String(obj.key);
      if (key in EVENT_MODULE_REGISTRY) {
        entries.push({
          key: key as EventModuleKey,
          step: Number(obj.step) || 1,
          enabled: obj.enabled !== false,
        });
      }
    }
  }
  return entries.sort((a, b) => a.step - b.step);
}

/** Sort by current step and reassign contiguous 1..n (no gaps after remove/reorder). */
export function renumberWorkflowModules(entries: WorkflowModuleEntry[]): WorkflowModuleEntry[] {
  return [...entries]
    .sort((a, b) => a.step - b.step)
    .map((m, index) => ({
      ...m,
      step: index + 1,
      enabled: m.enabled !== false,
    }));
}
