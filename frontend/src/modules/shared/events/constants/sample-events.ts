export interface SchoolEventItem {
  id: string;
  title: string;
  description: string;
  eventType: 'ACADEMIC' | 'HOLIDAY' | 'EXAM' | 'MEETING' | 'CULTURAL' | 'SPORTS' | 'EXCURSION' | 'STARTUP_WEEKEND';
  categoryKey?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  targetAudience: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS' | 'STAFF' | 'SPECIFIC_CLASSES';
  location?: string;
  coverUrl?: string;
  tags: string[];
  workflowModules?: { key: string; step: number; enabled?: boolean }[];
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface EventCategoryItem {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  removable?: boolean;
}

export function extractCategoryKey(tags?: string[] | null): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  const marker = tags.find((t) => typeof t === 'string' && t.startsWith('categoryKey:'));
  return marker ? marker.slice('categoryKey:'.length) : undefined;
}

export function displayTags(tags?: string[] | null): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => typeof t === 'string' && !t.startsWith('categoryKey:'));
}

export function hydrateEvent(ev: SchoolEventItem): SchoolEventItem {
  const categoryKey = ev.categoryKey || extractCategoryKey(ev.tags);
  return { ...ev, categoryKey, tags: displayTags(ev.tags) };
}

export const INITIAL_SAMPLE_EVENTS: SchoolEventItem[] = [
  {
    id: 'evt_startup_weekend_2026',
    title: 'استارت‌آپ ویکند نوآوری و طراحی نرم‌افزار',
    description: 'رویداد ایده‌پردازی، رای‌گیری، تشکیل تیم و بوم مدل کسب‌وکار ویژه هنرجویان و دانش‌آموزان نوآور',
    eventType: 'STARTUP_WEEKEND',
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    isAllDay: true,
    targetAudience: 'ALL',
    location: 'سالن همایش و آمفی‌تئاتر هنرستان',
    tags: ['استارت‌آپ ویکند', 'ایده‌پردازی', 'تیم‌سازی', 'نوآوری'],
    workflowModules: [
      { key: 'idea_submission', step: 1, enabled: true },
      { key: 'ideas_list', step: 2, enabled: true },
      { key: 'voting_porscad', step: 3, enabled: true },
      { key: 'team_formation', step: 4, enabled: true },
      { key: 'task_definition', step: 5, enabled: true },
      { key: 'presentation_upload', step: 6, enabled: true },
      { key: 'canvas_materials', step: 7, enabled: true },
      { key: 'leaderboard', step: 8, enabled: true },
    ],
    createdAt: new Date().toISOString(),
    createdBy: {
      firstName: 'مدیر',
      lastName: 'رویداد',
      role: 'SUPER_ADMIN',
    },
  },
];
