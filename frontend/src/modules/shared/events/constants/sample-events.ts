export interface SchoolEventItem {
  id: string;
  title: string;
  description: string;
  eventType: 'ACADEMIC' | 'HOLIDAY' | 'EXAM' | 'MEETING' | 'CULTURAL' | 'SPORTS' | 'EXCURSION' | 'STARTUP_WEEKEND';
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  targetAudience: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'PARENTS' | 'STAFF' | 'SPECIFIC_CLASSES';
  location?: string;
  coverUrl?: string;
  tags: string[];
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
}

export const INITIAL_SAMPLE_EVENTS: SchoolEventItem[] = [
  {
    id: 'evt_startup_weekend_2026',
    title: 'استارت‌آپ ویکند نوآوری و طراحی نرم‌افزار',
    description: 'رویداد ایده‌پردازی، رای‌گیری، تشکیل تیم و بوم مدل کسب‌وکار ویژه هنرجویان و دانش‌آموزان نوآور',
    eventType: 'STARTUP_WEEKEND',
    startDate: '1405/07/01',
    endDate: '1405/07/03',
    isAllDay: true,
    targetAudience: 'STUDENTS',
    location: 'سالن همایش و آمفی‌تئاتر هنرستان',
    tags: ['استارت‌آپ ویکند', 'ایده‌پردازی', 'تیم‌سازی', 'نوآوری'],
    createdAt: new Date().toISOString(),
    createdBy: {
      firstName: 'مدیر',
      lastName: 'رویداد',
      role: 'SUPER_ADMIN',
    },
  },
];
