import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits, formatJalaliDisplay } from '../../../utils/jalali';
import {
  Award,
  ShieldAlert,
  AlertTriangle,
  HeartHandshake,
  Calendar,
  TrendingUp,
  User,
  ShieldCheck,
  Search,
  X,
} from 'lucide-react';

interface MatterRecord {
  id: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'SUSPENSION' | 'COUNSELING_REFERRAL';
  title: string;
  description: string;
  points: number;
  actionTaken?: string;
  reportedAt: string;
  reportedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface MattersResponse {
  matters: MatterRecord[];
  totalPoints: number;
  positiveCount: number;
  negativeCount: number;
}

export const StudentMattersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<MattersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'POSITIVE' | 'DISCIPLINARY'>('POSITIVE');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<MattersResponse>('/matters/my-matters');
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load my matters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const typeMetaMap: Record<
    string,
    {
      label: string;
      badgeStyle: string;
      iconBg: string;
      iconColor: string;
      icon: any;
    }
  > = {
    POSITIVE: {
      label: 'تشویقی',
      badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      icon: Award,
    },
    NEGATIVE: {
      label: 'انضباطی',
      badgeStyle: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      iconColor: 'text-rose-600 dark:text-rose-400',
      icon: ShieldAlert,
    },
    WARNING: {
      label: 'انضباطی',
      badgeStyle: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
      icon: AlertTriangle,
    },
    SUSPENSION: {
      label: 'انضباطی',
      badgeStyle: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-500/30',
      iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: ShieldAlert,
    },
    COUNSELING_REFERRAL: {
      label: 'انضباطی',
      badgeStyle: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      iconColor: 'text-purple-600 dark:text-purple-400',
      icon: HeartHandshake,
    },
  };

  const isParent = user?.role === 'PARENT';
  const matters = data?.matters || [];

