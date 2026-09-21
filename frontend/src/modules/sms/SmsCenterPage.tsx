import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  MessageSquare,
  Users,
  User,
  GraduationCap,
  Calendar,
  CreditCard,
  Cake,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  PhoneCall,
  Sliders,
  FileText,
  Search,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api/client';

export const SmsCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manual' | 'automation' | 'logs'>('manual');

  // Manual Send Form States
  const [targetType, setTargetType] = useState<'INDIVIDUAL' | 'ROLE' | 'CLASS' | 'DIRECT_PHONE'>('ROLE');
  const [targetRole, setTargetRole] = useState<'ALL' | 'PARENTS' | 'STUDENTS' | 'TEACHERS' | 'STAFF'>('PARENTS');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [classAudience, setClassAudience] = useState<'PARENTS' | 'STUDENTS' | 'BOTH'>('PARENTS');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [directPhone, setDirectPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');

  // Search in logs
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('');

  // 1. Fetch SMS Stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/stats');
      return res?.data || res;
    },
  });

  // 2. Fetch SMS Logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['sms-logs', logTypeFilter, logSearch],
    queryFn: async () => {
      const params: any = {};
      if (logTypeFilter) params.type = logTypeFilter;
      if (logSearch) params.search = logSearch;
      const res: any = await apiClient.get('/sms/logs', { params });
      return res?.data || res;
    },
  });

  // 3. Fetch SMS Templates
  const { data: templatesData, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/templates');
      return res?.data || res;
    },
  });

  // 4. Fetch Classrooms for Class Dropdown
  const { data: classroomsData } = useQuery({
    queryKey: ['sms-classrooms'],
    queryFn: async () => {
      const res: any = await apiClient.get('/classes');
      return res?.data?.classrooms || res?.classrooms || res?.data || [];
    },
  });

  // 5. Fetch Users for Individual selection
  const { data: usersData } = useQuery({
    queryKey: ['sms-users-search'],
    queryFn: async () => {
      const res: any = await apiClient.get('/members/users', { params: { limit: 100 } });
      return res?.data?.users || res?.users || res?.data || [];
    },
  });

  // Mutations
  const sendManualMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/sms/manual-send', payload);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'پیامک با موفقیت ارسال شد');
      setMessageText('');
      setDirectPhone('');
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ارسال پیامک');
    },
  });

  const triggerChequesMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/sms/trigger/cheques');
    },
    onSuccess: (res: any) => {
      const data = res?.data || res;
      toast.success(`بررسی چک‌ها انجام شد: ${data?.sentCount || 0} پیامک یادآوری ارسال گردید.`);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در پردازش چک‌ها');
    },
  });

  const triggerBirthdaysMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/sms/trigger/birthdays');
    },
    onSuccess: (res: any) => {
      const data = res?.data || res;
      toast.success(`بررسی تولدها انجام شد: ${data?.sentCount || 0} پیامک تبریک به متولدین امروز ارسال شد.`);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در پردازش تبریک تولد');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      return apiClient.post('/sms/templates', template);
    },
    onSuccess: () => {
      toast.success('تنظیمات الگو با موفقیت ذخیره شد');
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ذخیره الگو');
    },
  });

  // Helpers
  const charCount = messageText.length;
  const isFarsi = /[\u0600-\u06FF]/.test(messageText);
  const partSize = isFarsi ? 70 : 160;
  const partsCount = Math.max(1, Math.ceil(charCount / partSize));

  const handleSend = () => {
    if (!messageText.trim()) {
      toast.error('لطفاً متن پیامک را وارد نمایید');
      return;
    }

    const payload: any = {
      targetType,
      message: messageText.trim(),
    };

    if (targetType === 'ROLE') {
      payload.targetRole = targetRole;
    } else if (targetType === 'CLASS') {
      if (!selectedClassroomId) {
        toast.error('لطفاً یک کلاس انتخاب کنید');
        return;
      }
      payload.classroomId = selectedClassroomId;
      payload.classAudience = classAudience;
    } else if (targetType === 'INDIVIDUAL') {
      if (!targetUserId) {
        toast.error('لطفاً کاربر گیرنده را انتخاب کنید');
        return;
      }
      payload.targetUserId = targetUserId;
    } else if (targetType === 'DIRECT_PHONE') {
      if (!directPhone.trim()) {
        toast.error('لطفاً شماره تلفن گیرنده را وارد نمایید');
        return;
      }
      payload.directPhone = directPhone.trim();
    }

    sendManualMutation.mutate(payload);
  };

  const classrooms = Array.isArray(classroomsData) ? classroomsData : [];
  const usersList = Array.isArray(usersData) ? usersData : [];
  const logsList = Array.isArray(logsData?.logs) ? logsData.logs : [];
  const templates = Array.isArray(templatesData) ? templatesData : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 shadow-inner">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-100 to-white">
                  مرکز پیامک و اعلانات هوشمند رُکاد
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  ارسال دستی، اعلانات خودکار غیبت به والدین، یادآوری سررسید چک‌های صیادی و تبریک زادروز
                </p>
              </div>
            </div>
          </div>

          {/* Live Engine Status Badge */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                درگاه فعال:{' '}
                <strong className="text-emerald-400 uppercase font-mono">
                  {statsData?.activeProvider || 'SANDBOX'}
                </strong>
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <button
              onClick={() => {
                refetchStats();
                refetchLogs();
              }}
              className="p-1 text-slate-400 hover:text-white transition"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-400">کل پیامک‌های ثبت‌شده</div>
            <div className="text-xl font-bold text-white mt-1">
              {statsLoading ? '...' : (statsData?.total || 0).toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-emerald-500/20">
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ارسال موفق
            </div>
            <div className="text-xl font-bold text-emerald-300 mt-1">
              {statsLoading ? '...' : (statsData?.sent || 0).toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-blue-500/20">
            <div className="text-xs text-blue-400">پیامک خودکار غیبت</div>
            <div className="text-xl font-bold text-blue-300 mt-1">
              {statsLoading ? '...' : (statsData?.breakdown?.autoAbsence || 0).toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-amber-500/20">
            <div className="text-xs text-amber-400">پیامک سررسید چک‌ها</div>
            <div className="text-xl font-bold text-amber-300 mt-1">
              {statsLoading ? '...' : (statsData?.breakdown?.autoChequeDue || 0).toLocaleString('fa-IR')}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 pb-1">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'manual'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          ارسال دستی پیامک (فرد، گروه، کلاس)
        </button>
        <button
          onClick={() => setActiveTab('automation')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'automation'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          اتوماسیون‌ها و الگوهای خودکار
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          تاریخچه و گزارش تحویل
        </button>
      </div>

      {/* TAB 1: MANUAL SMS */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Selection Column */}
          <div className="lg:col-span-1 space-y-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              ۱. انتخاب مخاطبان هدف
            </h2>

            {/* Target Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('ROLE')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  targetType === 'ROLE'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Users className="w-4 h-4" /> گروهی / نقشی
              </button>
              <button
                type="button"
                onClick={() => setTargetType('CLASS')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  targetType === 'CLASS'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <GraduationCap className="w-4 h-4" /> کلاسی
              </button>
              <button
                type="button"
                onClick={() => setTargetType('INDIVIDUAL')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  targetType === 'INDIVIDUAL'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <User className="w-4 h-4" /> فردی (سامانه)
              </button>
              <button
                type="button"
                onClick={() => setTargetType('DIRECT_PHONE')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  targetType === 'DIRECT_PHONE'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <PhoneCall className="w-4 h-4" /> شماره مستقیم
              </button>
            </div>

            {/* Target Options details */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              {targetType === 'ROLE' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    انتخاب گروه کاربری:
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e: any) => setTargetRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="PARENTS">کل اولیای محترم دانش‌آموزان</option>
                    <option value="STUDENTS">کل دانش‌آموزان فعال</option>
                    <option value="TEACHERS">کل معلمان و دبیران</option>
                    <option value="STAFF">کل کادر دفتری و پرسنل</option>
                    <option value="ALL">همه کاربران مدرسه (همگانی)</option>
                  </select>
                </div>
              )}

              {targetType === 'CLASS' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                      انتخاب کلاس درسی:
                    </label>
                    <select
                      value={selectedClassroomId}
                      onChange={(e) => setSelectedClassroomId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- یک کلاس انتخاب کنید --</option>
                      {classrooms.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name || `کلاس ${c.code || c.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                      گیرندگان پیامک در این کلاس:
                    </label>
                    <select
                      value={classAudience}
                      onChange={(e: any) => setClassAudience(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="PARENTS">فقط اولیای دانش‌آموزان کلاس</option>
                      <option value="STUDENTS">فقط خود دانش‌آموزان کلاس</option>
                      <option value="BOTH">هم دانش‌آموزان و هم اولیاء</option>
                    </select>
                  </div>
                </div>
              )}

              {targetType === 'INDIVIDUAL' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    انتخاب کاربر گیرنده:
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- یک کاربر انتخاب کنید --</option>
                    {usersList.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role}) - {u.phone || 'فاقد شماره'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'DIRECT_PHONE' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    شماره تلفن مستقیم همراه (مثال: ۰۹۱۲۳۴۵۶۷۸۹):
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="09120000000"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Message Content Column */}
          <div className="lg:col-span-2 space-y-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  ۲. متن پیامک ارسالی
                </h2>
                <div className="text-xs text-slate-400 font-mono">
                  <span>{charCount} کاراکتر</span> |{' '}
                  <span className="text-blue-400 font-bold">{partsCount} صفحه SMS</span>
                </div>
              </div>

              <textarea
                rows={7}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="متن پیامک خود را در اینجا بنویسید... (مثال: با سلام و احترام؛ جلسه اولیاء و مربیان فردا ساعت ۱۶ در سالن اجتماعات برگزار می‌گردد.)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
              />

              {/* Quick Template Fillers */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">متون آماده:</span>
                <button
                  type="button"
                  onClick={() =>
                    setMessageText(
                      'با سلام و احترام؛ پیرو تصمیم شورای مدرسه، کلاس‌های فردا به صورت آنلاین برگزار خواهد شد.\nمدرسه رُکاد',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                >
                  کلاس‌های آنلاین
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMessageText(
                      'ولی محترم؛ کارنامه نیم‌سال اول فرزند شما در پنل هوشمند رُکاد ثبت و قابل مشاهده است.\nمدرسه رُکاد',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                >
                  انتشار کارنامه
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMessageText(
                      'با سلام؛ جلسه عمومی اولیاء و مربیان روز چهارشنبه ساعت ۱۵ در سالن همایش‌های مدرسه برگزار می‌گردد.\nحضور شما مایه افتخار است.',
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                >
                  دعوت به جلسه
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                درگاه ارسال:{' '}
                <span className="text-slate-200 font-semibold">{statsData?.activeProvider || 'SANDBOX'}</span>
              </div>
              <button
                type="button"
                disabled={sendManualMutation.isPending}
                onClick={handleSend}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
              >
                {sendManualMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                تأیید و ارسال پیامک
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATION & TEMPLATES */}
      {activeTab === 'automation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Absence Automation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-blue-400 font-bold">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <span>پیامک خودکار غیبت به اولیاء</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                فعال در سیستم
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              با ثبت غیبت یا تأخیر دانش‌آموز توسط معلم یا ناظم در پنل حضور و غیاب، پیامک به صورت آنی به شماره والدین ارسال می‌شود.
            </p>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300 space-y-1">
              <div className="text-slate-500 text-[11px]">متغیرهای الگو:</div>
              <div>{`{نام_دانش‌آموز}`} | {`{تاریخ}`} | {`{زنگ}`} | {`{وضعیت}`}</div>
            </div>
            <button
              onClick={() => {
                toast.info('این اتوماسیون با ثبت حضور و غیاب در ماژول Attendance شلیک می‌شود.');
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition"
            >
              مشاهده وضعیت رویداد حضور و غیاب
            </button>
          </div>

          {/* Card 2: Cheque Due Automation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span>یادآوری سررسید چک‌ها</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                زمان‌بندی روزانه
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              هر روز در ساعت مشخص، چک‌های صیادی وضعیت در انتظار بررسی شده و در فواصل ۳ روز قبل، ۱ روز قبل و روز موعد به صادرکننده پیامک ارسال می‌شود.
            </p>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300 space-y-1">
              <div className="text-slate-500 text-[11px]">متغیرهای الگو:</div>
              <div>{`{نام}`} | {`{مبلغ}`} | {`{تاریخ_سررسید}`} | {`{چک}`}</div>
            </div>
            <button
              disabled={triggerChequesMutation.isPending}
              onClick={() => triggerChequesMutation.mutate()}
              className="w-full flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {triggerChequesMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              بررسی و ارسال پیامک چک‌های امروز
            </button>
          </div>

          {/* Card 3: Birthday Automation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-pink-400 font-bold">
                <div className="p-2 bg-pink-500/10 rounded-lg">
                  <Cake className="w-5 h-5" />
                </div>
                <span>پیامک تبریک زادروز</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                تقویم شمسی/میلادی
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              سیستم به صورت خودکار تاریخ تولد دانش‌آموزان، معلمان و پرسنل را بررسی کرده و پیام تبریک صمیمانه ارسال می‌نماید.
            </p>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300 space-y-1">
              <div className="text-slate-500 text-[11px]">متغیرهای الگو:</div>
              <div>{`{نام}`} | {`{مدرسه}`} | تبریک گرم رُکاد</div>
            </div>
            <button
              disabled={triggerBirthdaysMutation.isPending}
              onClick={() => triggerBirthdaysMutation.mutate()}
              className="w-full flex items-center justify-center gap-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {triggerBirthdaysMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cake className="w-3.5 h-3.5" />
              )}
              بررسی و ارسال تبریک به متولدین امروز
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: LOGS & HISTORY */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              گزارش پیامک‌های ارسالی سامانه
            </h2>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="جستجوی شماره یا نام..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">همه انواع پیامک</option>
                <option value="AUTO_ABSENCE">خودکار غیبت</option>
                <option value="AUTO_CHEQUE_DUE">سررسید چک</option>
                <option value="AUTO_BIRTHDAY">تبریک تولد</option>
                <option value="MANUAL_ROLE">دستی گروهی</option>
                <option value="MANUAL_CLASS">دستی کلاسی</option>
                <option value="MANUAL_INDIVIDUAL">دستی فردی</option>
              </select>

              <button
                onClick={() => refetchLogs()}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">گیرنده / شماره</th>
                  <th className="p-3">نوع ارسال</th>
                  <th className="p-3">متن پیامک</th>
                  <th className="p-3">درگاه</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3">زمان ارسال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      در حال بارگذاری تاریخچه پیامک‌ها...
                    </td>
                  </tr>
                ) : logsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      هیچ رکوردی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  logsList.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-medium text-white">
                        <div>{log.recipientName || 'کاربر'}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {log.recipientPhone}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {log.type === 'AUTO_ABSENCE'
                            ? 'غیبت خودکار'
                            : log.type === 'AUTO_CHEQUE_DUE'
                              ? 'سررسید چک'
                              : log.type === 'AUTO_BIRTHDAY'
                                ? 'تبریک تولد'
                                : 'ارسال دستی'}
                        </span>
                      </td>
                      <td className="p-3 max-w-md truncate text-slate-200" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {log.provider}
                      </td>
                      <td className="p-3">
                        {log.status === 'SENT' || log.status === 'DELIVERED' ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5" /> ارسال شد
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 font-medium" title={log.errorMessage}>
                            <AlertCircle className="w-3.5 h-3.5" /> ناموفق
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400" dir="ltr">
                        {new Date(log.sentAt || log.createdAt).toLocaleDateString('fa-IR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
