import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { toPersianDigits } from '../../../../utils/jalali';
import { EventIdea } from './EventIdeaSubmissionStep';
import {
  EventTaskItem,
  EventTaskBoardState,
  buildTaskBoardTeams,
  ensureTeamEntry,
  findStudentTeamKeys,
  loadTaskBoard,
  loadTeamsMap,
  saveTaskBoard,
  teamTaskScore,
  TaskBoardTeamInfo,
} from '../constants/event-taskboard';
import {
  ListChecks,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ArrowLeft,
  Trophy,
  Users,
  AlertCircle,
  Copy,
} from 'lucide-react';

interface EventTaskDefinitionStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  onGoToLeaderboard: () => void;
  onGoToTeamFormation: () => void;
}

interface TaskFormState {
  title: string;
  points: string;
}

const emptyTaskForm: TaskFormState = { title: '', points: '20' };

const TEAM_SECTION_STYLES = [
  'border-cyan-600 bg-cyan-50/40 dark:border-cyan-700 dark:bg-cyan-950/30',
  'border-violet-600 bg-violet-50/40 dark:border-violet-700 dark:bg-violet-950/30',
  'border-amber-600 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/30',
  'border-emerald-600 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/30',
  'border-rose-600 bg-rose-50/40 dark:border-rose-700 dark:bg-rose-950/30',
  'border-indigo-600 bg-indigo-50/40 dark:border-indigo-700 dark:bg-indigo-950/30',
];

