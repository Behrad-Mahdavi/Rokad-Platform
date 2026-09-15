import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Boxes,
  Sparkles,
  ChevronRight,
  Zap,
  Layers,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

export const KaPlatformPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { title: 'پروژه‌های فناورانه', icon: Zap, bg: 'bg-amber-500/10 text-amber-500' },
    { title: 'دستیار هوش مصنوعی', icon: Cpu, bg: 'bg-blue-500/10 text-blue-500' },
    { title: 'رزومه دیجیتال', icon: Layers, bg: 'bg-emerald-500/10 text-emerald-500' },
    { title: 'کارآموزی تخصصی', icon: ShieldCheck, bg: 'bg-purple-500/10 text-purple-500' },
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
            پلتفرم کا
          </h1>
        </div>
      </div>

      {/* Hero Banner */}
      <Card className="overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/15 via-teal-500/10 to-transparent dark:from-primary/20 dark:via-[#151C28] dark:to-transparent shadow-sm">
        <CardContent className="p-5 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 text-white flex items-center justify-center mx-auto shadow-xs">
            <Boxes className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>به‌زودی</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              زیرساخت هوشمند پلتفرم کا
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
