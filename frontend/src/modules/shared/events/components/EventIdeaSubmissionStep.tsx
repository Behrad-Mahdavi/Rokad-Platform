import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toPersianDigits, formatJalaliDisplay } from '../../../../utils/jalali';
import { isOwnedByUser } from '../constants/event-access';
import {
  Lightbulb,
  Send,
  Sparkles,
  User,
  CheckCircle2,
  FileText,
  Lock,
  Unlock,
  Vote,
  ArrowLeft,
  Hash,
  Edit3,
  ShieldCheck,
} from 'lucide-react';

export interface EventIdea {
  id: string;
  eventId: string;
  ideaNumber: number;
  title: string;
  description: string;
  authorName: string;
  authorRole?: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  starRatings?: {
    userId: string;
    userName: string;
    score: number;
    comment?: string;
    createdAt: string;
  }[];
  category?: string;
  goals?: string;
  suggestedMaterials?: string;
  attachmentUrl?: string;
}

interface EventIdeaSubmissionStepProps {
  eventId: string;
  eventTitle: string;
  ideas?: EventIdea[];
  isLocked?: boolean;
  onToggleLock?: () => void;
  onIdeaSubmitted: (idea: EventIdea) => void;
  onUpdateIdea?: (updatedIdea: EventIdea) => void;
}

