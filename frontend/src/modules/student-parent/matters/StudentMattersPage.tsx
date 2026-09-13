import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  Award,
  ShieldAlert,
  AlertTriangle,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  User,
  ShieldCheck,
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
    { label: string; badgeVariant: 'success' | 'destructive' | 'warning' | 'college' | 'neutral'; icon: any }
  > = {
    POSITIVE: { label: 'تشویق', badgeVariant: 'success', icon: Award },
    NEGATIVE: { label: 'مورد انضباطی', badgeVariant: 'destructive', icon: ShieldAlert },
    WARNING: { label: 'تذکر انضباطی', badgeVariant: 'warning', icon: AlertTriangle },
    SUSPENSION: { label: 'محرومیت موقت', badgeVariant: 'destructive', icon: ShieldAlert },
    COUNSELING_REFERRAL: { label: 'جلسه مشاوره', badgeVariant: 'college', icon: HeartHandshake },
  };

  const isParent = user?.role === 'PARENT';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <ResponsivePageHeader
        title={isParent ? 'موارد انضباطی و تشویقی فرزند' : 'موارد انضباطی و تشویقی من'}
        subtitle="مشاهده سوابق تشویق‌ها، تذکرات کلاسی و موارد انضباطی ثبت‌شده"
        icon={<ShieldCheck className="h-5 w-5 text-amber-600" />}
      />

      {/* Hero Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <Skeleton className="h-20 sm:h-28 rounded-2xl" />
          <Skeleton className="h-20 sm:h-28 rounded-2xl" />
          <Skeleton className="h-20 sm:h-28 rounded-2xl col-span-2 sm:col-span-1" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Total Matters */}
          <Card className="p-3.5 sm:p-5 border border-primary/20 bg-gradient-to-br from-primary/5 via-surface/50 to-surface">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">کل موارد</span>
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 sm:mt-2">
              <span className="text-xl sm:text-2xl font-black text-foreground">
                {data?.matters?.length || 0}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">مورد</span>
            </div>
          </Card>

          {/* Commendations */}
          <Card className="p-3.5 sm:p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-surface/50 to-surface">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">تشویق‌ها</span>
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 sm:mt-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">
                {data?.positiveCount || 0}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">مورد</span>
            </div>
          </Card>

          {/* Warnings & Negative */}
          <Card className="p-3.5 sm:p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-surface/50 to-surface col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">تذکرات</span>
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1 sm:mt-2">
              <span className="text-xl sm:text-2xl font-black text-destructive">
                {data?.negativeCount || 0}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">مورد</span>
            </div>
          </Card>
        </div>
      )}

      {/* Timeline Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">تاریخچه وقایع و رویدادهای انضباطی</h3>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : !data || data.matters.length === 0 ? (
          <div className="text-center py-16 bg-surface/20 rounded-2xl border border-dashed border-border/60">
            <Award className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
            <h4 className="text-base font-semibold text-foreground">
              سوابق انضباطی شما کاملاً سفید و درخشان است
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              تاکنون هیچ مورد منفی یا اخطاری در پرونده ثبت نگردیده است. با آرزوی تداوم موفقیت!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.matters.map((m) => {
              const meta = typeMetaMap[m.type] || typeMetaMap.POSITIVE;
              const Icon = meta.icon;
              const isPos = m.points > 0;
              const isNeg = m.points < 0;

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    m.type === 'POSITIVE'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-surface/40 border-border/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        m.type === 'POSITIVE'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : m.type === 'COUNSELING_REFERRAL'
                          ? 'bg-purple-500/10 text-purple-600'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                        {m.points !== 0 && (
                          <Badge variant={isPos ? 'success' : 'destructive'}>
                            {isPos ? `+${m.points} امتیاز` : `${m.points} امتیاز`}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.reportedAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground mt-0.5">{m.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {m.description}
                      </p>

                      {m.actionTaken && (
                        <p className="text-xs text-foreground/80 bg-surface/80 px-2.5 py-1 rounded-md border border-border/30 inline-block">
                          اقدام مدرسه: {m.actionTaken}
                        </p>
                      )}
                    </div>
                  </div>

                  {m.reportedBy && (
                    <div className="text-xs text-muted-foreground shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/40">
                      ثبت توسط: {m.reportedBy.firstName} {m.reportedBy.lastName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
