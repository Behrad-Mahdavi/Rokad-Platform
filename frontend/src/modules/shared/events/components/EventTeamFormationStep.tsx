import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { apiClient } from '../../../../lib/api/client';
import { toPersianDigits } from '../../../../utils/jalali';
import { EventIdea } from './EventIdeaSubmissionStep';
import { porscadClient } from '../../../../lib/porscad/porscad-client';
import { isOwnedByUser } from '../constants/event-access';
import {
  Users,
  User,
  UserPlus,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Crown,
  Briefcase,
  UserX,
  Plus,
  Check,
} from 'lucide-react';

export interface TeamMember {
  id: string;
  name: string;
  roleInTeam: string;
  addedBy: string;
  addedAt: string;
}

export interface IdeaTeam {
  ideaId: string;
  ideaNumber: number;
  ideaTitle: string;
  leaderName: string;
  members: TeamMember[];
  isApprovedByAdmin: boolean;
  approvedAt?: string;
}

interface EventTeamFormationStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
}

// Default Fallback Database Students List (names only — no class labels)
const FALLBACK_DB_STUDENTS = [
  // هنرستان پسرانه - شبکه و نرم‌افزار
  { id: 'std_101', name: 'امیرعلی رضایی' },
  { id: 'std_102', name: 'محمدحسین علیزاده' },
  { id: 'std_103', name: 'علیرضا حسینی' },
  { id: 'std_104', name: 'مهدی محمودی' },
  { id: 'std_105', name: 'رضا صبوری' },
  { id: 'std_106', name: 'سینا کاظمی' },
  { id: 'std_107', name: 'پارسا اوسطی' },
  { id: 'std_108', name: 'حسین اکبری' },
  { id: 'std_109', name: 'دانیال مهدوی' },
  { id: 'std_110', name: 'کیان سلطانی' },
  { id: 'std_111', name: 'بردیا کریمی' },
  { id: 'std_112', name: 'آرین شمس' },
  { id: 'std_113', name: 'نیما طاهری' },
  { id: 'std_114', name: 'سامان یزدانی' },
  { id: 'std_115', name: 'پویا صالحی' },

  // هنرستان دخترانه - شبکه و چندرسانه‌ای
  { id: 'std_201', name: 'ستایش مرادی' },
  { id: 'std_202', name: 'سارا احمدی' },
  { id: 'std_203', name: 'فاطمه موسوی' },
  { id: 'std_204', name: 'نرگس ابراهیمی' },
  { id: 'std_205', name: 'یکتا خسروی' },
  { id: 'std_206', name: 'رها سلیمانی' },
  { id: 'std_207', name: 'آوا قربانی' },
  { id: 'std_208', name: 'مبینا حسینی' },
  { id: 'std_209', name: 'هلیا رفیعی' },
  { id: 'std_210', name: 'دیانا نوری' },

  // کالج تخصصی و طراحی
  { id: 'std_301', name: 'امیررضا مختاری' },
  { id: 'std_302', name: 'شایان دهقان' },
  { id: 'std_303', name: 'ماهان فرهمند' },
  { id: 'std_304', name: 'نازنین زارع' },
  { id: 'std_305', name: 'غزل اکبریان' },
];

