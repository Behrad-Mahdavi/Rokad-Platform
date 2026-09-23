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

export const INITIAL_SAMPLE_EVENTS: SchoolEventItem[] = [];
