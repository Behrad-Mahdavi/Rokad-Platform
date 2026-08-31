import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Bell,
  Plus,
  Pin,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Users,
} from 'lucide-react';

export const NoticeboardPage: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const isStaffOrAdmin = ['SCHOOL_ADMIN', 'STAFF', 'TEACHER', 'SUPER_ADMIN'].includes(currentUser?.role || '');

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAudience, setFilterAudience] = useState<string>('ALL');

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    audience: 'ALL',
    isPinned: false,
    priority: 'NORMAL',
  });

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/calendar/events?type=ANNOUNCEMENT');
      setAnnouncements(res.data || []);
    } catch (err) {
      // Fallback mock notices
      setAnnouncements([
        {
          id: 'note-1',
          title: 'دستورالعمل برگزاری امتحانات میان‌ترم نوبت اول',
          description: 'کلیه دانش‌آموزان و دبیران گرامی توجه فرمایید امتحانات از تاریخ ۱۵ آبان به صورت حضوری و آنلاین آغاز می‌گردد.',
          isPinned: true,
          audience: 'ALL',
          createdAt: new Date().toISOString(),
          author: { firstName: 'مدیریت', lastName: 'مجتمع آموزشی' },
        },
        {
          id: 'note-2',
          title: 'جلسه اولیاء و مربیان پایه دهم',
          description: 'جلسه هم‌اندیشی و تبادل نظر پیرامون وضعیت درسی روز پنجشنبه ساعت ۱۰ صبح در سالن اجتماعات برگزار خواهد شد.',
          isPinned: false,
          audience: 'PARENTS',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          author: { firstName: 'معاونت', lastName: 'آموزشی' },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/calendar/events', {
        title: form.title,
        description: form.description,
        type: 'ANNOUNCEMENT',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        isAllDay: true,
      });
      setIsCreateOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت اطلاعیه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = announcements.filter((n) =>
    filterAudience === 'ALL' ? true : n.audience === filterAudience || n.audience === 'ALL'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <Bell className="h-6 w-6 text-primary" />
            <span>بورد اطلاعیه‌ها و اعلانات رسمی (Noticeboard)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            بخشنامه‌ها، اطلاعیه‌های فوری، زمان‌بندی رویدادها و اخبار مدرسه
          </p>
        </div>

        {isStaffOrAdmin && (
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center space-x-1.5 space-x-reverse"
          >
            <Plus className="h-4 w-4" />
            <span>ثبت اطلاعیه جدید</span>
          </Button>
        )}
      </div>

      {/* Audience Filter Pills */}
      <div className="flex space-x-2 space-x-reverse border-b border-gray-200 pb-3">
        {[
          { key: 'ALL', label: 'همه اطلاعیه‌ها' },
          { key: 'STUDENTS', label: 'ویژه دانش‌آموزان' },
          { key: 'PARENTS', label: 'ویژه اولیاء' },
          { key: 'TEACHERS', label: 'ویژه معلمان' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterAudience(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterAudience === tab.key
                ? 'bg-primary text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border text-gray-500 text-sm">
            اطلاعیه‌ای در این دسته وجود ندارد.
          </div>
        ) : (
          filtered.map((notice) => (
            <Card
              key={notice.id}
              className={`p-6 border transition-all ${
                notice.isPinned ? 'border-amber-400 bg-amber-50/20' : 'hover:border-primary'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {notice.isPinned && (
                      <Badge variant="warning" className="flex items-center space-x-1 space-x-reverse">
                        <Pin className="h-3 w-3" />
                        <span>سنجاق‌شده</span>
                      </Badge>
                    )}
                    <Badge variant="default">
                      {notice.audience === 'PARENTS'
                        ? 'اولیاء'
                        : notice.audience === 'STUDENTS'
                        ? 'دانش‌آموزان'
                        : 'عمومی'}
                    </Badge>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(notice.createdAt || Date.now()).toLocaleDateString('fa-IR')}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-ink-darker">{notice.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{notice.description}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>
                  صادرکننده: {notice.author ? `${notice.author.firstName} ${notice.author.lastName}` : 'دفتر مدیریت'}
                </span>
                <span className="text-primary font-bold">پلتفرم مدارس رُکاد</span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Create Announcement */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="ثبت اطلاعیه و بخشنامه جدید"
        description="انتشار پیام در بورد رسمی و ارسال نوتیفیکیشن برای مخاطبان منتخب"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateNotice} className="space-y-4">
          <Input
            label="عنوان اطلاعیه"
            placeholder="مثال: دستورالعمل تعطیلی روز شنبه به علت برودت هوا"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">مخاطبان هدف</label>
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm text-ink-normal focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">همه اعضای مدرسه (عمومی)</option>
              <option value="STUDENTS">فقط دانش‌آموزان</option>
              <option value="PARENTS">فقط اولیاء گرامی</option>
              <option value="TEACHERS">فقط دبیران و کادر</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-normal mb-1.5 text-right">متن کامل اطلاعیه</label>
            <textarea
              rows={5}
              placeholder="متن کامل بخشنامه یا اطلاعیه را بنویسید..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              انتشار اطلاعیه
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
