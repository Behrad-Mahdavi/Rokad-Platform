import React, { useState, useMemo } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toPersianDigits, formatJalaliDisplay } from '../../../../utils/jalali';
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
  onGoToNextStep: () => void;
  onGoToVotingStep?: () => void;
}

export const EventIdeaSubmissionStep: React.FC<EventIdeaSubmissionStepProps> = ({
  eventId,
  eventTitle,
  ideas = [],
  isLocked = false,
  onToggleLock,
  onIdeaSubmitted,
  onUpdateIdea,
  onGoToNextStep,
  onGoToVotingStep,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error('مهلت ثبت ایده به پایان رسیده و قفل شده است.');
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
      <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5]">
        {/* Header & Lock Controller */}
        <div className="border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#18181b]">
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
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-zinc-900 text-xs font-black transition-all shadow-[2px_2px_0px_0px_#18181b] ${
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

            {isLocked && onGoToVotingStep && (
              <Button
                variant="primary"
                onClick={onGoToVotingStep}
                className="gap-2 text-xs font-black border-2 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]"
              >
                <Vote className="w-4 h-4" />
                <span>رفتن به مرحله نظرسنجی</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
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

        {/* Locked Notice vs Form */}
        {isLocked ? (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 space-y-4 my-6">
            <div className="w-14 h-14 mx-auto rounded-2xl border-2 border-zinc-900 bg-rose-200 flex items-center justify-center shadow-[2px_2px_0px_0px_#18181b]">
              <Lock className="w-7 h-7 text-rose-900" />
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              مهلت ثبت ایده توسط مدیر رویداد بسته شده است
            </h3>
            <p className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              ایده‌های ثبت‌شده جمع‌آوری شده‌اند. شما می‌توانید ایده‌ها را مشاهده کنید.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Automatic Fields (Student Name & Sequential Idea Number) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/70 shadow-[2px_2px_0px_0px_#18181b]">
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
                  className="w-full rounded-xl border-2 border-zinc-400 bg-white dark:bg-zinc-800 p-3 text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100 cursor-not-allowed shadow-none"
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
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs md:text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800 placeholder:text-zinc-400 focus:outline-none"
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
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-3 text-xs md:text-sm font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800 placeholder:text-zinc-400 focus:outline-none"
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
                className="border-2 border-zinc-900 font-black gap-2 px-8 py-3.5 shadow-[4px_4px_0px_0px_#18181b]"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت ایده...' : 'ثبت نهایی ایده'}</span>
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ================= REGISTERED IDEAS LIST ================= */}
      <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 md:p-8 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base md:text-lg font-black text-zinc-900 dark:text-zinc-100">
                ایده‌های ثبت‌شده ({toPersianDigits(ideas.length)} ایده)
              </h3>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                لیست ایده‌های پیشنهادی دانش‌آموزان به همراه شماره اختصاصی هر ایده
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-xs font-black shadow-[2px_2px_0px_0px_#18181b]">
              تعداد: {toPersianDigits(ideas.length)}
            </span>
          </div>
        </div>

        {ideas.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-zinc-500 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
            هنوز ایده‌ای ثبت نشده است. اولین ایده‌پرداز باشید!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ideas.map((idea) => {
              const isCurrentUserIdea =
                currentUser &&
                (idea.authorName.includes(currentUser.lastName || '') ||
                  idea.authorName.includes(currentUser.firstName || ''));

              return (
                <div
                  key={idea.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border-3 border-zinc-900 p-5 shadow-[4px_4px_0px_0px_#18181b] transition-all hover:-translate-y-1 dark:border-zinc-100 ${
                    isCurrentUserIdea
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-400'
                      : 'bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Idea Number & Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black text-xs shadow-[1px_1px_0px_0px_#18181b]">
                        ایده #{toPersianDigits(idea.ideaNumber || 1)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isCurrentUserIdea && (
                          <span className="px-2 py-0.5 rounded-md border border-amber-600 bg-amber-400 text-zinc-950 text-[10px] font-black">
                            ایده شما
                          </span>
                        )}
                        {/* Admin Edit Button */}
                        {isManager && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(idea)}
                            className="p-1.5 rounded-lg border-2 border-zinc-900 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 text-xs font-black shadow-[1px_1px_0px_0px_#18181b]"
                            title="ادیت ادمین"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Idea Title */}
                    <h4 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2">
                      {idea.title}
                    </h4>

                    {/* Idea Description */}
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-4 leading-relaxed whitespace-pre-line">
                      {idea.description}
                    </p>
                  </div>

                  {/* Card Footer: Student Name & Timestamp */}
                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{idea.authorName}</span>
                    </div>

                    <span className="text-[10px] opacity-80">
                      {formatJalaliDisplay(idea.createdAt, false)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
                  className="w-full rounded-xl border-2 border-zinc-900 bg-white p-2.5 text-xs font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800"
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
                  className="w-full rounded-xl border-2 border-zinc-900 bg-white p-2.5 text-xs font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800"
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
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-2.5 text-xs font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800"
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
                className="w-full rounded-xl border-2 border-zinc-900 bg-white p-2.5 text-xs font-medium shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingIdea(null)}
                className="border-2 border-zinc-900 font-bold"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="border-2 border-zinc-900 font-black shadow-[2px_2px_0px_0px_#18181b]"
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
