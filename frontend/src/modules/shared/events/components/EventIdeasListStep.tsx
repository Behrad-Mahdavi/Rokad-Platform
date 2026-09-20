import React, { useState, useMemo } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { EventIdea } from './EventIdeaSubmissionStep';
import { toPersianDigits, formatJalaliDisplay } from '../../../../utils/jalali';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import {
  Sparkles,
  Search,
  User,
  Lightbulb,
  Clock,
  ArrowLeft,
  PlusCircle,
  Edit3,
  ShieldCheck,
  Hash,
  Eye,
} from 'lucide-react';

interface EventIdeasListStepProps {
  ideas: EventIdea[];
  onUpdateIdea?: (updatedIdea: EventIdea) => void;
  onSelectIdeaForVote?: (ideaId: string) => void;
  onGoToSubmitStep: () => void;
  onGoToVotingStep: () => void;
  onGoToCanvasStep: () => void;
}

export const EventIdeasListStep: React.FC<EventIdeasListStepProps> = ({
  ideas,
  onUpdateIdea,
  onSelectIdeaForVote,
  onGoToSubmitStep,
  onGoToVotingStep,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdeaDetail, setSelectedIdeaDetail] = useState<EventIdea | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');

  // Admin Edit Modal State
  const [editingIdea, setEditingIdea] = useState<EventIdea | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    authorName: '',
    ideaNumber: 101,
    status: 'APPROVED' as EventIdea['status'],
  });

  const filteredIdeas = useMemo(() => {
    return ideas.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q) ||
        (item.ideaNumber && String(item.ideaNumber).includes(q));
      return matchSearch;
    });
  }, [ideas, searchQuery]);

  const handleOpenEditModal = (idea: EventIdea, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingIdea(idea);
    setEditForm({
      title: idea.title,
      description: idea.description,
      authorName: idea.authorName,
      ideaNumber: idea.ideaNumber || 101,
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
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-2xl border-3 border-zinc-900 bg-white p-6 shadow-[6px_6px_0px_0px_#18181b] dark:border-zinc-100 dark:bg-zinc-900 dark:shadow-[6px_6px_0px_0px_#f4f4f5]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-indigo-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#18181b]">
              <Sparkles className="w-4 h-4" />
              <span>گام دوم: تالار ایده‌ها</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              ایده‌های ثبت‌شده ({toPersianDigits(ideas.length)} ایده)
            </h2>
            <p className="text-xs md:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              در این مرحله دانش‌آموزان ایده‌ها را مشاهده می‌کنند. ادمین امکان ویرایش تمام فیلدهای هر ایده را دارد.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onGoToSubmitStep}
              className="gap-2 text-xs font-bold border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>ثبت ایده جدید</span>
            </Button>
            <Button
              variant="primary"
              onClick={onGoToVotingStep}
              className="gap-2 text-xs font-black border-2 border-zinc-900 shadow-[3px_3px_0px_0px_#18181b]"
            >
              <span>مرحله رای‌گیری</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="جستجو در اسم ایده، شماره ایده یا نام دانش‌آموز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800 pr-10 pl-4 py-2.5 text-xs md:text-sm font-bold shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Ideas Cards Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="rounded-2xl border-3 border-dashed border-zinc-400 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <Lightbulb className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">ایده‌ای یافت نشد</h3>
          <p className="text-xs font-bold text-zinc-500 mt-1 mb-6">
            اولین فردی باشید که برای این رویداد ایده ثبت می‌کند!
          </p>
          <Button
            variant="primary"
            onClick={onGoToSubmitStep}
            className="border-2 border-zinc-900 font-bold gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ثبت ایده جدید</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIdeas.map((idea) => {
            const isCurrentUserIdea =
              currentUser &&
              (idea.authorName.includes(currentUser.lastName || '') ||
                idea.authorName.includes(currentUser.firstName || ''));

            return (
              <div
                key={idea.id}
                className={`group flex flex-col justify-between rounded-2xl border-3 border-zinc-900 p-5 shadow-[5px_5px_0px_0px_#18181b] transition-all hover:-translate-y-1 dark:border-zinc-100 ${
                  isCurrentUserIdea
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 ring-2 ring-amber-400'
                    : 'bg-white dark:bg-zinc-900'
                }`}
              >
                <div>
                  {/* Top Bar: Idea Number & Admin Edit */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black text-xs shadow-[1px_1px_0px_0px_#18181b]">
                      ایده #{toPersianDigits(idea.ideaNumber || 101)}
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
                          onClick={(e) => handleOpenEditModal(idea, e)}
                          className="p-1.5 rounded-lg border-2 border-zinc-900 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 text-xs font-black shadow-[1px_1px_0px_0px_#18181b]"
                          title="ادیت کامل فیلدهای ایده توسط ادمین"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2 mb-2">
                    {idea.title}
                  </h3>

                  {/* Description preview */}
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-4 leading-relaxed mb-4 whitespace-pre-line">
                    {idea.description}
                  </p>
                </div>

                <div>
                  {/* Author & Date Footer */}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-4">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{idea.authorName}</span>
                    </div>

                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3" />
                      {formatJalaliDisplay(idea.createdAt, false)}
                    </span>
                  </div>

                  {/* Action Button: View Details Only for Students */}
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedIdeaDetail(idea)}
                      className="text-xs font-bold border-2 border-zinc-900 py-2 dark:border-zinc-200 gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>مشاهده جزئیات کامل</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Idea Detail Modal */}
      <Modal
        isOpen={!!selectedIdeaDetail}
        onClose={() => setSelectedIdeaDetail(null)}
        title="مشخصات و جزئیات کامل ایده"
      >
        {selectedIdeaDetail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <span className="px-3 py-1 rounded-xl text-xs font-black border-2 border-zinc-900 bg-amber-400 text-zinc-950">
                ایده #{toPersianDigits(selectedIdeaDetail.ideaNumber || 101)}
              </span>

              {isManager && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const ideaToEdit = selectedIdeaDetail;
                    setSelectedIdeaDetail(null);
                    handleOpenEditModal(ideaToEdit);
                  }}
                  className="text-xs font-bold border-2 border-zinc-900 gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ادیت ادمین</span>
                </Button>
              )}
            </div>

            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 mb-2">
                {selectedIdeaDetail.title}
              </h3>
              <p className="text-xs font-bold text-zinc-500">
                دانش‌آموز: {selectedIdeaDetail.authorName}
              </p>
            </div>

            <div className="rounded-xl border-2 border-zinc-900 bg-zinc-50 p-4 dark:border-zinc-300 dark:bg-zinc-800/60">
              <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>شرح کامل ایده:</span>
              </h4>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {selectedIdeaDetail.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setSelectedIdeaDetail(null)}
                className="border-2 border-zinc-900 font-bold"
              >
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ADMIN EDIT MODAL */}
      <Modal
        isOpen={!!editingIdea}
        onClose={() => setEditingIdea(null)}
        title="ویرایش مدیریت و ادیت تمام فیلدهای ایده (ادمین)"
      >
        {editingIdea && (
          <form onSubmit={handleSaveAdminEdit} className="space-y-4">
            <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-xs font-black flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>ویرایش ادمین: تمام فیلدهای ایده قابل تغییر است.</span>
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