  const filteredMatters = useMemo(() => {
    return matters.filter((m) => {
      const matchesFilter =
        activeFilter === 'POSITIVE'
          ? m.type === 'POSITIVE'
          : m.type !== 'POSITIVE';

      const matchesSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.actionTaken && m.actionTaken.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [matters, activeFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {/* 1. Header Master Panel */}
      <div className="bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-[#242F42] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shadow-2xs shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-ink-darker dark:text-white truncate">
            {isParent ? 'کارنامه انضباطی و تشویقی فرزند' : 'پرونده انضباطی و تشویقی من'}
          </h1>
        </div>
      </div>

      {/* 2. Hero KPI Cards (Commendations & Disciplinary side-by-side) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Skeleton className="h-20 sm:h-24 rounded-2xl" />
          <Skeleton className="h-20 sm:h-24 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Commendations */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-muted-foreground block truncate">تشویق و تقدیر</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {toPersianDigits(data?.positiveCount || 0)}
                </span>
                <span className="text-[11px] text-emerald-600/80 font-bold">مورد</span>
              </div>
            </div>
          </div>

          {/* Warnings & Disciplinary */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs flex items-center gap-3.5 hover:-translate-y-0.5 hover:border-rose-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-muted-foreground block truncate">تذکرات و انضباطی</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                  {toPersianDigits(data?.negativeCount || 0)}
                </span>
                <span className="text-[11px] text-rose-600/80 font-bold">مورد</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Two Option Tabs & Search Below */}
      <div className="space-y-3">
        {/* Two Tabs like options */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Option: Commendations */}
          <button
            type="button"
            onClick={() => setActiveFilter('POSITIVE')}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-right flex items-center justify-between gap-3 cursor-pointer select-none ${
              activeFilter === 'POSITIVE'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-[2px_2px_0_#064e3b] dark:shadow-[2px_2px_0_#064e3b]'
                : 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-[#242F42] hover:border-emerald-300 dark:hover:border-emerald-800/60 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeFilter === 'POSITIVE'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span
                  className={`text-xs sm:text-sm font-black block truncate ${
                    activeFilter === 'POSITIVE'
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-ink-darker dark:text-white'
                  }`}
                >
                  موارد تشویقی
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  تقدیرها و امتیازات مثبت
                </span>
              </div>
            </div>

            <span
              className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                activeFilter === 'POSITIVE'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {toPersianDigits(data?.positiveCount || 0)}
            </span>
          </button>

          {/* Option: Disciplinary */}
          <button
            type="button"
            onClick={() => setActiveFilter('DISCIPLINARY')}
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all text-right flex items-center justify-between gap-3 cursor-pointer select-none ${
              activeFilter === 'DISCIPLINARY'
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 shadow-[2px_2px_0_#881337] dark:shadow-[2px_2px_0_#881337]'
                : 'bg-white dark:bg-[#151C28] border-gray-200/80 dark:border-[#242F42] hover:border-rose-300 dark:hover:border-rose-800/60 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeFilter === 'DISCIPLINARY'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span
                  className={`text-xs sm:text-sm font-black block truncate ${
                    activeFilter === 'DISCIPLINARY'
                      ? 'text-rose-900 dark:text-rose-200'
                      : 'text-ink-darker dark:text-white'
                  }`}
                >
                  موارد انضباطی
                </span>
                <span className="text-[11px] text-muted-foreground block truncate">
                  تذکرات و پرونده رفتاری
                </span>
              </div>
            </div>

            <span
              className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full shrink-0 ${
                activeFilter === 'DISCIPLINARY'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
              }`}
            >
              {toPersianDigits(data?.negativeCount || 0)}
            </span>
          </button>
        </div>

        {/* Search below options */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="جستجو در عنوان، توضیحات یا اقدامات مدرسه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-[#242F42] shadow-xs focus:outline-none focus:border-primary transition-all text-ink-darker dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink-darker dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Matters Timeline / Card List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : filteredMatters.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] border-dashed border-gray-200 dark:border-gray-800">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
                activeFilter === 'DISCIPLINARY'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {activeFilter === 'DISCIPLINARY' ? (
                <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
              ) : (
                <Award className="w-8 h-8 stroke-[2.2]" />
              )}
            </div>
            <h4 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              {searchQuery
                ? 'موردی با این عبارت یافت نشد'
                : activeFilter === 'DISCIPLINARY'
                ? 'پرونده انضباطی کاملاً پاک و درخشان است!'
                : 'هنوز تشویقی برای این دوره ثبت نشده است'}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'عبارت جستجو را تغییر دهید یا پاک کنید.'
                : activeFilter === 'DISCIPLINARY'
                ? 'خوشبختانه هیچ تذکر یا مورد انضباطی در پرونده ثبت نگردیده است. با آرزوی تداوم موفقیت!'
                : 'با تلاش و فعالیت‌های مستمر در کلاس و آزمون‌ها، تشویقی‌های خود را ثبت کنید.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {filteredMatters.map((m) => {
              const meta = typeMetaMap[m.type] || typeMetaMap.POSITIVE;
              const Icon = meta.icon;
              const isPositive = m.points > 0;
              const isNegative = m.points < 0;

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-gray-200/80 dark:border-[#242F42] bg-white dark:bg-[#151C28] p-4 sm:p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Right side: Icon, Type, Title, Description */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-current/20 ${meta.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${meta.badgeStyle}`}
                          >
                            {meta.label}
                          </span>

                          {m.points !== 0 && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                isPositive
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3" />
                              {isPositive ? `+${toPersianDigits(m.points)} امتیاز` : `${toPersianDigits(m.points)} امتیاز`}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-black text-ink-darker dark:text-white">
                          {m.title}
                        </h3>
                      </div>
                    </div>

                    {/* Left side: Date & Reporter badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{formatJalaliDisplay(m.reportedAt, true)}</span>
                      </div>

                      {m.reportedBy && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-[#1E293B] border border-gray-200/60 dark:border-gray-800 text-[11px] text-muted-foreground font-bold">
                          <User className="w-3 h-3" />
                          <span>
                            {m.reportedBy.firstName} {m.reportedBy.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

