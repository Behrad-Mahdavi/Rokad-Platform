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
  Zap,
  KeyRound,
  Radio,
  ExternalLink,
  Save,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  Plus,
  Trash2,
  Edit3,
  Bookmark,
  Tag,
  ShieldCheck,
  Lock,
  Filter,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api/client';

export const SmsCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manual' | 'automation' | 'logs' | 'gateways'>('manual');

  // Manual Send Form States
  const [targetType, setTargetType] = useState<'INDIVIDUAL' | 'ROLE' | 'CLASS' | 'DIRECT_PHONE'>('ROLE');
  const [targetRole, setTargetRole] = useState<'ALL' | 'PARENTS' | 'STUDENTS' | 'TEACHERS' | 'STAFF'>('PARENTS');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [classAudience, setClassAudience] = useState<'PARENTS' | 'STUDENTS' | 'BOTH'>('PARENTS');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'MANAGEMENT' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF'>('ALL');
  const [directPhone, setDirectPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');

  // Gateways Config Form State (Amoot / Kavenegar)
  const [amootToken, setAmootToken] = useState<string>('');
  const [amootLine, setAmootLine] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<'AMOOT' | 'KAVENEGAR' | 'SANDBOX'>('AMOOT');
  const [showAmootToken, setShowAmootToken] = useState<boolean>(false);

  // Search & Filter in logs
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('');

  // Quick Template Management Form State (in Gateways Tab)
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>('');
  const [newTemplateContent, setNewTemplateContent] = useState<string>('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<string>('GENERAL');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // 0. Fetch Gateway Config
  const { data: gatewayConfigData, refetch: refetchGatewayConfig } = useQuery({
    queryKey: ['sms-gateway-config'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/config');
      return res?.data || res;
    },
  });

  // Sync state when config is fetched
  React.useEffect(() => {
    if (gatewayConfigData) {
      if (gatewayConfigData.provider) {
        setSelectedProvider(gatewayConfigData.provider);
      }
      if (gatewayConfigData.amoot?.apiKey) {
        setAmootToken(gatewayConfigData.amoot.apiKey);
      }
      if (gatewayConfigData.amoot?.senderLine) {
        setAmootLine(gatewayConfigData.amoot.senderLine);
      }
    }
  }, [gatewayConfigData]);

  // Update Gateway Config Mutation
  const updateGatewayConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/sms/config', payload);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'تنظیمات درگاه با موفقیت ذخیره و فعال شد');
      queryClient.invalidateQueries({ queryKey: ['sms-gateway-config'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ذخیره تنظیمات درگاه');
    },
  });

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
      const res: any = await apiClient.get('/classes/classrooms');
      return res?.data?.classrooms || res?.classrooms || res?.data || [];
    },
  });

  // 5. Fetch Users for Individual selection (School Directory)
  const { data: usersData } = useQuery({
    queryKey: ['sms-users-search'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/recipients');
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.users)) return res.data.users;
      if (Array.isArray(res?.users)) return res.users;
      if (Array.isArray(res)) return res;
      return [];
    },
  });

  // 6. Fetch Quick Templates (الگوهای سریع)
  const { data: quickTemplatesData, isLoading: quickTemplatesLoading } = useQuery({
    queryKey: ['sms-quick-templates'],
    queryFn: async () => {
      const res: any = await apiClient.get('/sms/quick-templates');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Quick Template Mutations
  const createQuickTemplateMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; category?: string }) => {
      return apiClient.post('/sms/quick-templates', payload);
    },
    onSuccess: () => {
      toast.success('الگوی سریع جدید با موفقیت اضافه شد');
      setNewTemplateTitle('');
      setNewTemplateContent('');
      setNewTemplateCategory('GENERAL');
      queryClient.invalidateQueries({ queryKey: ['sms-quick-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ثبت الگوی سریع');
    },
  });

  const updateQuickTemplateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return apiClient.patch(`/sms/quick-templates/${id}`, payload);
    },
    onSuccess: () => {
      toast.success('الگوی سریع با موفقیت به‌روزرسانی شد');
      setEditingTemplateId(null);
      setNewTemplateTitle('');
      setNewTemplateContent('');
      setNewTemplateCategory('GENERAL');
      queryClient.invalidateQueries({ queryKey: ['sms-quick-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در ویرایش الگوی سریع');
    },
  });

  const deleteQuickTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/sms/quick-templates/${id}`);
    },
    onSuccess: () => {
      toast.success('الگوی سریع حذف شد');
      queryClient.invalidateQueries({ queryKey: ['sms-quick-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'خطا در حذف الگو');
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
      if (selectedUserIds.length === 0) {
        toast.error('لطفاً حداقل یک یا چند کاربر گیرنده را انتخاب کنید');
        return;
      }
      payload.targetUserIds = selectedUserIds;
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
  const quickTemplates: any[] = Array.isArray(quickTemplatesData) ? quickTemplatesData : [];

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* 1. Header Banner & Identity with Modern Neo-Brutalism */}
      <div className="rokad-card p-6 sm:p-8 bg-white dark:bg-[#151C28] border-2 border-primary/40 shadow-[4px_4px_0_#202A5A] dark:shadow-[4px_4px_0_#59BBAF]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-ecosystem-light dark:bg-ecosystem-darker/60 border-2 border-primary/40 flex items-center justify-center text-primary shadow-[2px_2px_0_#59BBAF] shrink-0">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-sec dark:text-white">
                  سامانه مدیریت و ارسال پیامک هوشمند رکاد
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-ecosystem-light dark:bg-ecosystem-darker/50 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30">
                  <Zap className="w-3 h-3 text-primary" /> نسـل ۳
                </span>
              </div>
              <p className="text-xs sm:text-sm text-ink-normal/70 dark:text-gray-400 mt-1 font-medium">
                ارسال انبوه و گروهی، تبریک خودکار زادروز، سررسید چک‌های صیادی و اطلاع‌رسانی غیبت به اولیاء با درگاه آموت پیامک
              </p>
            </div>
          </div>

          {/* Active Gateway & Live Amoot Balance Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Balance Card */}
            <div className="flex items-center gap-3 bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-2xl p-2.5 px-4 shadow-[2px_2px_0_#59BBAF]">
              <div className="p-2 rounded-xl bg-[#59BBAF]/15 text-[#1F413D] dark:text-[#59BBAF] shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-ink-normal/60 dark:text-gray-400 block">مانده اعتبار آموت:</span>
                <div className="text-sm sm:text-base font-black text-sec dark:text-white font-mono">
                  {gatewayConfigData?.liveAccount?.remaindCreditTomans !== undefined
                    ? `${(gatewayConfigData.liveAccount.remaindCreditTomans).toLocaleString('fa-IR')} تومان`
                    : gatewayConfigData?.liveAccount?.remaindCredit !== undefined
                    ? `${(gatewayConfigData.liveAccount.remaindCredit).toLocaleString('fa-IR')} ریال`
                    : '۹۵,۶۸۸ تومان'}
                </div>
              </div>
            </div>

            {/* Gateway Status Badge */}
            <div className="flex items-center gap-3 bg-[#F8F9FA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 rounded-2xl p-3 px-4 shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                <div className="text-xs">
                  <span className="text-ink-normal/60 dark:text-gray-400 block font-medium">درگاه پیامک:</span>
                  <span className="font-black text-sec dark:text-white font-mono uppercase">
                    {gatewayConfigData?.liveAccount?.accountName ? `${gatewayConfigData.liveAccount.accountName} (آموت)` : 'AMOOT SMS'}
                  </span>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <button
                onClick={() => {
                  refetchStats();
                  refetchLogs();
                  refetchGatewayConfig();
                  toast.success('اعتبار و اطلاعات درگاه به‌روزرسانی شد');
                }}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-ink-normal/80 dark:text-gray-300 transition cursor-pointer"
                title="بروزرسانی موجودی و وضعیت"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stat Cards Grid (5-Persona Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {/* Card 1: Ecosystem (Total) */}
          <div className="rokad-card p-4 bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 shadow-[2.5px_2.5px_0_#59BBAF]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-normal/70 dark:text-gray-300">کل پیامک‌های ثبت‌شده</span>
              <span className="p-1.5 rounded-lg bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-sec dark:text-white mt-2 font-mono">
              {statsLoading ? '...' : (statsData?.total || 0).toLocaleString('fa-IR')}
            </div>
          </div>

          {/* Card 2: Primary (Sent) */}
          <div className="rokad-card p-4 bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 shadow-[2.5px_2.5px_0_#009966]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-normal/70 dark:text-gray-300">ارسال‌های موفق</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              {statsLoading ? '...' : (statsData?.sent || 0).toLocaleString('fa-IR')}
            </div>
          </div>

          {/* Card 3: College (Absence) */}
          <div className="rokad-card p-4 bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 shadow-[2.5px_2.5px_0_#F8A41D]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-normal/70 dark:text-gray-300">پیامک خودکار غیبت</span>
              <span className="p-1.5 rounded-lg bg-college-light dark:bg-college-darker/60 text-college-normal">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-college-normal mt-2 font-mono">
              {statsLoading ? '...' : (statsData?.breakdown?.autoAbsence || 0).toLocaleString('fa-IR')}
            </div>
          </div>

          {/* Card 4: Female / Warning (Cheques) */}
          <div className="rokad-card p-4 bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 shadow-[2.5px_2.5px_0_#E0195B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-normal/70 dark:text-gray-300">سررسید چک و یادآوری</span>
              <span className="p-1.5 rounded-lg bg-female-light dark:bg-female-darker/60 text-female-normal">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-female-normal mt-2 font-mono">
              {statsLoading ? '...' : (statsData?.breakdown?.autoChequeDue || 0).toLocaleString('fa-IR')}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs (Refined Hard Shadow Segmented Buttons) */}
      <div className="flex flex-wrap gap-2 sm:gap-3 p-1.5 bg-[#F1F3F5] dark:bg-[#151C28] rounded-2xl border border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'manual'
              ? 'bg-[#59BBAF] text-white border border-[#438C83] shadow-[2.5px_2.5px_0_#1F413D]'
              : 'text-ink-normal/70 dark:text-gray-400 hover:text-sec dark:hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>ارسال دستی پیامک</span>
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'automation'
              ? 'bg-[#202A5A] text-white border border-[#182044] shadow-[2.5px_2.5px_0_#0B0F1F]'
              : 'text-ink-normal/70 dark:text-gray-400 hover:text-sec dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>اتوماسیون‌ها و سناریوها</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'logs'
              ? 'bg-[#202A5A] text-white border border-[#182044] shadow-[2.5px_2.5px_0_#0B0F1F]'
              : 'text-ink-normal/70 dark:text-gray-400 hover:text-sec dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>تاریخچه و لاگ ارسال‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'gateways'
              ? 'bg-[#652D90] text-white border border-[#4E2270] shadow-[2.5px_2.5px_0_#231032]'
              : 'text-ink-normal/70 dark:text-gray-400 hover:text-sec dark:hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>پیکربندی درگاه آموت (API)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANUAL SMS DISPATCH (Matched to Porskad with Rokad Design Standards) */}
      {/* ========================================================================= */}
      {activeTab === 'manual' && (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
          <div className="rokad-card bg-white dark:bg-[#151C28] border-2 border-gray-200 dark:border-gray-800 shadow-[4px_4px_0_#202A5A] dark:shadow-[4px_4px_0_#59BBAF]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-5 sm:p-7 flex flex-col gap-5"
            >
              {/* Header inside Card */}
              <div className="flex flex-wrap items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 gap-3">
                <h2 className="text-base sm:text-lg font-black text-sec dark:text-white flex items-center gap-2.5">
                  <Send className="w-5 h-5 text-primary" />
                  <span>ارسال پیامک با درگاه آموت (Amoot SMS)</span>
                </h2>
                <div className="text-xs font-bold text-ink-normal/70 dark:text-gray-400 flex items-center gap-2">
                  <span>خط فرستنده:</span>
                  <span className="text-primary font-mono bg-ecosystem-light dark:bg-ecosystem-darker px-2.5 py-1 rounded-lg border border-primary/30">
                    {gatewayConfigData?.amoot?.senderLine || amootLine || '+98'}
                  </span>
                </div>
              </div>

              {/* ۱. انتخاب شیوه تعیین گیرندگان (بخش نوع مخاطبان) */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <span>۱. انتخاب منبع و نوع گیرندگان:</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTargetType('DIRECT_PHONE')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                      targetType === 'DIRECT_PHONE'
                        ? 'bg-ecosystem-light dark:bg-ecosystem-darker/60 border-primary text-ecosystem-darker dark:text-ecosystem-light shadow-[2.5px_2.5px_0_#59BBAF]'
                        : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-300 hover:border-primary/40'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>شماره‌های مستقیم</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('INDIVIDUAL')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                      targetType === 'INDIVIDUAL'
                        ? 'bg-ecosystem-light dark:bg-ecosystem-darker/60 border-primary text-ecosystem-darker dark:text-ecosystem-light shadow-[2.5px_2.5px_0_#59BBAF]'
                        : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-300 hover:border-primary/40'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>انتخاب فردی (چندکاربر)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('ROLE')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                      targetType === 'ROLE'
                        ? 'bg-ecosystem-light dark:bg-ecosystem-darker/60 border-primary text-ecosystem-darker dark:text-ecosystem-light shadow-[2.5px_2.5px_0_#59BBAF]'
                        : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-300 hover:border-primary/40'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>گروهی / نقش</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('CLASS')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                      targetType === 'CLASS'
                        ? 'bg-ecosystem-light dark:bg-ecosystem-darker/60 border-primary text-ecosystem-darker dark:text-ecosystem-light shadow-[2.5px_2.5px_0_#59BBAF]'
                        : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-300 hover:border-primary/40'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>کلاس درسی</span>
                  </button>
                </div>
              </div>

              {/* ورودی گیرندگان با استایل پرس‌کاد */}
              <div className="space-y-3">
                {targetType === 'DIRECT_PHONE' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                        شماره‌های موبایل گیرندگان (با اینتر یا کاما جدا کنید):
                      </label>
                      {(() => {
                        const count = directPhone
                          .split(/[\r\n,;\s]+/)
                          .map((p) => p.trim())
                          .filter((p) => p.length >= 8).length;
                        return count > 0 ? (
                          <span className="text-xs font-extrabold text-primary font-mono">
                            {count.toLocaleString('fa-IR')} شماره وارد شده
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <textarea
                      value={directPhone}
                      onChange={(e) => setDirectPhone(e.target.value)}
                      rows={3}
                      dir="ltr"
                      placeholder={'09123456789\n09351112233\n09198887766'}
                      className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono text-sec dark:text-white placeholder:text-gray-400 focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all leading-relaxed resize-none"
                    />
                    <p className="text-[11px] font-semibold text-ink-normal/60 dark:text-gray-400">
                      شماره‌ها به صورت خودکار نرمال‌سازی شده و ارقام فارسی یا پیش‌شماره‌های ۹۸+ اصلاح می‌شوند.
                    </p>
                  </div>
                )}

                {targetType === 'INDIVIDUAL' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        <span>انتخاب افراد گیرنده پیامک (با تفکیک دپارتمان و نقش):</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {selectedUserIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds([])}
                            className="text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                          >
                            پاک کردن همه
                          </button>
                        )}
                        <span className="text-xs font-extrabold text-primary font-mono bg-ecosystem-light dark:bg-ecosystem-darker/60 px-2.5 py-0.5 rounded-lg border border-primary/30">
                          {selectedUserIds.length > 0 ? `${selectedUserIds.length.toLocaleString('fa-IR')} نفر انتخاب شده` : 'هیچ کاربری انتخاب نشده'}
                        </span>
                      </div>
                    </div>

                    {/* Role Filter Tabs (دپارتمان‌ها و نقش‌ها) */}
                    <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/70 dark:bg-[#111722] rounded-xl border border-gray-200 dark:border-gray-700">
                      {[
                        { key: 'ALL', label: 'همه افراد', count: usersList.length },
                        {
                          key: 'MANAGEMENT',
                          label: 'مدیریت و کادر اجرایی',
                          count: usersList.filter((u: any) => ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(u.role)).length,
                        },
                        {
                          key: 'STUDENTS',
                          label: 'دانش‌آموزان',
                          count: usersList.filter((u: any) => u.role === 'STUDENT').length,
                        },
                        {
                          key: 'PARENTS',
                          label: 'اولیاء',
                          count: usersList.filter((u: any) => u.role === 'PARENT').length,
                        },
                        {
                          key: 'TEACHERS',
                          label: 'دبیران و اساتید',
                          count: usersList.filter((u: any) => ['TEACHER', 'COACH'].includes(u.role)).length,
                        },
                      ].map((tab) => {
                        const isActive = userRoleFilter === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setUserRoleFilter(tab.key as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-white dark:bg-[#1C2536] text-sec dark:text-white shadow-[1.5px_1.5px_0_#59BBAF] border border-gray-200 dark:border-gray-700'
                                : 'text-ink-normal/60 dark:text-gray-400 hover:text-sec dark:hover:text-white'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                isActive
                                  ? 'bg-ecosystem-light dark:bg-ecosystem-darker text-primary font-bold'
                                  : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                              }`}
                            >
                              {tab.count.toLocaleString('fa-IR')}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="جستجوی نام، کدملی، نقش یا شماره موبایل در دسته انتخابی..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white focus:border-primary focus:outline-none"
                      />
                    </div>

                    {selectedUserIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-[#111722] rounded-xl border border-gray-200 dark:border-gray-700">
                        {selectedUserIds.map((uid) => {
                          const u = usersList.find((usr: any) => usr.id === uid);
                          const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'کاربر' : uid;
                          const roleLabel =
                            u?.role === 'SUPER_ADMIN'
                              ? 'مدیر ارشد'
                              : u?.role === 'SCHOOL_ADMIN'
                                ? 'مدیر مدرسه'
                                : u?.role === 'TEACHER'
                                  ? 'دبیر'
                                  : u?.role === 'STUDENT'
                                    ? 'دانش‌آموز'
                                    : u?.role === 'PARENT'
                                      ? 'ولی'
                                      : u?.role === 'STAFF'
                                        ? 'کادر اجرایی'
                                        : u?.role || '';
                          return (
                            <span
                              key={uid}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#59BBAF]/15 text-[#1F413D] dark:text-[#59BBAF] border border-[#59BBAF]/40"
                            >
                              <span>{name}</span>
                              {roleLabel && <span className="text-[10px] opacity-75 font-normal">({roleLabel})</span>}
                              <button
                                type="button"
                                onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== uid))}
                                className="hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-[#FAFAFA] dark:bg-[#1C2536]">
                      {usersList
                        .filter((u: any) => {
                          // 1. Role Filter
                          if (userRoleFilter === 'MANAGEMENT') {
                            if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'].includes(u.role)) return false;
                          } else if (userRoleFilter === 'STUDENTS') {
                            if (u.role !== 'STUDENT') return false;
                          } else if (userRoleFilter === 'PARENTS') {
                            if (u.role !== 'PARENT') return false;
                          } else if (userRoleFilter === 'TEACHERS') {
                            if (!['TEACHER', 'COACH'].includes(u.role)) return false;
                          }

                          // 2. Search Query
                          if (!userSearchQuery) return true;
                          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
                          const phone = (u.phone || '').toLowerCase();
                          const query = userSearchQuery.toLowerCase();
                          return fullName.includes(query) || phone.includes(query) || (u.nationalCode && u.nationalCode.includes(query));
                        })
                        .map((u: any) => {
                          const isSelected = selectedUserIds.includes(u.id);
                          const hasPhone = Boolean(u.phone);
                          const roleLabel =
                            u.role === 'SUPER_ADMIN'
                              ? 'مدیر ارشد'
                              : u.role === 'SCHOOL_ADMIN'
                                ? 'مدیر مدرسه'
                                : u.role === 'TEACHER'
                                  ? 'دبیر'
                                  : u.role === 'STUDENT'
                                    ? 'دانش‌آموز'
                                    : u.role === 'PARENT'
                                      ? 'ولی'
                                      : u.role === 'STAFF'
                                        ? 'کادر اجرایی'
                                        : u.role === 'COACH'
                                          ? 'مشاور / مربی'
                                          : u.role;

                          const roleBadgeClass =
                            u.role === 'SUPER_ADMIN' || u.role === 'SCHOOL_ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                              : u.role === 'STUDENT'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                : u.role === 'PARENT'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                  : u.role === 'TEACHER' || u.role === 'COACH'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

                          return (
                            <div
                              key={u.id}
                              onClick={() => {
                                if (!hasPhone) return;
                                setSelectedUserIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                                );
                              }}
                              className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                                !hasPhone ? 'opacity-40 cursor-not-allowed bg-gray-100/50 dark:bg-gray-800/30' : ''
                              } ${
                                isSelected
                                  ? 'bg-[#59BBAF]/10 font-bold text-sec dark:text-white'
                                  : 'hover:bg-gray-100/70 dark:hover:bg-gray-800/50 text-ink-normal/80 dark:text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!hasPhone}
                                  readOnly
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">
                                      {u.firstName} {u.lastName}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${roleBadgeClass}`}>
                                      {roleLabel}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-[11px] dir-ltr text-gray-500 dark:text-gray-400 font-bold">
                                {u.phone || 'فاقد شماره تماس'}
                              </span>
                            </div>
                          );
                        })}
                      {usersList.length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-400">هیچ کاربری یافت نشد</div>
                      )}
                    </div>
                  </div>
                )}

                {targetType === 'ROLE' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                      انتخاب گروه کاربری مدرسه:
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e: any) => setTargetRole(e.target.value)}
                      className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white focus:border-primary focus:outline-none transition-all"
                    >
                      <option value="PARENTS">کل اولیای محترم دانش‌آموزان</option>
                      <option value="STUDENTS">کل دانش‌آموزان مدرسه</option>
                      <option value="TEACHERS">کل اساتید و معلمان</option>
                      <option value="STAFF">کل کادر دفتری و اجرایی</option>
                      <option value="ALL">همه کاربران مدرسه (عمومی)</option>
                    </select>
                  </div>
                )}

                {targetType === 'CLASS' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                        انتخاب کلاس درسی:
                      </label>
                      <select
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                        className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white focus:border-primary focus:outline-none transition-all"
                      >
                        <option value="">-- یک کلاس انتخاب کنید --</option>
                        {classrooms.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name || `کلاس ${c.code || c.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                        گیرندگان در این کلاس:
                      </label>
                      <select
                        value={classAudience}
                        onChange={(e: any) => setClassAudience(e.target.value)}
                        className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white focus:border-primary focus:outline-none transition-all"
                      >
                        <option value="PARENTS">فقط اولیای دانش‌آموزان کلاس</option>
                        <option value="STUDENTS">فقط خود دانش‌آموزان کلاس</option>
                        <option value="BOTH">هم دانش‌آموزان و هم اولیاء</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* ۲. متن پیامک با شمارنده کاراکتر و صفحه مانند پرس‌کاد */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                    متن پیامک:
                  </label>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-ink-normal/70 dark:text-gray-400">
                      زبان: <strong className="text-sec dark:text-white">{isFarsi ? 'فارسی' : 'لاتین'}</strong>
                    </span>
                    <span className="text-ink-normal/70 dark:text-gray-400">
                      کاراکتر: <strong className="text-primary font-mono">{charCount.toLocaleString('fa-IR')}</strong>
                    </span>
                    <span className="bg-[#59BBAF]/15 text-[#1F413D] dark:text-[#59BBAF] px-2 py-0.5 rounded-lg font-bold border border-[#59BBAF]/30">
                      تعداد صفحه: {partsCount.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="متن پیامک اطلاع‌رسانی خود را اینجا بنویسید..."
                  className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm leading-relaxed text-sec dark:text-white placeholder:text-gray-400 focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all resize-none"
                />

                {/* Quick Template Fillers */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-normal/60 dark:text-gray-400 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-primary" />
                      <span>الگوهای آماده سریع (Quick Templates):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('gateways')}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + مدیریت و تعریف الگو
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickTemplates.map((t: any) => (
                      <button
                        key={t.id || t.title}
                        type="button"
                        onClick={() => setMessageText(t.content)}
                        className="rokad-btn-outline px-3 py-1 text-xs hover:border-primary hover:text-primary transition flex items-center gap-1"
                        title={t.content}
                      >
                        <Tag className="w-3 h-3 opacity-60" />
                        <span>{t.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ۳. انتخاب خط ارسال و امضا با ساختار پرس‌کاد */}
              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                    شماره خط فرستنده:
                  </label>
                  <input
                    type="text"
                    disabled
                    value={gatewayConfigData?.amoot?.senderLine || amootLine || '+98'}
                    className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white font-mono opacity-80"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                    نام امضا / فرستنده:
                  </label>
                  <input
                    type="text"
                    disabled
                    value="مدرسه رکاد"
                    className="w-full bg-[#FAFAFA] dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-sec dark:text-white opacity-80"
                  />
                </div>
              </div>

              {/* ۴. دکمه تایید و ارسال نهایی */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="text-xs text-ink-normal/60 dark:text-gray-400 font-semibold">
                  هزینه نهایی از اعتبار حساب کاربری شما در سامانه آموت کسر می‌شود.
                </div>
                <button
                  type="submit"
                  disabled={sendManualMutation.isPending || !messageText.trim()}
                  className="rokad-btn-primary px-7 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[2.5px_2.5px_0_#1F413D]"
                >
                  {sendManualMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{sendManualMutation.isPending ? 'در حال ارسال...' : 'ارسال پیامک'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTOMATION & SCENARIOS */}
      {/* ========================================================================= */}
      {activeTab === 'automation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Absence Automation */}
          <div className="rokad-card p-6 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#59BBAF] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-primary font-black text-sm">
                <div className="p-2 bg-ecosystem-light dark:bg-ecosystem-darker/50 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <span>پیامک خودکار غیبت به اولیاء</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-ecosystem-light dark:bg-ecosystem-darker/40 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30">
                <CheckCircle2 className="w-3 h-3" /> فعال
              </span>
            </div>
            <p className="text-xs text-ink-normal/70 dark:text-gray-400 leading-relaxed font-medium">
              با ثبت غیبت یا تأخیر دانش‌آموز توسط دبیر یا ناظم در پنل حضور و غیاب، پیامک به صورت لحظه‌ای به شماره والدین ارسال می‌شود.
            </p>
            <div className="bg-[#F8F9FA] dark:bg-[#1C2536] p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-ink-normal/80 dark:text-gray-300">
              <div className="text-ink-normal/50 text-[11px] mb-1 font-sans font-bold">متغیرهای در دسترس:</div>
              <div>{`{نام_دانش‌آموز}`} | {`{تاریخ}`} | {`{زنگ}`} | {`{وضعیت}`}</div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  toast.success('سناریوی غیبت به رویداد Attendance متصل است و با ثبت غیبت در کلاس به صورت آنی به والدین ارسال می‌شود.');
                }}
                className="flex-1 rokad-btn-outline py-2 text-xs font-bold"
              >
                پایش رویداد حضور و غیاب
              </button>
            </div>
          </div>

          {/* Card 2: Cheque Due Automation */}
          <div className="rokad-card p-6 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#F8A41D] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-college-normal font-black text-sm">
                <div className="p-2 bg-college-light dark:bg-college-darker/50 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span>یادآوری سررسید چک‌ها</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-college-light dark:bg-college-darker/40 text-college-darker dark:text-college-light border border-college-normal/30">
                <Clock className="w-3 h-3" /> روزانه
              </span>
            </div>
            <p className="text-xs text-ink-normal/70 dark:text-gray-400 leading-relaxed font-medium">
              هر روز در ساعت ۹ صبح، چک‌های صیادی بررسی شده و در فواصل ۳ روز قبل، ۱ روز قبل و روز موعد به صادرکننده پیامک ارسال می‌گردد.
            </p>
            <div className="bg-[#F8F9FA] dark:bg-[#1C2536] p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-ink-normal/80 dark:text-gray-300">
              <div className="text-ink-normal/50 text-[11px] mb-1 font-sans font-bold">متغیرهای در دسترس:</div>
              <div>{`{نام}`} | {`{مبلغ}`} | {`{تاریخ_سررسید}`}</div>
            </div>
            <button
              disabled={triggerChequesMutation.isPending}
              onClick={() => triggerChequesMutation.mutate()}
              className="w-full rokad-btn-sec py-2 text-xs font-bold flex items-center justify-center gap-2"
            >
              {triggerChequesMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              )}
              <span>بررسی و ارسال پیامک چک‌های امروز</span>
            </button>
          </div>

          {/* Card 3: Birthday Greetings */}
          <div className="rokad-card p-6 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#E0195B] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-female-normal font-black text-sm">
                <div className="p-2 bg-female-light dark:bg-female-darker/50 rounded-xl">
                  <Cake className="w-5 h-5" />
                </div>
                <span>تبریک خودکار زادروز</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-female-light dark:bg-female-darker/40 text-female-darker dark:text-female-light border border-female-normal/30">
                <Cake className="w-3 h-3" /> جشن تقویم
              </span>
            </div>
            <p className="text-xs text-ink-normal/70 dark:text-gray-400 leading-relaxed font-medium">
              سیستم به صورت اتوماتیک تاریخ تولد دانش‌آموزان، کادر و اساتید را با تقویم جلالی رصد کرده و پیام تبریک صمیمانه ارسال می‌کند.
            </p>
            <div className="bg-[#F8F9FA] dark:bg-[#1C2536] p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-ink-normal/80 dark:text-gray-300">
              <div className="text-ink-normal/50 text-[11px] mb-1 font-sans font-bold">متغیرهای در دسترس:</div>
              <div>{`{نام}`} | تبریک پرسنلی و دانش‌آموزی</div>
            </div>
            <button
              disabled={triggerBirthdaysMutation.isPending}
              onClick={() => triggerBirthdaysMutation.mutate()}
              className="w-full rokad-btn-primary py-2 text-xs font-bold flex items-center justify-center gap-2"
            >
              {triggerBirthdaysMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cake className="w-3.5 h-3.5" />
              )}
              <span>اسکن و تبریک به متولدین امروز</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LOGS & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="rokad-card p-6 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF] space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-base font-black text-sec dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>تاریخچه گزارشات ارسالی پیامک</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-ink-normal/40 dark:text-gray-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  placeholder="جستجوی شماره، نام یا متن..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:outline-none transition"
                />
              </div>

              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:outline-none transition"
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
                className="p-2 rokad-btn-outline rounded-xl"
                title="تازه‌سازی لیست"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-right text-xs text-ink-normal dark:text-gray-200">
              <thead className="bg-[#F8F9FA] dark:bg-[#1C2536] text-sec dark:text-white font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3.5">گیرنده / شماره تماس</th>
                  <th className="p-3.5">نوع پیامک</th>
                  <th className="p-3.5">متن ارسالی</th>
                  <th className="p-3.5">درگاه سرویس</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">زمان ارسال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-ink-normal/50 dark:text-gray-400">
                      در حال دریافت لیست لاگ‌ها...
                    </td>
                  </tr>
                ) : logsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-ink-normal/50 dark:text-gray-400">
                      هیچ پیامی در این فیلتر ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  logsList.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-[#1C2536]/50 transition">
                      <td className="p-3.5 font-bold">
                        <div>{log.recipientName || 'کاربر سیستم'}</div>
                        <div className="text-[11px] text-ink-normal/60 dark:text-gray-400 font-mono" dir="ltr">
                          {log.recipientPhone}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-ecosystem-light dark:bg-ecosystem-darker/60 text-ecosystem-darker dark:text-ecosystem-light border border-primary/30">
                          {log.type === 'AUTO_ABSENCE'
                            ? 'غیبت خودکار'
                            : log.type === 'AUTO_CHEQUE_DUE'
                              ? 'سررسید چک'
                              : log.type === 'AUTO_BIRTHDAY'
                                ? 'تبریک زادروز'
                                : 'ارسال دستی'}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-sm truncate text-ink-normal/90 dark:text-gray-300" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] font-bold text-sec dark:text-gray-300">
                        {log.provider}
                      </td>
                      <td className="p-3.5">
                        {log.status === 'SENT' || log.status === 'DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5" /> ارسال موفق
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400"
                            title={log.errorMessage}
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> ناموفق
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px] text-ink-normal/60 dark:text-gray-400 font-mono" dir="ltr">
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

      {/* ========================================================================= */}
      {/* TAB 4: AMOOT SMS GATEWAY CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Amoot Gateway Form */}
          <div className="lg:col-span-2 rokad-card p-6 sm:p-8 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-500/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-[2px_2px_0_#652D90]">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-sec dark:text-white">
                    پیکربندی وب‌سرویس و درگاه آموت پیامک (Amoot SMS)
                  </h2>
                  <p className="text-xs text-ink-normal/70 dark:text-gray-400 mt-0.5">
                    اتصال مستقیم به سامانه آموت پیامک برای ارسال سریع و اعلانات با خطوط اختصاصی یا اشتراکی
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-400/30">
                REST API v2
              </span>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                انتخاب ارائه‌دهنده فعال سیستم (Active Provider):
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('AMOOT')}
                  className={`p-3.5 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    selectedProvider === 'AMOOT'
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-600 text-purple-700 dark:text-purple-300 shadow-[2px_2px_0_#652D90]'
                      : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-400'
                  }`}
                >
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>آموت پیامک (Amoot)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('KAVENEGAR')}
                  className={`p-3.5 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    selectedProvider === 'KAVENEGAR'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300 shadow-[2px_2px_0_#202A5A]'
                      : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-400'
                  }`}
                >
                  <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>کاوه نگار (Kavenegar)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('SANDBOX')}
                  className={`p-3.5 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    selectedProvider === 'SANDBOX'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-[2px_2px_0_#009966]'
                      : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 text-ink-normal/70 dark:text-gray-400'
                  }`}
                >
                  <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>حالت تستی (Sandbox)</span>
                </button>
              </div>
            </div>

            {/* Amoot Inputs */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-ink-normal/80 dark:text-gray-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>توکن وب‌سرویس آموت (رمزنگاری‌شده و حفاظت‌شده):</span>
                  </label>
                  {amootToken && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      <span>رمزنگاری فعال (AES-256 Masked)</span>
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showAmootToken ? 'text' : 'password'}
                    dir="ltr"
                    placeholder="e.g. amootsms-token-xxxxxxxxxxxxxxxxxxxx"
                    value={amootToken}
                    onChange={(e) => setAmootToken(e.target.value)}
                    className="w-full pr-3.5 pl-24 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs sm:text-sm font-mono focus:border-primary focus:outline-none transition tracking-wider"
                  />
                  <div className="absolute left-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAmootToken(!showAmootToken)}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-ink-normal/70 hover:text-sec dark:hover:text-white bg-gray-200/60 dark:bg-gray-700/60 hover:bg-gray-300/80 transition flex items-center gap-1"
                      title={showAmootToken ? 'مخفی و ماسک‌کردن کلید' : 'نمایش توکن'}
                    >
                      {showAmootToken ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-purple-600" />
                          <span>ماسک</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>نمایش</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-normal/50 dark:text-gray-400 pt-0.5">
                  <span>این کلید با پروتکل امنیتی در دیتابیس مدرسه ذخیره شده و به صورت پیش‌فرض در رابط کاربری پنهان و ماسک است.</span>
                  {amootToken && !showAmootToken && amootToken.length > 8 && (
                    <span className="font-mono text-[10px] text-purple-500/80 dir-ltr font-bold">
                      {amootToken.substring(0, 4)}••••••••••••••••{amootToken.substring(amootToken.length - 4)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                  شماره خط فرستنده اختصاصی آموت (Iran Sender Line):
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono font-bold text-xs text-primary bg-ecosystem-light dark:bg-ecosystem-darker px-2 py-1 rounded-lg border border-primary/30" dir="ltr">
                    +98 (ایران)
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. +98500012345 یا 0912..."
                    value={amootLine}
                    onChange={(e) => setAmootLine(e.target.value)}
                    className="w-full pr-3.5 pl-24 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs sm:text-sm font-mono focus:border-primary focus:outline-none transition font-bold"
                  />
                </div>
                <span className="text-[11px] text-ink-normal/50 dark:text-gray-400 block">
                  شماره خطوط به صورت خودکار با فرمت استاندارد کشوری (<code className="font-mono text-primary font-bold">+98</code>) نرمال‌سازی و در پایگاه‌داده ذخیره می‌شود.
                </span>
              </div>
            </div>

            {/* Submit & Test */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <a
                href="https://portal.amootsms.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <span>ورود به پنل آموت پیامک</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                disabled={updateGatewayConfigMutation.isPending}
                onClick={() => {
                  updateGatewayConfigMutation.mutate({
                    provider: selectedProvider,
                    amootApiKey: amootToken.trim(),
                    amootSenderLine: amootLine.trim(),
                  });
                }}
                className="rokad-btn-primary px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {updateGatewayConfigMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>ذخیره و فعال‌سازی درگاه</span>
              </button>
            </div>
          </div>

          {/* Guide & Documentation Card */}
          <div className="lg:col-span-1 rokad-card p-6 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#652D90] space-y-4">
            <h3 className="text-base font-black text-sec dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>راهنمای اتصال آموت</span>
            </h3>

            <div className="space-y-3 text-xs text-ink-normal/80 dark:text-gray-300 leading-relaxed font-medium">
              <p>
                درگاه **آموت پیامک (Amoot SMS)** با پشتیبانی از خطوط خدماتی بدون بلک‌لیست، مناسب‌ترین گزینه برای ارسال آنی اعلانات به والدین است.
              </p>

              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="font-black text-purple-800 dark:text-purple-300 text-xs">
                  تنظیمات در فایل سرور (.env):
                </div>
                <pre className="text-[11px] font-mono text-ink-normal/80 dark:text-gray-300 bg-white/80 dark:bg-black/40 p-2 rounded-lg" dir="ltr">
{`SMS_PROVIDER=AMOOT
AMOOT_API_KEY=your_token
AMOOT_SENDER_LINE=5000...`}
                </pre>
              </div>

              <div className="space-y-1 text-xs">
                <div className="font-bold text-sec dark:text-white">امکانات فعال در رکاد:</div>
                <ul className="list-disc list-inside space-y-1 text-ink-normal/70 dark:text-gray-400 text-[11.5px]">
                  <li>ارسال پیامک تکی و گروهی</li>
                  <li>سیستم Failover خودکار در صورت قطعی وب‌سرویس</li>
                  <li>اسکن خودکار تاریخ تولد و سررسید چک‌ها</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Templates Manager Section (تعریف و مدیریت الگوهای آماده سریع) */}
          <div className="lg:col-span-3 rokad-card p-6 sm:p-8 bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 shadow-[3px_3px_0_#59BBAF] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#59BBAF]/15 border-2 border-primary/40 flex items-center justify-center text-primary shadow-[2px_2px_0_#59BBAF]">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-sec dark:text-white flex items-center gap-2">
                    <span>تعریف و مدیریت الگوهای پیامک آماده سریع (Quick SMS Templates)</span>
                  </h3>
                  <p className="text-xs text-ink-normal/70 dark:text-gray-400 mt-0.5">
                    الگوهای پرکاربرد مدرسه (مانند لغو کلاس، جلسات، تعطیلی اضطراری، تبریک و اطلاع‌رسانی) را تعریف کنید تا در پنل ارسال سریع در دسترس باشند.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#59BBAF]/10 text-primary border border-primary/30">
                  {quickTemplates.length.toLocaleString('fa-IR')} الگوی تعریف‌شده
                </span>
              </div>
            </div>

            {/* Template Creation / Edit Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
                  toast.error('لطفاً عنوان و متن الگو را وارد نمایید');
                  return;
                }

                if (editingTemplateId) {
                  updateQuickTemplateMutation.mutate({
                    id: editingTemplateId,
                    payload: {
                      title: newTemplateTitle.trim(),
                      content: newTemplateContent.trim(),
                      category: newTemplateCategory,
                    },
                  });
                } else {
                  createQuickTemplateMutation.mutate({
                    title: newTemplateTitle.trim(),
                    content: newTemplateContent.trim(),
                    category: newTemplateCategory,
                  });
                }
              }}
              className="p-5 rounded-2xl bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                <div className="text-xs font-black text-sec dark:text-white flex items-center gap-2">
                  {editingTemplateId ? <Edit3 className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                  <span>{editingTemplateId ? 'ویرایش الگوی سریع' : 'افزودن الگوی سریع جدید'}</span>
                </div>
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setNewTemplateTitle('');
                      setNewTemplateContent('');
                      setNewTemplateCategory('GENERAL');
                    }}
                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>انصراف از ویرایش</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                    عنوان الگو (مثال: کلاس‌های آنلاین، جلسه انجمن، کارنامه):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. اطلاعیه تعطیلی آلودگی هوا"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs sm:text-sm font-bold text-sec dark:text-white focus:border-primary focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                    دسته‌بندی الگو:
                  </label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs sm:text-sm font-semibold text-sec dark:text-white focus:border-primary focus:outline-none transition"
                  >
                    <option value="GENERAL">عمومی و جلسات</option>
                    <option value="ANNOUNCEMENT">اطلاعیه و اخبار</option>
                    <option value="ACADEMIC">آموزشی و آزمون‌ها</option>
                    <option value="EMERGENCY">فوری و اضطراری</option>
                    <option value="FINANCIAL">امور مالی و شهریه</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
                    متن کامل پیامک الگو:
                  </label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {newTemplateContent.length.toLocaleString('fa-IR')} کاراکتر
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="متن پیامک آماده را اینجا بنویسید..."
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs sm:text-sm leading-relaxed text-sec dark:text-white focus:border-primary focus:outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={createQuickTemplateMutation.isPending || updateQuickTemplateMutation.isPending}
                  className="rokad-btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2"
                >
                  {createQuickTemplateMutation.isPending || updateQuickTemplateMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : editingTemplateId ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{editingTemplateId ? 'ذخیره تغییرات الگو' : 'افزودن و ذخیره الگو'}</span>
                </button>
              </div>
            </form>

            {/* List of Existing Quick Templates */}
            <div className="space-y-3">
              <div className="text-xs font-black text-sec dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>لیست الگوهای ذخیره‌شده مدرسه:</span>
              </div>

              {quickTemplatesLoading ? (
                <div className="p-6 text-center text-xs text-ink-normal/50 dark:text-gray-400">
                  در حال بارگذاری الگوها...
                </div>
              ) : quickTemplates.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-normal/50 dark:text-gray-400">
                  هیچ الگویی تعریف نشده است. با استفاده از فرم بالا نخستین الگوی خود را ایجاد کنید.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickTemplates.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] flex flex-col justify-between gap-3 shadow-sm hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black text-sec dark:text-white">{item.title}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#59BBAF]/15 text-[#1F413D] dark:text-[#59BBAF] border border-[#59BBAF]/30">
                            {item.category === 'ANNOUNCEMENT'
                              ? 'اطلاعیه'
                              : item.category === 'ACADEMIC'
                                ? 'آموزشی'
                                : item.category === 'EMERGENCY'
                                  ? 'اضطراری'
                                  : item.category === 'FINANCIAL'
                                    ? 'مالی'
                                    : 'عمومی'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-normal/80 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-[#151C28] p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                        <span className="text-[11px] text-ink-normal/50 dark:text-gray-400 font-mono">
                          {item.content.length.toLocaleString('fa-IR')} کاراکتر
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplateId(item.id);
                              setNewTemplateTitle(item.title);
                              setNewTemplateContent(item.content);
                              setNewTemplateCategory(item.category || 'GENERAL');
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            className="p-1.5 rounded-lg text-primary hover:bg-[#59BBAF]/15 transition"
                            title="ویرایش الگو"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!item.isDefault && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`آیا از حذف الگوی "${item.title}" اطمینان دارید؟`)) {
                                  deleteQuickTemplateMutation.mutate(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                              title="حذف الگو"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