export const EventTaskDefinitionStep: React.FC<EventTaskDefinitionStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  onGoToLeaderboard,
  onGoToTeamFormation,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(
    currentUser?.role || '',
  );

  const teamsMap = useMemo(() => loadTeamsMap(eventId), [eventId]);
  const allTeams = useMemo(
    () => buildTaskBoardTeams(eventId, ideas, teamsMap),
    [eventId, ideas, teamsMap],
  );

  const [board, setBoard] = useState<EventTaskBoardState>(() => loadTaskBoard(eventId));
  const [activeTeamKey, setActiveTeamKey] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [bulkForm, setBulkForm] = useState<TaskFormState[]>([
    { title: '', points: '20' },
  ]);
  const [applyBulkToAll, setApplyBulkToAll] = useState(true);

  const visibleTeams = useMemo(() => {
    if (isManager) return allTeams;
    const myKeys = findStudentTeamKeys(
      allTeams,
      currentUser?.firstName,
      currentUser?.lastName,
    );
    if (myKeys.length === 0) return [];
    return allTeams.filter((t) => myKeys.includes(t.key));
  }, [allTeams, isManager, currentUser]);

  useEffect(() => {
    saveTaskBoard(eventId, board);
  }, [eventId, board]);

  useEffect(() => {
    if (visibleTeams.length === 0) {
      setActiveTeamKey(null);
      return;
    }
    if (!activeTeamKey || !visibleTeams.some((t) => t.key === activeTeamKey)) {
      setActiveTeamKey(visibleTeams[0].key);
    }
  }, [visibleTeams, activeTeamKey]);

  const activeTeam: TaskBoardTeamInfo | undefined = visibleTeams.find(
    (t) => t.key === activeTeamKey,
  );

  const openAddTask = (teamKey?: string) => {
    if (teamKey) setActiveTeamKey(teamKey);
    else if (!activeTeamKey && visibleTeams[0]) setActiveTeamKey(visibleTeams[0].key);
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
    setIsAddOpen(true);
  };

  const openEditTask = (task: EventTaskItem, teamKey?: string) => {
    if (teamKey) setActiveTeamKey(teamKey);
    setEditingTaskId(task.id);
    setTaskForm({ title: task.title, points: String(task.points) });
    setIsAddOpen(true);
  };

  const handleSaveTask = () => {
    if (!activeTeamKey) return;
    const title = taskForm.title.trim();
    const points = parseInt(taskForm.points, 10);
    if (!title) {
      toast.error('عنوان تسک را وارد کنید.');
      return;
    }
    if (Number.isNaN(points) || points < 0) {
      toast.error('امتیاز تسک باید عدد معتبر باشد.');
      return;
    }

    setBoard((prev) => {
      const next = ensureTeamEntry(prev, activeTeamKey);
      const entry = { ...next.teams[activeTeamKey] };
      if (editingTaskId) {
        entry.tasks = entry.tasks.map((t) =>
          t.id === editingTaskId ? { ...t, title, points } : t,
        );
      } else {
        const newTask: EventTaskItem = {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title,
          points,
          completed: false,
        };
        entry.tasks = [...entry.tasks, newTask];
      }
      return { ...next, teams: { ...next.teams, [activeTeamKey]: entry } };
    });

    setIsAddOpen(false);
    setEditingTaskId(null);
    toast.success(editingTaskId ? 'تسک ویرایش شد.' : 'تسک اضافه شد.');
  };

  const handleDeleteTask = (taskId: string, teamKey?: string) => {
    const key = teamKey || activeTeamKey;
    if (!key) return;
    setBoard((prev) => {
      const entry = prev.teams[key];
      if (!entry) return prev;
      return {
        ...prev,
        teams: {
          ...prev.teams,
          [key]: {
            ...entry,
            tasks: entry.tasks.filter((t) => t.id !== taskId),
          },
        },
      };
    });
    toast.info('تسک حذف شد.');
  };

  const handleToggleComplete = (taskId: string, teamKey?: string) => {
    const key = teamKey || activeTeamKey;
    if (!key) return;
    setBoard((prev) => {
      const next = ensureTeamEntry(prev, key);
      const entry = { ...next.teams[key] };
      entry.tasks = entry.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const completed = !t.completed;
        return {
          ...t,
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      });
      return { ...next, teams: { ...next.teams, [key]: entry } };
    });
  };

  const handleAddBulkRow = () => {
    setBulkForm((prev) => [...prev, { title: '', points: '20' }]);
  };

  const handleBulkRowChange = (index: number, patch: Partial<TaskFormState>) => {
    setBulkForm((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleRemoveBulkRow = (index: number) => {
    setBulkForm((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSaveBulk = () => {
    const cleaned = bulkForm
      .map((row) => ({
        title: row.title.trim(),
        points: parseInt(row.points, 10),
      }))
      .filter((row) => row.title && !Number.isNaN(row.points) && row.points >= 0);

    if (cleaned.length === 0) {
      toast.error('حداقل یک تسک معتبر وارد کنید.');
      return;
    }

    const targetKeys = applyBulkToAll
      ? allTeams.map((t) => t.key)
      : activeTeamKey
        ? [activeTeamKey]
        : [];

    if (targetKeys.length === 0) {
      toast.error('تیمی برای اعمال تسک‌ها انتخاب نشده است.');
      return;
    }

    const stamp = Date.now();
    setBoard((prev) => {
      let next = prev;
      targetKeys.forEach((key, teamIdx) => {
        next = ensureTeamEntry(next, key);
        const entry = { ...next.teams[key] };
        const newTasks: EventTaskItem[] = cleaned.map((row, i) => ({
          id: `task_${stamp}_${teamIdx}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          title: row.title,
          points: row.points,
          completed: false,
        }));
        entry.tasks = [...entry.tasks, ...newTasks];
        next = { ...next, teams: { ...next.teams, [key]: entry } };
      });
      return next;
    });

    setIsBulkOpen(false);
    setBulkForm([{ title: '', points: '20' }]);
    toast.success(
      `${toPersianDigits(cleaned.length)} تسک برای ${toPersianDigits(targetKeys.length)} تیم ثبت شد.`,
    );
  };

  if (visibleTeams.length === 0) {
    return (
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-white p-8 sm:p-12 text-center dark:border-zinc-700 dark:bg-zinc-900 space-y-3">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
          تیمی برای تعریف تسک یافت نشد
        </h3>
        <p className="text-xs font-bold text-zinc-500 max-w-md mx-auto leading-relaxed">
          ابتدا ایده‌ها را ثبت، رای‌گیری را تکمیل و تیم‌ها را در مرحله تشکیل تیم بسازید؛ سپس
          برای هر تیم تسک و امتیاز تعریف کنید.
        </p>
        <Button variant="outline" size="sm" onClick={onGoToTeamFormation} className="mx-auto">
          رفتن به تشکیل تیم
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-cyan-500 text-white text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#202A5A]">
              <ListChecks className="w-4 h-4" />
              <span>مرحله تعریف تسک تیم‌ها</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              تسک‌های {eventTitle}
            </h2>
            <p className="text-xs md:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              هر تیم در سکشن جداگانه نمایش داده می‌شود. دانش‌آموز فقط تیم خودش را می‌بیند؛
              مدیر به همه تیم‌ها دسترسی دارد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <>
                <Button variant="sec" size="sm" onClick={() => setIsBulkOpen(true)}>
                  <Copy className="w-3.5 h-3.5" />
                  افزودن گروهی تسک
                </Button>
                <Button variant="primary" size="sm" onClick={() => openAddTask()}>
                  <Plus className="w-3.5 h-3.5" />
                  تسک جدید
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onGoToLeaderboard}>
              <Trophy className="w-3.5 h-3.5" />
              لیدربورد
            </Button>
          </div>
        </div>

        {isManager && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-cyan-600 bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200 text-xs font-black">
            <ShieldCheck className="w-4 h-4" />
            <span>پنل مدیر: افزودن، ویرایش، حذف و تیک زدن تسک‌های همه تیم‌ها فعال است</span>
          </div>
        )}
      </div>

      {/* One section per team */}
      <div className="space-y-6">
        {visibleTeams.map((team, teamIndex) => {
          const entry = board.teams[team.key];
          const score = teamTaskScore(entry);
          const tasks = entry?.tasks || [];
          const doneCount = tasks.filter((t) => t.completed).length;
          const style = TEAM_SECTION_STYLES[teamIndex % TEAM_SECTION_STYLES.length];
          const isActive = team.key === activeTeamKey;

          return (
            <section
              key={team.key}
              className={`rounded-2xl border-[1.5px] p-5 shadow-[2.75px_2.75px_0_#202A5A] transition-all dark:shadow-[2.75px_2.75px_0_#59BBAF] ${style} ${
                isActive ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''
              }`}
            >
              {/* Team section header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-3 border-b-2 border-zinc-900/10 dark:border-zinc-100/10">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border-2 border-zinc-900 bg-white dark:bg-zinc-900 dark:border-zinc-100 text-xs font-black shadow-[2px_2px_0px_0px_#202A5A]">
                    {toPersianDigits(teamIndex + 1)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-700 dark:text-zinc-300 flex-shrink-0" />
                      <h3 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100 truncate">
                        {team.label}
                      </h3>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {team.memberNames.join('، ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-white dark:bg-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 text-[11px] font-black shadow-[1px_1px_0px_0px_#202A5A]">
                    {toPersianDigits(doneCount)}/{toPersianDigits(tasks.length)} تسک
                  </span>
                  <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 text-[11px] font-black shadow-[1px_1px_0px_0px_#202A5A] inline-flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {toPersianDigits(score)} امتیاز
                  </span>
                  {isManager && (
                    <Button
                      variant="sec"
                      size="sm"
                      onClick={() => openAddTask(team.key)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      افزودن
                    </Button>
                  )}
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-zinc-400/70 bg-white/70 dark:bg-zinc-900/50 dark:border-zinc-700 p-6 text-center space-y-1">
                  <ListChecks className="w-8 h-8 mx-auto text-cyan-500 mb-1" />
                  <p className="text-xs font-black text-zinc-700 dark:text-zinc-200">
                    هنوز تسکی برای این تیم تعریف نشده
                  </p>
                  <p className="text-[11px] font-bold text-zinc-500">
                    {isManager
                      ? 'با «افزودن» یا «افزودن گروهی» لیست تسک‌ها را بسازید.'
                      : 'منتظر تعریف تسک توسط مدیر رویداد باشید.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {tasks.map((task, index) => (
                    <li
                      key={task.id}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                        task.completed
                          ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40'
                          : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(task.id, team.key)}
                        disabled={!isManager}
                        title={
                          isManager
                            ? task.completed
                              ? 'برداشتن تیک (کسر امتیاز)'
                              : 'تیک زدن (اعطای امتیاز)'
                            : 'فقط مدیر می‌تواند تیک بزند'
                        }
                        className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                          task.completed
                            ? 'border-emerald-700 bg-emerald-500 text-white'
                            : 'border-zinc-400 bg-white text-zinc-400 dark:bg-zinc-900 dark:border-zinc-600'
                        } ${isManager ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-70'}`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-400">
                            #{toPersianDigits(index + 1)}
                          </span>
                          <span
                            className={`text-xs font-black truncate ${
                              task.completed
                                ? 'text-emerald-800 dark:text-emerald-300 line-through decoration-emerald-500/60'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      </div>

                      <span className="flex-shrink-0 px-2.5 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 text-[11px] font-black shadow-[1px_1px_0px_0px_#202A5A]">
                        {toPersianDigits(task.points)} امتیاز
                      </span>

                      {isManager && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditTask(task, team.key)}
                            className="p-2 min-w-[40px] min-h-[40px] rounded-lg border-2 border-zinc-900 bg-indigo-100 text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200"
                            title="ویرایش تسک"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id, team.key)}
                            className="p-2 min-w-[40px] min-h-[40px] rounded-lg border-2 border-zinc-900 bg-rose-100 text-rose-900 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200"
                            title="حذف تسک"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Add / Edit single task modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingTaskId ? 'ویرایش تسک' : 'افزودن تسک جدید'}
        description={
          activeTeam ? `تیم: ${activeTeam.label}` : undefined
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              عنوان تسک
            </label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="مثلا: طراحی صفحه اصلی لندینگ"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs md:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300 mb-1.5">
              امتیاز تسک
            </label>
            <input
              type="number"
              min={0}
              value={taskForm.points}
              onChange={(e) => setTaskForm((p) => ({ ...p, points: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs md:text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveTask}>
              {editingTaskId ? 'ذخیره تغییرات' : 'افزودن تسک'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk add modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="افزودن گروهی تسک"
        description="چند تسک را یکجا برای یک تیم یا همه تیم‌ها ثبت کنید"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-black text-zinc-800 dark:text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={applyBulkToAll}
              onChange={(e) => setApplyBulkToAll(e.target.checked)}
              className="w-4 h-4 accent-cyan-600"
            />
            اعمال روی همه تیم‌ها
            {!applyBulkToAll && (
              <span className="text-zinc-500 font-bold">
                (تیم فعال: {activeTeam?.label || '—'})
              </span>
            )}
          </label>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {bulkForm.map((row, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2"
              >
                <span className="text-[10px] font-black text-zinc-400 w-5 text-center">
                  {toPersianDigits(index + 1)}
                </span>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => handleBulkRowChange(index, { title: e.target.value })}
                  placeholder={`عنوان تسک ${toPersianDigits(index + 1)}`}
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:outline-none transition-all"
                />
                <input
                  type="number"
                  min={0}
                  value={row.points}
                  onChange={(e) => handleBulkRowChange(index, { points: e.target.value })}
                  className="w-16 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium text-center focus:border-primary focus:outline-none transition-all"
                  title="امتیاز"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveBulkRow(index)}
                  className="p-2 min-w-[36px] min-h-[36px] rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                  title="حذف ردیف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Button variant="sec" size="sm" onClick={handleAddBulkRow}>
            <Plus className="w-3.5 h-3.5" />
            ردیف دیگر
          </Button>

          <div className="flex justify-end gap-2 pt-2 border-t-2 border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" size="md" onClick={() => setIsBulkOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="md" onClick={handleSaveBulk}>
              ثبت تسک‌ها
            </Button>
          </div>
        </div>
      </Modal>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={onGoToTeamFormation}>
          <ArrowLeft className="w-3.5 h-3.5" />
          تشکیل تیم
        </Button>
        <Button variant="sec" size="sm" onClick={onGoToLeaderboard}>
          <Trophy className="w-3.5 h-3.5" />
          رفتن به لیدربورد
        </Button>
      </div>
    </div>
  );
};