export const EventIdeaSubmissionStep: React.FC<EventIdeaSubmissionStepProps> = ({
  eventId,
  eventTitle,
  ideas = [],
  isLocked = false,
  onToggleLock,
  onIdeaSubmitted,
  onUpdateIdea,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Admin Edit Modal State
  const [editingIdea, setEditingIdea] = useState<EventIdea | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    authorName: '',
    ideaNumber: 1,
    status: 'APPROVED' as EventIdea['status'],
  });

  // Calculate Next Sequential Idea Number
  const nextIdeaNumber = useMemo(() => {
    const maxExisting = ideas.reduce(
      (max, item) => Math.max(max, item.ideaNumber || 0),
      0
    );
    const counterKey = `rokad_idea_counter_${eventId}`;
    const storedCounter = parseInt(localStorage.getItem(counterKey) || '0', 10);
    return Math.max(maxExisting, storedCounter) + 1;
  }, [ideas, eventId]);

  const studentName = useMemo(() => {
    if (currentUser) {
      const full = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (full) return full;
    }
    return 'دانش‌آموز';
  }, [currentUser]);

  // Find if current student has already submitted an idea for this event
  const userSubmittedIdea = useMemo(() => {
    if (!currentUser) return null;
    const exact = ideas.find(
      (item) => item.authorName.trim().toLowerCase() === studentName.trim().toLowerCase(),
    );
    if (exact) return exact;
    return ideas.find((item) => isOwnedByUser(item.authorName, currentUser)) || null;
  }, [ideas, currentUser, studentName]);

  const [studentEditTitle, setStudentEditTitle] = useState('');
  const [studentEditDescription, setStudentEditDescription] = useState('');

  useEffect(() => {
    if (userSubmittedIdea) {
      setStudentEditTitle(userSubmittedIdea.title);
      setStudentEditDescription(userSubmittedIdea.description);
    }
  }, [userSubmittedIdea]);

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error('مهلت ویرایش ایده به پایان رسیده و قفل شده است.');
      return;
    }
    if (!userSubmittedIdea) return;
    if (!studentEditTitle.trim() || !studentEditDescription.trim()) {
      toast.error('لطفاً اسم و شرح ایده را وارد نمایید.');
      return;
    }

    const updated: EventIdea = {
      ...userSubmittedIdea,
      title: studentEditTitle.trim(),
      description: studentEditDescription.trim(),
    };

    if (onUpdateIdea) {
      onUpdateIdea(updated);
    }
    toast.success('ویرایش ایده شما با موفقیت ذخیره شد ✨');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error('مهلت ثبت ایده به پایان رسیده و قفل شده است.');
      return;
    }

    if (userSubmittedIdea && !isManager) {
      toast.error('شما قبلاً ۱ ایده برای این رویداد ثبت کرده‌اید. در این مرحله فقط می‌توانید همان ایده را ویرایش نمایید.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error('لطفاً اسم و شرح ایده را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);

    const counterKey = `rokad_idea_counter_${eventId}`;
    const assignedNumber = nextIdeaNumber;
    localStorage.setItem(counterKey, String(assignedNumber));

    const newIdea: EventIdea = {
      id: 'idea_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      eventId,
      ideaNumber: assignedNumber,
      title: title.trim(),
      description: description.trim(),
      authorName: studentName,
      authorRole: 'دانش‌آموز',
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      starRatings: [],
    };

    setTimeout(() => {
      onIdeaSubmitted(newIdea);
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      setTitle('');
      setDescription('');
      toast.success(`ایده شما با شماره #${toPersianDigits(assignedNumber)} ثبت شد! 🎉`);
    }, 300);
  };

  const handleOpenEditModal = (idea: EventIdea) => {
    setEditingIdea(idea);
    setEditForm({
      title: idea.title,
      description: idea.description,
      authorName: idea.authorName,
      ideaNumber: idea.ideaNumber || 1,
      status: idea.status || 'APPROVED',
    });
  };

  const handleSaveAdminEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea) return;

    const updated: EventIdea = {
      ...editingIdea,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      authorName: editForm.authorName.trim(),
      ideaNumber: Number(editForm.ideaNumber),
      status: editForm.status,
    };

    if (onUpdateIdea) {
      onUpdateIdea(updated);
    }
    setEditingIdea(null);
    toast.success('تغییرات ایده با موفقیت ذخیره شد.');
  };

  return (
    <div className="space-y-8">
      {/* Container: Submission Form */}
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 md:p-8 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        {/* Header & Lock Controller */}
        <div className="border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#202A5A]">
              <Lightbulb className="w-4 h-4" />
              <span>گام اول: ثبت ایده دانش‌آموزی</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              ثبت ایده جدید برای رویداد
            </h2>
            <p className="text-xs md:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              اسم ایده و شرح ایده را وارد کنید. اسم و شماره اختصاصی ایده شما به صورت خودکار توسط سیستم صادر می‌شود.
            </p>
          </div>

          {/* Manager Lock/Unlock Controller */}
          <div className="flex items-center gap-2">
            {isManager && onToggleLock && (
              <button
                type="button"
                onClick={onToggleLock}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-zinc-900 text-xs font-black transition-all shadow-[2px_2px_0px_0px_#202A5A] ${
                  isLocked
                    ? 'bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-200'
                    : 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200'
                }`}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-4 h-4 text-rose-600" />
                    <span>ثبت ایده قفل است (کلیک برای بازگشایی)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-emerald-600" />
                    <span>ثبت ایده باز است (کلیک برای بستن ثبت‌ها)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Submission Success Alert */}
        {isSubmittedSuccess && (
          <div className="mb-6 flex items-center justify-between gap-3 p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">
            <div className="flex items-center gap-2.5 text-xs md:text-sm font-black">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>ایده شما با موفقیت ثبت شد و به لیست ایده‌های پایین صفحه اضافه گردید! 🎉</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSubmittedSuccess(false)}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Locked Notice vs Existing Submitted Idea Edit vs New Submission Form */}
        {userSubmittedIdea && !isManager && !isLocked ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 flex flex-wrap items-center justify-between gap-4 shadow-[2px_2px_0px_0px_#202A5A]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border-2 border-zinc-900 bg-amber-400 text-zinc-950 flex items-center justify-center font-black">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>ایده ثبت‌شده شما: ایده #{toPersianDigits(userSubmittedIdea.ideaNumber)}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500 text-white border border-zinc-900 font-bold">
                      ثبت شده (۱ از ۱)
                    </span>
                  </h4>
                  <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    هر دانش‌آموز مجاز به ثبت ۱ ایده است. در این مرحله می‌توانید عنوان و شرح ایده خود را ویرایش کنید.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/70 shadow-[2px_2px_0px_0px_#202A5A]">
                <div>
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-primary" />
                    <span>اسم ثبت‌کننده ایده:</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={userSubmittedIdea.authorName}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-xs md:text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-amber-500" />
                    <span>شماره اختصاصی ایده شما:</span>
                  </label>
                  <div className="w-full rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs md:text-sm font-black text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <span>کد شماره: #{toPersianDigits(userSubmittedIdea.ideaNumber)}</span>
                  </div>
                </div>
              </div>

              {/* Idea Title Edit */}
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>اسم ایده (قابل ویرایش) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentEditTitle}
                  onChange={(e) => setStudentEditTitle(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>

              {/* Idea Description Edit */}
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>شرح ایده (قابل ویرایش) *</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={studentEditDescription}
                  onChange={(e) => setStudentEditDescription(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-zinc-900/10">
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-indigo-500 text-white font-black gap-2 px-8 py-3.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>ذخیره ویرایش‌های ایده من</span>
                </Button>
              </div>
            </form>
          </div>
        ) : isLocked ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 space-y-4 my-6">
            <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-zinc-900 bg-rose-200 flex items-center justify-center shadow-[2px_2px_0px_0px_#202A5A]">
              <Lock className="w-7 h-7 text-rose-900" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              مهلت ثبت ایده جدید توسط مدیر رویداد بسته شده است
            </h3>
            <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              ثبت ایده‌های جدید قفل شده است. شما می‌توانید ایده‌ها را در تالار ایده‌ها مشاهده کنید.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Automatic Fields (Student Name & Sequential Idea Number) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/70 shadow-[2px_2px_0px_0px_#202A5A]">
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span>اسم دانش‌آموز (ثبت خودکار):</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={studentName}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-zinc-100 dark:bg-zinc-800 p-3 text-xs md:text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-500" />
                  <span>شماره اختصاصی ایده (صادره سیستم به ترتیب):</span>
                </label>
                <div className="w-full rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs md:text-sm font-black text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <span>کد شماره: #{toPersianDigits(nextIdeaNumber)}</span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    تولید خودکار ترتیبی
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Idea Title */}
            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>اسم ایده *</span>
              </label>
              <input
                type="text"
                required
                placeholder="عنوان دقیق ایده یا طرح پیشنهادی را وارد کنید..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Row 3: Idea Description */}
            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>شرح ایده *</span>
              </label>
              <textarea
                required
                rows={5}
                placeholder="توضیح کامل ایده، نحوه‌ی اجرا و ویژگی‌های طرح خود را شرح دهید..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs md:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Submit Action */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t-2 border-zinc-900/10">
              <span className="text-xs font-bold text-zinc-500">
                پس از ثبت، ایده با شماره ترتیبی یکتا ثبت می‌شود.
              </span>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="font-black gap-2 px-8 py-3.5"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت ایده...' : 'ثبت نهایی ایده'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>



      {/* ADMIN EDIT MODAL */}
      <Modal
        isOpen={!!editingIdea}
        onClose={() => setEditingIdea(null)}
        title="ویرایش مدیریت و ادیت فیلدهای ایده (ویژه ادمین)"
      >
        {editingIdea && (
          <form onSubmit={handleSaveAdminEdit} className="space-y-4">
            <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs font-black flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>شما به عنوان ادمین مجاز به تغییر تمامی فیلدهای این ایده هستید.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                  شماره ایده:
                </label>
                <input
                  type="number"
                  required
                  value={editForm.ideaNumber}
                  onChange={(e) => setEditForm({ ...editForm, ideaNumber: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                  اسم دانش‌آموز:
                </label>
                <input
                  type="text"
                  required
                  value={editForm.authorName}
                  onChange={(e) => setEditForm({ ...editForm, authorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                اسم ایده:
              </label>
              <input
                type="text"
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1">
                شرح ایده:
              </label>
              <textarea
                required
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingIdea(null)}
                className="font-bold"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="font-black"
              >
                ذخیره تغییرات ادمین
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
