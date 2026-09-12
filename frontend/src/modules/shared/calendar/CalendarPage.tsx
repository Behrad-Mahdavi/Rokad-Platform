import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { PersianDatePicker } from '../../../components/ui/PersianDatePicker';
import {
  gregorianToJalaliStr,
  jalaliToGregorianDate,
  formatJalaliDisplay,
} from '../../../utils/jalali';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  CalendarCheck,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { ClassSchedulePage } from '../../school-admin/academic/ClassSchedulePage';

export const CalendarPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isStaff = ['SCHOOL_ADMIN', 'STAFF', 'TEACHER', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  const [activeCalendarTab, setActiveCalendarTab] = useState<'TIMETABLE' | 'EVENTS'>('TIMETABLE');
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'EVENT',
    startDate: gregorianToJalaliStr(new Date()),
    startTime: '08:00',
    endDate: gregorianToJalaliStr(new Date()),
    endTime: '10:00',
    location: 'سالن همایش‌های مدرسه',
  });

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/calendar/events');
      setEvents(res.data || []);
    } catch (err) {
      // Mock events
      setEvents([
        {
          id: 'ev-1',
          title: 'آزمون جامع هماهنگ مرحله اول',
          description: 'سنجش پیشرفت تحصیلی دانش‌آموزان پایه دهم و یازدهم',
          type: 'EXAM',
          startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          location: 'حوزه‌های امتحانی ۱ و ۲',
        },
        {
          id: 'ev-2',
          title: 'جلسه مجمع عمومی انجمن اولیاء و مربیان',
          description: 'انتخابات اعضای جدید و ارائه بیلان کاری سال گذشته',
          type: 'MEETING',
          startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          location: 'سالن همایش‌های مدرسه',
        },
        {
          id: 'ev-3',
          title: 'اردوی علمی و پژوهشی پارک فناوری پردیس',
          description: 'ویژه دانش‌آموزان رشته‌های ریاضی و تجربی',
          type: 'EVENT',
          startDate: new Date(Date.now() + 86400000 * 9).toISOString(),
          location: 'پارک فناوری پردیس',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const startDateObj = jalaliToGregorianDate(form.startDate);
      const [sh, sm] = form.startTime.split(':').map(Number);
      startDateObj.setHours(sh || 8, sm || 0, 0, 0);

      const endDateObj = jalaliToGregorianDate(form.endDate);
      const [eh, em] = form.endTime.split(':').map(Number);
      endDateObj.setHours(eh || 10, em || 0, 0, 0);

      await apiClient.post('/calendar/events', {
        title: form.title,
        description: form.description,
        eventType: form.type,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        location: form.location,
      });
      setIsCreateOpen(false);
      setForm({
        title: '',
        description: '',
        type: 'EVENT',
        startDate: gregorianToJalaliStr(new Date()),
        startTime: '08:00',
        endDate: gregorianToJalaliStr(new Date()),
        endTime: '10:00',
        location: 'سالن همایش‌های مدرسه',
      });
      fetchEvents();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت رویداد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveCalendarTab('TIMETABLE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeCalendarTab === 'TIMETABLE'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>برنامه هفتگی کلاس‌های درس (Weekly Timetable)</span>
        </button>

        <button
          onClick={() => setActiveCalendarTab('EVENTS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 space-x-reverse ${
            activeCalendarTab === 'EVENTS'
              ? 'border-primary text-primary-dark'
              : 'border-transparent text-gray-500 hover:text-ink-dark'
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>رویدادها و تقویم مناسبت‌های مدرسه ({events.length})</span>
        </button>
      </div>

      {activeCalendarTab === 'TIMETABLE' ? (
        <ClassSchedulePage readOnly={!['SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(currentUser?.role || '')} />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
                <CalendarIcon className="h-6 w-6 text-primary" />
                <span>تقویم آموزشی و رویدادهای مدرسه (Academic Calendar)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                زمان‌بندی امتحانات، اردوهای علمی، جلسات اولیاء و مربیان و مناسبت‌های تقویمی
              </p>
            </div>

            {isStaff && (
              <Button
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center space-x-1.5 space-x-reverse"
              >
                <Plus className="h-4 w-4" />
                <span>ثبت رویداد جدید</span>
              </Button>
            )}
          </div>

          {/* Events List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="p-6 border hover:border-primary transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Badge
                      variant={
                        event.type === 'EXAM'
                          ? 'destructive'
                          : event.type === 'MEETING'
                          ? 'female'
                          : 'default'
                      }
                    >
                      {event.type === 'EXAM'
                        ? 'امتحان هماهنگ'
                        : event.type === 'MEETING'
                        ? 'جلسه اولیاء'
                        : 'رویداد و اردو'}
                    </Badge>

                    <span className="text-xs font-bold text-gray-600 flex items-center space-x-1 space-x-reverse">
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{formatJalaliDisplay(event.startDate)}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-ink-darker mb-2">{event.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">{event.description}</p>
                </div>

                {event.location && (
                  <div className="pt-3 border-t border-gray-100 flex items-center space-x-1.5 space-x-reverse text-xs text-gray-600">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>مکان: {event.location}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Modal: Create Event */}
          <Modal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            title="ثبت رویداد در تقویم آموزشی"
            description="افزودن رویداد یا جلسه به تقویم عمومی مدرسه"
            maxWidth="lg"
          >
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <Input
                label="عنوان رویداد"
                placeholder="مثال: جلسه عمومی شورای دبیران"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">نوع رویداد</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="EVENT">رویداد عمومی / فرهنگی / ورزشی</option>
                    <option value="EXAM">آزمون و سنجش هماهنگ</option>
                    <option value="MEETING">جلسه اولیاء یا کادر</option>
                    <option value="HOLIDAY">تعطیلی آموزشی</option>
                  </select>
                </div>

                <Input
                  label="مکان برگزاری"
                  placeholder="مثال: سالن ورزشی یا آمفی‌تئاتر"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <PersianDatePicker
                    label="تاریخ شروع"
                    value={form.startDate}
                    onChange={(d) => setForm({ ...form, startDate: d })}
                  />
                  <Input
                    label="ساعت شروع"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <PersianDatePicker
                    label="تاریخ پایان"
                    value={form.endDate}
                    onChange={(d) => setForm({ ...form, endDate: d })}
                  />
                  <Input
                    label="ساعت پایان"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>

              <Input
                label="توضیحات تکمیلی"
                placeholder="جزئیات و برنامه‌ریزی رویداد..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  افزودن به تقویم
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
};