export const EventTeamFormationStep: React.FC<EventTeamFormationStepProps> = ({
  eventId,
  eventTitle,
  ideas,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');
  const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'دانش‌آموز';

  // DB Students list state
  const [dbStudents, setDbStudents] = useState<Array<{ id: string; name: string }>>(FALLBACK_DB_STUDENTS);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Filter ideas to show ONLY the top winning ideas specified from Porscad Poll (Step 3)
  const winningIdeas = useMemo(() => {
    const poll = porscadClient.getLocalPollData(eventId);
    if (!poll || !poll.isClosed) {
      return []; // empty until poll is finished and top winning ideas are selected!
    }

    const winningOptionIds =
      poll.winningOptionIds || (poll.winningOptionId ? [poll.winningOptionId] : []);
    const topCount =
      Number(poll.topWinnersCount) > 0 ? Number(poll.topWinnersCount) : winningOptionIds.length || 1;

    const sortedOptions = [...(poll.options || [])].sort(
      (a, b) => (b.voteCount || 0) - (a.voteCount || 0)
    );
    const topWinningOptions = sortedOptions.slice(0, topCount);

    const winningIdeaIds = new Set<string>();
    for (const opt of topWinningOptions) {
      if (opt.ideaId) winningIdeaIds.add(opt.ideaId);
      if (opt.id) winningIdeaIds.add(opt.id);
    }
    for (const wId of winningOptionIds) {
      winningIdeaIds.add(wId);
    }

    const matched = ideas.filter(
      (idea) =>
        winningIdeaIds.has(idea.id) ||
        topWinningOptions.some((o) => o.text && o.text.includes(idea.title))
    );

    if (matched.length > 0) return matched;
    return ideas.slice(0, topCount);
  }, [eventId, ideas]);

  // Teams state per idea
  const teamsStorageKey = `rokad_event_teams_${eventId}`;
  const [teamsMap, setTeamsMap] = useState<Record<string, IdeaTeam>>(() => {
    try {
      const saved = localStorage.getItem(teamsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse teams state', e);
    }
    return {};
  });

  // Save teams state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(teamsStorageKey, JSON.stringify(teamsMap));
    } catch (e) {
      console.error('Failed to save teams state', e);
    }
  }, [teamsMap, teamsStorageKey]);

  // Fetch DB students from API (name only)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get('/users?role=STUDENT');
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          }));
          setDbStudents(mapped);
        }
      } catch (err) {
        // Safe offline fallback to FALLBACK_DB_STUDENTS
      }
    };
    fetchStudents();
  }, []);

  // Modal State for Adding/Editing Member
  const [activeIdeaIdForModal, setActiveIdeaIdForModal] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [memberRole, setMemberRole] = useState('عضو تیم / توسعه‌دهنده');
  const [customStudentName, setCustomStudentName] = useState('');

  // Identify all assigned student names/IDs across ALL teams to enforce unique assignment!
  const assignedStudentMap = useMemo(() => {
    const map: Record<string, { ideaId: string; ideaNumber: number; ideaTitle: string }> = {};
    Object.values(teamsMap).forEach((team) => {
      team.members.forEach((m) => {
        map[m.id] = { ideaId: team.ideaId, ideaNumber: team.ideaNumber, ideaTitle: team.ideaTitle };
        map[m.name.trim().toLowerCase()] = { ideaId: team.ideaId, ideaNumber: team.ideaNumber, ideaTitle: team.ideaTitle };
      });
      // Leader is also assigned!
      map[team.leaderName.trim().toLowerCase()] = { ideaId: team.ideaId, ideaNumber: team.ideaNumber, ideaTitle: team.ideaTitle };
    });
    return map;
  }, [teamsMap]);

  // Get or initialize Team object for an idea
  const getIdeaTeam = (idea: EventIdea): IdeaTeam => {
    if (teamsMap[idea.id]) return teamsMap[idea.id];
    return {
      ideaId: idea.id,
      ideaNumber: idea.ideaNumber || 1,
      ideaTitle: idea.title,
      leaderName: idea.authorName,
      members: [],
      isApprovedByAdmin: false,
    };
  };

  // Add Member to Idea Team
  const handleAddMember = (idea: EventIdea) => {
    const targetStudent = dbStudents.find((s) => s.id === selectedStudentId);
    const candidateName = targetStudent ? targetStudent.name : customStudentName.trim();
    const candidateId = targetStudent ? targetStudent.id : 'custom_' + Date.now();

    if (!candidateName) {
      toast.error('لطفاً یک دانش‌آموز را از لیست انتخاب کنید یا نام فرد را وارد نمایید.');
      return;
    }

    // Check unique constraint: Has this person already been assigned to another team?
    const existingAssignment = assignedStudentMap[candidateId] || assignedStudentMap[candidateName.toLowerCase()];
    if (existingAssignment && existingAssignment.ideaId !== idea.id) {
      toast.error(
        `خطا: «${candidateName}» قبلاً عضو تیم ایده #${toPersianDigits(existingAssignment.ideaNumber)} (${existingAssignment.ideaTitle}) شده است و نمی‌تواند همزمان عضو دو تیم باشد!`
      );
      return;
    }

    const currentTeam = getIdeaTeam(idea);

    // Prevent duplicate within same team
    if (currentTeam.members.some((m) => m.id === candidateId || m.name.toLowerCase() === candidateName.toLowerCase())) {
      toast.error(`«${candidateName}» قبلاً به این تیم اضافه شده است.`);
      return;
    }

    const newMember: TeamMember = {
      id: candidateId,
      name: candidateName,
      roleInTeam: memberRole || 'عضو تیم',
      addedBy: currentUserName,
      addedAt: new Date().toISOString(),
    };

    const updatedTeam: IdeaTeam = {
      ...currentTeam,
      members: [...currentTeam.members, newMember],
    };

    setTeamsMap((prev) => ({
      ...prev,
      [idea.id]: updatedTeam,
    }));

    toast.success(`«${candidateName}» با نقش «${memberRole}» به تیم اضافه شد.`);
    setSelectedStudentId('');
    setCustomStudentName('');
  };

  // Add Member directly from list without closing modal
  const handleAddMemberDirectly = (idea: EventIdea, student: { id: string; name: string }) => {
    const candidateName = student.name;
    const candidateId = student.id;

    // Check unique constraint: Has this person already been assigned to another team?
    const existingAssignment = assignedStudentMap[candidateId] || assignedStudentMap[candidateName.toLowerCase()];
    if (existingAssignment && existingAssignment.ideaId !== idea.id) {
      toast.error(
        `خطا: «${candidateName}» قبلاً عضو تیم ایده #${toPersianDigits(existingAssignment.ideaNumber)} (${existingAssignment.ideaTitle}) شده است و نمی‌تواند همزمان عضو دو تیم باشد!`
      );
      return;
    }

    const currentTeam = getIdeaTeam(idea);

    // Prevent duplicate within same team
    if (currentTeam.members.some((m) => m.id === candidateId || m.name.toLowerCase() === candidateName.toLowerCase())) {
      toast.error(`«${candidateName}» قبلاً به این تیم اضافه شده است.`);
      return;
    }

    const newMember: TeamMember = {
      id: candidateId,
      name: candidateName,
      roleInTeam: memberRole || 'عضو تیم',
      addedBy: currentUserName,
      addedAt: new Date().toISOString(),
    };

    const updatedTeam: IdeaTeam = {
      ...currentTeam,
      members: [...currentTeam.members, newMember],
    };

    setTeamsMap((prev) => ({
      ...prev,
      [idea.id]: updatedTeam,
    }));

    toast.success(`«${candidateName}» به ترکیب تیم اضافه شد.`);
  };

  // Remove Member from Idea Team
  const handleRemoveMember = (ideaId: string, memberId: string, memberName: string) => {
    const currentTeam = teamsMap[ideaId];
    if (!currentTeam) return;

    if (currentTeam.isApprovedByAdmin && !isManager) {
      toast.error('این ترکیب تیم توسط مدیر تایید نهایی شده و قابل ویرایش نیست.');
      return;
    }

    const updatedMembers = currentTeam.members.filter((m) => m.id !== memberId);
    setTeamsMap((prev) => ({
      ...prev,
      [ideaId]: {
        ...currentTeam,
        members: updatedMembers,
      },
    }));

    toast.info(`«${memberName}» از ترکیب تیم حذف شد.`);
  };

  // Admin Toggle Team Approval
  const handleToggleAdminApproval = (ideaId: string) => {
    if (!isManager) return;
    const currentTeam = teamsMap[ideaId];
    if (!currentTeam) return;

    const nextState = !currentTeam.isApprovedByAdmin;
    if (nextState && (!currentTeam.members || currentTeam.members.length === 0)) {
      toast.error('تیم هنوز عضوی ندارد؛ ابتدا حداقل یک عضو اضافه کنید.');
      return;
    }

    setTeamsMap((prev) => ({
      ...prev,
      [ideaId]: {
        ...currentTeam,
        isApprovedByAdmin: nextState,
        approvedAt: nextState ? new Date().toISOString() : undefined,
      },
    }));

    if (nextState) {
      toast.success(`ترکیب تیم ایده #${toPersianDigits(currentTeam.ideaNumber)} توسط مدیر تایید نهایی و برای زیرمجموعه‌ها قفل شد.`);
    } else {
      toast.info(`تاییدیه ترکیب تیم ایده #${toPersianDigits(currentTeam.ideaNumber)} توسط مدیر بازگشایی شد.`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Container */}
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 md:p-8 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#202A5A]">
              <Users className="w-4 h-4" />
              <span>گام چهارم: تشکیل تیم و انتخاب اعضاء</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              اعضای تیم ایده‌های منتخب رویداد
            </h2>
            <p className="text-xs md:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              صاحب ایده می‌تواند اعضای تیم خود را از لیست دیتابیس انتخاب کند. هر فرد فقط می‌تواند عضو ۱ تیم باشد. تایید نهایی توسط مدیر انجام می‌گیرد.
            </p>
          </div>


        </div>

        {isManager && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 text-xs font-black">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>پنل مدیر: امکان ویرایش اعضا و تایید نهایی برای شما فعال است</span>
          </div>
        )}
      </div>

      {/* Ideas Teams List Grid (ONLY FOR WINNING IDEAS FROM STEP 3) */}
      {winningIdeas.length === 0 ? (
        <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-white p-8 sm:p-12 text-center dark:border-zinc-700 dark:bg-zinc-900 space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
            در انتظار مشخص‌سازی ایده‌های برگزیده رویداد (گام سوم)
          </h3>
          <p className="text-xs md:text-sm font-bold text-zinc-500 max-w-md mx-auto leading-relaxed">
            بخش تشکیل تیم صرفاً برای ایده‌های منتخب پس از پایان نظرسنجی فعال می‌شود. پس از اتمام رای‌گیری و تعیین ایده‌های برتر توسط مدیر، ایده‌های برگزیده جهت تیم‌سازی در این بخش قرار خواهند گرفت.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {winningIdeas.map((idea) => {
            const team = getIdeaTeam(idea);
            const isLeader = !!currentUser && isOwnedByUser(idea.authorName, currentUser);
            const canEditTeam = isManager || (isLeader && !team.isApprovedByAdmin);

            return (
              <div
                key={idea.id}
                className={`rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] flex flex-col justify-between space-y-6 ${
                  team.isApprovedByAdmin ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Idea Number & Approval Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg border-2 border-zinc-900 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black text-xs shadow-[1px_1px_0px_0px_#202A5A]">
                        ایده #{toPersianDigits(idea.ideaNumber || 1)}
                      </span>
                      <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 truncate max-w-[220px]">
                        {idea.title}
                      </h3>
                    </div>

                    {/* Admin Approval Badge / Toggle */}
                    {team.isApprovedByAdmin ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border-2 border-emerald-600 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تایید نهایی مدیر</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>در انتظار تایید مدیر</span>
                      </span>
                    )}
                  </div>

                  {/* Leader Info */}
                  <div className="p-3 rounded-xl border-2 border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg border-2 border-zinc-900 bg-amber-400 text-zinc-950 flex items-center justify-center font-black">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-amber-900 dark:text-amber-300">
                          سرپرست / صاحب ایده:
                        </div>
                        <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                          {idea.authorName}
                        </div>
                      </div>
                    </div>

                    {isLeader && (
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-zinc-950 text-[10px] font-black border border-zinc-900">
                        شما سرپرست هستید
                      </span>
                    )}
                  </div>

                  {/* Team Members List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        <span>اعضای ثبت‌شده تیم ({toPersianDigits(team.members.length + 1)} نفر شامل سرپرست):</span>
                      </h4>

                      {canEditTeam && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setActiveIdeaIdForModal(idea.id);
                            setSelectedStudentId('');
                            setCustomStudentName('');
                          }}
                          className="gap-1 text-[11px] font-bold py-1 px-2.5"
                        >
                          <UserPlus className="w-3 h-3 text-indigo-600" />
                          <span>افزودن عضو جدید</span>
                        </Button>
                      )}
                    </div>

                    {team.members.length === 0 ? (
                      <div className="p-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs font-bold text-zinc-400">
                        هنوز عضوی به این تیم اضافه نشده است.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="p-3 rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-between shadow-[2px_2px_0px_0px_#202A5A]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg border border-zinc-900 bg-indigo-200 dark:bg-indigo-900 text-indigo-950 dark:text-indigo-100 flex items-center justify-center font-black text-xs">
                                {member.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                  {member.name}
                                </div>
                                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                  <span>نقش: {member.roleInTeam}</span>
                                </div>
                              </div>
                            </div>

                            {/* Remove button if permitted */}
                            {canEditTeam && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(idea.id, member.id, member.name)}
                                className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors"
                                title="حذف از ترکیب تیم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manager Final Approval Control */}
                {isManager && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-bold text-zinc-500">
                      کنترل ادمین: تایید ترکیب تیم
                    </div>
                    <Button
                      onClick={() => handleToggleAdminApproval(idea.id)}
                      variant={team.isApprovedByAdmin ? 'outline' : 'primary'}
                      className={`gap-2 text-xs font-black ${
                        team.isApprovedByAdmin ? 'text-rose-600 hover:bg-rose-50' : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                      }`}
                    >
                      {team.isApprovedByAdmin ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>لغو تایید نهایی مدیر</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تایید نهایی و قفل ترکیب تیم</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD MEMBER TO TEAM WITH SEARCH & REAL-TIME STATE */}
      {activeIdeaIdForModal && (() => {
        const targetIdea = ideas.find((i) => i.id === activeIdeaIdForModal);
        if (!targetIdea) return null;

        const currentTeam = getIdeaTeam(targetIdea);
        const filteredStudents = dbStudents.filter((std) => {
          const q = searchStudentQuery.trim().toLowerCase();
          if (!q) return true;
          return std.name.toLowerCase().includes(q);
        });

        return (
          <Modal
            isOpen={!!activeIdeaIdForModal}
            onClose={() => setActiveIdeaIdForModal(null)}
            title={`افزودن عضو جدید به تیم «${targetIdea.title}»`}
          >
            <div className="space-y-5">
              {/* Role & Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-800/60 shadow-[2px_2px_0px_0px_#202A5A]">
                <div>
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    <span>نقش عضو انتخابی:</span>
                  </label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                  >
                    <option value="عضو تیم / توسعه‌دهنده">عضو تیم / توسعه‌دهنده</option>
                    <option value="برنامه‌نویس و کدنویس">برنامه‌نویس و کدنویس</option>
                    <option value="طراح UI/UX و گرافیک">طراح UI/UX و گرافیک</option>
                    <option value="مدیر ارائه‌کننده (Pitcher)">مدیر ارائه‌کننده (Pitcher)</option>
                    <option value="مستندساز و محتوا">مستندساز و محتوا</option>
                    <option value="تسهیل‌گر و مشاور">تسهیل‌گر و مشاور</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    <span>جستجوی دانش‌آموز:</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="نام دانش‌آموز..."
                      value={searchStudentQuery}
                      onChange={(e) => setSearchStudentQuery(e.target.value)}
                      className="w-full pr-9 pl-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Students Cards List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-zinc-700 dark:text-zinc-300">
                  <span>لیست دانش‌آموزان دیتابیس مدرسه ({toPersianDigits(filteredStudents.length)} نفر):</span>
                  <span className="text-[11px] text-zinc-500 font-bold">
                    اعضای فعلی تیم: {toPersianDigits(currentTeam.members.length)} نفر
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-zinc-500 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
                      دانش‌آموزی با این مشخصات یافت نشد.
                    </div>
                  ) : (
                    filteredStudents.map((std) => {
                      const isMemberOfThisTeam = currentTeam.members.some(
                        (m) => m.id === std.id || m.name.toLowerCase() === std.name.toLowerCase()
                      );
                      const assignment = assignedStudentMap[std.id] || assignedStudentMap[std.name.toLowerCase()];
                      const isAssignedToOtherTeam = !!assignment && assignment.ideaId !== targetIdea.id;

                      return (
                        <div
                          key={std.id}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                            isMemberOfThisTeam
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 opacity-75'
                              : isAssignedToOtherTeam
                              ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/40 opacity-60'
                              : 'border-zinc-900 bg-white dark:bg-zinc-900 shadow-[2px_2px_0px_0px_#202A5A]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center font-black text-xs ${
                              isMemberOfThisTeam
                                ? 'border-emerald-700 bg-emerald-400 text-zinc-950'
                                : 'border-zinc-900 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {isMemberOfThisTeam ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>

                            <div>
                              <h5 className="text-xs font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <span>{std.name}</span>
                              </h5>
                              {isMemberOfThisTeam && (
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>قبلاً به این تیم اضافه شده است</span>
                                </p>
                              )}
                              {isAssignedToOtherTeam && (
                                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                  عضو تیم ایده #{toPersianDigits(assignment.ideaNumber)} ({assignment.ideaTitle})
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            {isMemberOfThisTeam ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-emerald-600 bg-emerald-200 text-emerald-900 text-xs font-black">
                                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>افزوده شد</span>
                              </span>
                            ) : isAssignedToOtherTeam ? (
                              <span className="px-3 py-1 rounded-lg border border-zinc-400 bg-zinc-200 text-zinc-600 text-xs font-bold">
                                غیرقابل انتخاب
                              </span>
                            ) : (
                              <Button
                                variant="primary"
                                onClick={() => handleAddMemberDirectly(targetIdea, std)}
                                className="text-xs font-black bg-emerald-400 text-zinc-950 px-3 py-1 inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>افزودن</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Manual Name Entry Section */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-xs font-black text-zinc-800 dark:text-zinc-200 mb-1.5">
                  افزودن دستی نام دانش‌آموز (در صورت عدم وجود در دیتابیس):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="مثلاً: علی رضایی"
                    value={customStudentName}
                    onChange={(e) => setCustomStudentName(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
                  />
                  <Button
                    variant="outline"
                    disabled={!customStudentName.trim()}
                    onClick={() => handleAddMember(targetIdea)}
                    className="text-xs font-black px-4"
                  >
                    + افزودن دستی
                  </Button>
                </div>
              </div>

              {/* Modal Action Footer */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500">
                  پس از انجام افزودن‌ها، دکمه بستن را بزنید.
                </span>
                <Button
                  variant="primary"
                  onClick={() => setActiveIdeaIdForModal(null)}
                  className="text-xs font-black px-6"
                >
                  تایید و بستن
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
