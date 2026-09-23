import React, { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../utils/jalali';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { isWizardManagerRole } from '../constants/event-access';
import {
  Layers,
  FileText,
  Download,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sparkles,
  Printer,
  Compass,
  Users,
  Target,
  Clock,
  Award,
  BookOpen,
  Share2,
  Box,
  Megaphone,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';

interface EventCanvasMaterialsStepProps {
  eventId: string;
  eventTitle: string;
}

interface CanvasBlock {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  items: string[];
}

interface MaterialFile {
  id: string;
  title: string;
  type: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX';
  size: string;
  description: string;
  downloadUrl?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  isDone: boolean;
}

export const EventCanvasMaterialsStep: React.FC<EventCanvasMaterialsStepProps> = ({
  eventId,
  eventTitle,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = isWizardManagerRole(currentUser?.role);
  const [activeTab, setActiveTab] = useState<'CANVAS' | 'MATERIALS' | 'CHECKLIST'>('CANVAS');

  const canvasStorageKey = `rokad_event_canvas_${eventId}`;
  const checklistStorageKey = `rokad_event_checklist_${eventId}`;

  // Canvas Blocks State (9 Standard Event Canvas Blocks) — persist items only (icons are not serializable)
  const defaultCanvasBlocks: CanvasBlock[] = [
    {
      id: 'vision_goals',
      title: '۱. هدف و چشم‌انداز رویداد',
      description: 'دلیل برگزاری رویداد و دستاورد نهایی مورد انتظار',
      icon: Target,
      color: 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
      items: [
        'ارتقای مهارت‌های عملی و حل مسئله تیمی',
        'شناسایی و پرورش استعدادهای نوآورانه',
        'تولید نمونه اولیه‌های قابل ارائه به بازار',
      ],
    },
    {
      id: 'target_audience',
      title: '۲. مخاطبان و ذی‌نفعان اصلی',
      description: 'چه کسانی در این رویداد شرکت و سود می‌برند؟',
      icon: Users,
      color: 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
      items: [
        'دانش‌آموزان رشته‌های فنی و کامپیوتر',
        'اساتید و مربیان کارگاه‌های مهارتی',
        'داوران و منتورهای صنعتی و اجرایی',
      ],
    },
    {
      id: 'value_prop',
      title: '۳. ارزش پیشنهادی و جذابیت',
      description: 'چرا شرکت‌کنندگان باید این رویداد را انتخاب کنند؟',
      icon: Sparkles,
      color: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
      items: [
        'کسب گواهی معتبر مهارتی رکاد',
        'اهدای جوایز نقدی و تجهیزات به تیم‌های برتر',
        'تجربه شبیه‌سازی فضای واقعی بازار کار',
      ],
    },
    {
      id: 'agenda_topics',
      title: '۴. سرفصل‌ها و ساختار برنامه',
      description: 'محورها، ورک‌شاپ‌ها و زمان‌بندی اصلی محتوا',
      icon: BookOpen,
      color: 'bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200',
      items: [
        'کارگاه ایده‌پردازی و تفکر طراحی (۲ ساعت)',
        'ماراتن توسعه و ساخت پروتوتایپ (۴ ساعت)',
        'پیچ و ارائه طرح در حضور داوران (۲ ساعت)',
      ],
    },
    {
      id: 'mentors_judges',
      title: '۵. مربیان، سخنرانان و داوران',
      description: 'افراد کلیدی و هدایت‌کنندگان علمی و داوری',
      icon: Award,
      color: 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200',
      items: [
        'منتورهای فنی حوزه نرم‌افزار و هوش مصنوعی',
        'داوران تخصصی نوآوری و بازار',
        'تسهیل‌گر و مجری صحنه رویداد',
      ],
    },
    {
      id: 'resources_equipment',
      title: '۶. منابع، تجهیزات و فضا',
      description: 'امکانات فیزیکی، سخت‌افزاری و دیجیتال لازم',
      icon: Box,
      color: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
      items: [
        'سالن همایش مجهز به ویدئو پروژکتور و صوت',
        'اینترنت پرسرعت و بوم‌های کاغذی A3',
        'پذیرایی میان‌وعده و پک هدیه خوش‌آمدگویی',
      ],
    },
    {
      id: 'channels_promotion',
      title: '۷. کانال‌های اطلاع‌رسانی',
      description: 'مسیرهای جذب مخاطب و ارتباط با شرکت‌کنندگان',
      icon: Megaphone,
      color: 'bg-teal-50 border-teal-300 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200',
      items: [
        'اطلاعیه در تابلوی اعلانات سامانه رکاد',
        'کانال‌های دانش‌آموزی و اولیاء',
        'پوسترهای فیزیکی در راهروهای هنرستان',
      ],
    },
    {
      id: 'run_of_show',
      title: '۸. سناریوی زمان‌بندی اجرا',
      description: 'جدول گام‌به‌گام اتفاقات روز برگزاری',
      icon: Clock,
      color: 'bg-cyan-50 border-cyan-300 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200',
      items: [
        '۰۸:۰۰ الی ۰۸:۳۰: پذیرش و ثبت‌نام حضوری',
        '۰۸:۳۰ الی ۰۹:۰۰: افتتاحیه و معرفی چالش‌ها',
        '۰۹:۰۰ الی ۱۳:۰۰: مسابقه و منتورینگ زنده',
        '۱۳:۰۰ الی ۱۴:۰۰: داوری، اختتامیه و جوایز',
      ],
    },
    {
      id: 'success_kpis',
      title: '۹. شاخص‌های سنجش موفقیت (KPI)',
      description: 'معیارهای کمی و کیفی ارزیابی خروجی رویداد',
      icon: Lightbulb,
      color: 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
      items: [
        'مشارکت بیش از ۵۰ شرکت‌کننده فعال',
        'ثبت رضایت بالای ۸۵٪ در نظرسنجی پرس‌کاد',
        'تکمیل حداقل ۱۰ کاربرگ بوم تیمی',
      ],
    },
  ];

  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>(() => {
    try {
      const saved = localStorage.getItem(`rokad_event_canvas_${eventId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return defaultCanvasBlocks.map((block) => ({
            ...block,
            items: Array.isArray(parsed[block.id]) ? parsed[block.id] : block.items,
          }));
        }
      }
    } catch {}
    return defaultCanvasBlocks;
  });

  useEffect(() => {
    try {
      const itemsMap: Record<string, string[]> = {};
      for (const block of canvasBlocks) itemsMap[block.id] = block.items;
      localStorage.setItem(canvasStorageKey, JSON.stringify(itemsMap));
    } catch {}
  }, [canvasBlocks, canvasStorageKey]);

  // Add Item to Block Modal
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  // Worksheets & Downloadable Materials
  const materialsList: MaterialFile[] = [
    {
      id: 'mat_1',
      title: 'کاربرگ خام بوم طراحی رویداد (نسخه چاپ A3)',
      type: 'PDF',
      size: '۲.۴ مگابایت',
      description: 'قالب استاندارد و استانداردسازی شده برای تکمیل تیمی در روز رویداد',
    },
    {
      id: 'mat_2',
      title: 'راهنما و شیوه‌نامه ارزیابی و داوری ایده‌ها',
      type: 'PDF',
      size: '۱.۱ مگابایت',
      description: 'ماتریس امتیازدهی و معیارهای ۵ ستاره داوران پرس‌کاد',
    },
    {
      id: 'mat_3',
      title: 'قالب اسلایدهای ارائه نهایی (پرزنتیشن تیم‌ها)',
      type: 'PPTX',
      size: '۴.۸ مگابایت',
      description: 'تم رسمی و نئوبروتالیست رکاد برای پیچ و دفاع از ایده',
    },
    {
      id: 'mat_4',
      title: 'چک‌لیست اکسل لجستیک و اقلام اجرایی',
      type: 'XLSX',
      size: '۵۴۰ کیلوبایت',
      description: 'جدول کامل برنامه‌ریزی تدارکات، بودجه و وظایف کادر اجرایی',
    },
  ];

  // Interactive Logistics Checklist — persisted per event
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(checklistStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChecklistItem[];
      }
    } catch {}
    return [
    { id: 'c1', text: 'طراحی و چاپ بوم‌های کارگاهی و کاربرگ‌های تمرینی', category: 'متریال و چاپ', isDone: true },
    { id: 'c2', text: 'تست سیستم صوتی و ویدئو پروژکتور سالن اصلی', category: 'فنی و تجهیزات', isDone: true },
    { id: 'c3', text: 'ارسال پیامک و نوتیفیکیشن یادآوری به شرکت‌کنندگان', category: 'اطلاع‌رسانی', isDone: false },
    { id: 'c4', text: 'تهیه ماژیک‌ها، کاغذهای یادداشت رنگی و استیکرها', category: 'متریال و چاپ', isDone: true },
    { id: 'c5', text: 'هماهنگی پذیرایی میان‌وعده و بسته‌های آب‌معدنی', category: 'تدارکات', isDone: false },
    { id: 'c6', text: 'آماده‌سازی لوح‌های تقدیر، تندیس‌ها و جوایز برگزیدگان', category: 'جوایز و تشریفات', isDone: false },
    { id: 'c7', text: 'تنظیم لینک نظرسنجی آنلاین پرس‌کاد در سامانه', category: 'فنی و پلتفرم', isDone: true },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(checklistStorageKey, JSON.stringify(checklist));
    } catch {}
  }, [checklist, checklistStorageKey]);

  const toggleChecklistItem = (id: string) => {
    if (!isManager) return;
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDone: !item.isDone } : item))
    );
  };

  const handleAddItemToBlock = () => {
    if (!isManager) return;
    if (!selectedBlockId || !newItemText.trim()) return;

    setCanvasBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? { ...block, items: [...block.items, newItemText.trim()] }
          : block
      )
    );

    setNewItemText('');
    setSelectedBlockId(null);
    toast.success('مورد جدید با موفقیت به بوم اضافه شد.');
  };

  const handleDeleteItemFromBlock = (blockId: string, itemIdx: number) => {
    if (!isManager) return;
    setCanvasBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, items: block.items.filter((_, idx) => idx !== itemIdx) }
          : block
      )
    );
    toast.info('مورد از بوم حذف شد.');
  };

  const handlePrintCanvas = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-5 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border-2 border-zinc-900 bg-emerald-400 text-zinc-950 text-xs font-black mb-2 shadow-[2px_2px_0px_0px_#202A5A]">
              <Layers className="w-4 h-4" />
              <span>گام چهارم: بوم و ورک‌شیت رویداد</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
              بوم جامع طراحی رویداد، متریال‌ها و چک‌لیست کاربرگ‌ها
            </h2>
            <p className="text-xs md:text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-1">
              ماتریس ۹گانه بوم اجرایی رویداد «{eventTitle}» را مدیریت کنید و کاربرگ‌های دانلودی را دریافت نمایید.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handlePrintCanvas}
              className="gap-2 text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / خروجی بوم</span>
            </Button>
          </div>
        </div>

        {/* Tab Toggle: Canvas Grid vs Materials Downloads vs Interactive Checklist */}
        <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl border-2 border-zinc-900 bg-zinc-100 dark:bg-zinc-800 sm:max-w-lg">
          <button
            onClick={() => setActiveTab('CANVAS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'CANVAS'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-[2px_2px_0px_0px_#202A5A]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>بوم مدل رویداد (۹ بخش)</span>
          </button>
          <button
            onClick={() => setActiveTab('MATERIALS')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'MATERIALS'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-[2px_2px_0px_0px_#202A5A]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ورک‌شیت‌ها و متریال‌ها</span>
          </button>
          <button
            onClick={() => setActiveTab('CHECKLIST')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'CHECKLIST'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-[2px_2px_0px_0px_#202A5A]'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <span>چک‌لیست آمادگی</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: EVENT CANVAS GRID (9-BOX NEOBRUTALIST CANVAS) ================= */}
      {activeTab === 'CANVAS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {canvasBlocks.map((block) => {
              const IconComp = block.icon;

              return (
                <div
                  key={block.id}
                  className={`flex flex-col justify-between rounded-2xl border-[1.5px] border-[#EAEAEA] p-5 shadow-[2.75px_2.75px_0_#202A5A] dark:border-zinc-100 dark:shadow-[2.75px_2.75px_0_#59BBAF] ${block.color}`}
                >
                  <div>
                    {/* Header of Block */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-current/20">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border-2 border-zinc-900 bg-white dark:bg-zinc-900 shadow-[1px_1px_0px_0px_#202A5A]">
                          <IconComp className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                        </div>
                        <h3 className="text-sm font-black tracking-tight">{block.title}</h3>
                      </div>
                      {isManager && (
                        <button
                          onClick={() => setSelectedBlockId(block.id)}
                          className="p-1 rounded-md bg-white/80 hover:bg-white text-zinc-900 border border-zinc-900 shadow-[1px_1px_0_#202A5A] transition-all"
                          title="افزودن نکته به این بخش"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] font-bold opacity-75 mb-3">{block.description}</p>

                    {/* Items List (Sticky Notes) */}
                    <div className="space-y-2 my-2">
                      {block.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="group/item flex items-start justify-between gap-2 rounded-xl border-2 border-zinc-900 bg-white/95 p-2.5 shadow-[2px_2px_0px_0px_#202A5A] dark:bg-zinc-900 dark:border-zinc-200"
                        >
                          <div className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-1.5 flex-shrink-0" />
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                              {item}
                            </span>
                          </div>
                      {isManager && (
                        <button
                          onClick={() => handleDeleteItemFromBlock(block.id, idx)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"
                          title="حذف این مورد"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {isManager && (
                    <div className="pt-2 mt-2 border-t border-current/10">
                      <button
                        onClick={() => setSelectedBlockId(block.id)}
                        className="w-full text-center py-1 rounded-lg text-xs font-black opacity-80 hover:opacity-100 hover:bg-black/5 transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>افزودن کارت جدید</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: WORKSHEETS & DOWNLOADABLE MATERIALS ================= */}
      {activeTab === 'MATERIALS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {materialsList.map((mat) => (
              <div
                key={mat.id}
                className="flex flex-col sm:flex-row sm:items-start items-stretch justify-between gap-4 rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-5 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl border-2 border-zinc-900 flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_0px_#202A5A] ${
                      mat.type === 'PDF'
                        ? 'bg-red-400 text-zinc-950'
                        : mat.type === 'PPTX'
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-emerald-400 text-zinc-950'
                    }`}
                  >
                    {mat.type}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-1">
                      {mat.title}
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                      {mat.description}
                    </p>
                    <span className="text-[11px] font-bold text-zinc-400">حجم فایل: {mat.size}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success(`دانلود فایل «${mat.title}» آغاز شد.`);
                  }}
                  className="gap-1.5 text-xs font-black sm:flex-shrink-0 w-full sm:w-auto justify-center"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>دانلود متریال</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: LOGISTICS CHECKLIST ================= */}
      {activeTab === 'CHECKLIST' && (
        <div className="rounded-2xl border-[1.5px] border-[#EAEAEA] bg-white p-6 shadow-[2.75px_2.75px_0_#202A5A] dark:border-[#242F42] dark:bg-[#151C28] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-900/10 dark:border-zinc-100/10 pb-4 mb-5">
            <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2 min-w-0">
              <CheckSquare className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>چک‌لیست آمادگی ملزومات و تدارکات اجرایی رویداد</span>
            </h3>
            <span className="text-xs font-black text-zinc-600 dark:text-zinc-400 flex-shrink-0">
              {toPersianDigits(checklist.filter((c) => c.isDone).length)} از {toPersianDigits(checklist.length)} مورد تکمیل شده
            </span>
          </div>

          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => isManager && toggleChecklistItem(item.id)}
                className={`${isManager ? 'cursor-pointer' : 'cursor-default'} flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 transition-all ${
                  item.isDone
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-zinc-900 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-200 dark:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-emerald-600">
                    {item.isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <span
                    className={`text-xs md:text-sm font-bold ${
                      item.isDone ? 'line-through opacity-75' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-md border border-current text-[11px] font-black">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal to add item to block */}
      <Modal
        isOpen={!!selectedBlockId}
        onClose={() => setSelectedBlockId(null)}
        title="افزودن کارت / نکته به بوم رویداد"
      >
        <div className="space-y-4">
          <label className="block text-xs font-black text-zinc-700 dark:text-zinc-300">
            عنوان یا شرح نکته جدید:
          </label>
          <input
            type="text"
            placeholder="مثال: دعوت از سخنران ویژه حوزه استارتاپ‌های دانش‌آموزی"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-sm font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              variant="outline"
              onClick={() => setSelectedBlockId(null)}
              className="font-bold"
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleAddItemToBlock}
              className="font-black px-6"
            >
              افزودن به این بخش
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
