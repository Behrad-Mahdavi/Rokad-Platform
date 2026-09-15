import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Trophy,
  Crown,
  Sparkles,
  ChevronRight,
  Flame,
  Medal,
  Star,
  Users,
} from 'lucide-react';

export const ClubPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { title: 'استریک فعالیت روزانه', icon: Flame, bg: 'bg-orange-500/10 text-orange-500' },
    { title: 'مدال‌های مهارتی', icon: Medal, bg: 'bg-amber-500/10 text-amber-500' },
    { title: 'فروشگاه جوایز دیجیتال', icon: Star, bg: 'bg-indigo-500/10 text-indigo-500' },
    { title: 'لیگ بین کلاسی و تیمی', icon: Users, bg: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="بازگشت"
          className="p-2 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-primary transition-all active:scale-95 shadow-2xs"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg sm:text-xl text-ink-darker dark:text-white">
            باشگاه دانش‌آموزان رُکاد
          </h1>
        </div>
      </div>

      {/* Hero Banner */}
      <Card className="overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent dark:from-amber-500/20 dark:via-[#151C28] dark:to-transparent shadow-sm">
        <CardContent className="p-5 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center mx-auto shadow-xs">
            <Trophy className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              <span>فصل جدید به‌زودی</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              باشگاه افتخارات و رقابت‌های رُکاد
            </h2>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid - Clean & Minimal */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-800 text-center shadow-2xs"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2 shadow-2xs ${item.bg}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-ink-darker dark:text-white">
              {item.title}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center pt-2">
        <Button
          variant="outline"
          onClick={() => navigate('/app')}
          className="text-xs font-bold"
        >
          بازگشت به صفحه اصلی
        </Button>
      </div>
    </div>
  );
};
