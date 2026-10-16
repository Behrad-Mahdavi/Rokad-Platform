import { ClubDepartment, ClubChallengeType } from '@prisma/client';

export interface EntranceChallengeDef {
  slug: string;
  title: string;
  description: string;
  department: ClubDepartment;
  packageFile: string;
  driveUrl?: string; // لینک مستقیم فایل گوگل درایو
  missionBrief: string;
  rules: string;
  maxDays: number;
  maxScore: number;
  type: ClubChallengeType;
  tags: string[];
}

export const ENTRANCE_CHALLENGES: EntranceChallengeDef[] = [
  {
    slug: 'project-01-nestly-landing',
    title: 'پیاده‌سازی لندینگ‌پیج املاک نستلی (Nestly Apartment Landing)',
    description: 'تبدیل طرح فیگما لندینگ‌پیج مدرن املاک Nestly جاکارتا به وب‌سایت فرانت‌اند کامل، واکنش‌گرا و پیکسل‌پرفکت',
    department: ClubDepartment.ENGINEER,
    packageFile: 'project-01-nestly-landing.zip',
    driveUrl: 'https://drive.google.com/file/d/1PZ_wCgvQ9W3KaIXEv3qfq8ZNcZwS36t5/view?usp=drive_link',
    missionBrief: `در این پروژه باید لندینگ‌پیج وب‌سایت املاک مدرن Nestly را دقیقاً مطابق با طراحی انجام‌شده در فایل فیگما (.fig) به کد فرانت‌اند تمیز و مدرن تبدیل کنی.
تمامی سکشن‌ها شامل نوار ناوبری واکنش‌گرا، هیرو و باکس فیلتر سریع، آمار و شاخص‌های اعتماد، ویترین آپارتمان‌های برگزیده، امکانات رفاهی و فوتر کامل باید پیاده‌سازی شوند. فایل فیگما به صورت کامل در پکیج ضمیمه شده است.`,
    rules: 'وفاداری کامل به طراحی (Pixel-Perfect)، پیاده‌سازی واکنش‌گرا (موبایل و دسکتاپ)، تحویل ریپازیتوری معتبر گیت‌هاب + لینک دمو آنلاین مستقر شده + ثبت منظم گزارش کار روزانه.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Frontend', 'Figma to Code', 'React / Next.js', 'TailwindCSS / CSS', 'Responsive Design'],
  },
  {
    slug: 'project-02-leaderboard-api',
    title: 'سرویس API و وب‌سوکت بلادرنگ لیدربورد (Leaderboard API & WebSocket)',
    description: 'طراحی و پیاده‌سازی سرویس RESTful و وب‌سوکت بلادرنگ برای ثبت رویدادهای امتیازی، مدیریت اعضا، اعتبارسنجی و برادکست آنی لیدربورد',
    department: ClubDepartment.ENGINEER,
    packageFile: 'project-02-leaderboard-api.zip',
    driveUrl: 'https://drive.google.com/file/d/1F-AU08TJc75Ot1glPnUnHh6vkKG6Msg9/view?usp=drive_link',
    missionBrief: `باشگاه کسب‌وکار رُکاد برای اعضایش امتیاز ثبت می‌کند: تایید یک گره‌ی مهارتی، تحویل پروژه، منتورینگ و مشارکت در رویدادها. به یک سرویس مرکزی با REST API و WebSocket نیاز داریم که اعضا را مدیریت کند، رویدادهای امتیازی را با اعتبارسنجی ثبت کرده و به‌محض هر تغییر، رویداد و وضعیت جدید جدول رتبه‌بندی را به صورت سوکت زنده (Real-time WebSocket) به تمام کلاینت‌های متصل پخش (Broadcast) کند.`,
    rules: 'مخزن گیت‌هاب شامل مستندات OpenAPI، راهنمای مشخصات پیام‌های وب‌سوکت، تست‌های واحد یا یکپارچگی و راهنمای نصب + ثبت منظم گزارش کار روزانه.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Node.js', 'NestJS / Express', 'WebSocket / Socket.io', 'REST API', 'PostgreSQL / SQLite', 'Testing'],
  },
  {
    slug: 'project-03-wordpress-club-site',
    title: 'وب‌سایت وردپرسی معرفی باشگاه کسب‌وکار رُکاد',
    description: 'پیاده‌سازی وب‌سایت رسمی و مدرن وردپرسی بر پایه دیزاین‌پک نئوبروتالیسم رُکاد و محتوای استاندارد صفحات',
    department: ClubDepartment.JACK_OF_ALL_TRADES,
    packageFile: 'project-03-wordpress-club-site.zip',
    driveUrl: 'https://drive.google.com/file/d/11KKSjaPli8fJ6v8zxe3bR-_Yk4ta0sPX/view?usp=drive_link',
    missionBrief: `تبدیل دیزاین‌پک و محتوای رسمی باشگاه رُکاد به یک وب‌سایت وردپرسی کامل، واکنش‌گرا و آنلاین که باشگاه را به دانش‌آموزان مستعد، خانواده‌ها و مشتریان بالقوه استودیو معرفی کرده و مخاطب را به اقدام (عضویت/تماس) هدایت کند.`,
    rules: 'وفاداری به دیزاین‌پک، رعایت استانداردهای سئو فنی و سرعت لود، عدم استفاده از قالب‌ها و افزونه‌های نال‌شده.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['WordPress', 'Elementor / Gutenberg', 'Neobrutalism', 'Web Design'],
  },
  {
    slug: 'project-04-mahalleh-yar',
    title: 'سامانه‌ی محله‌یار (MahallehYar)',
    description: 'توسعه وب‌اپلیکیشن جامع خدمات شهری و مشارکت مدنی برای پیگیری مشکلات محلی، کارتابل شورای محله و تعامل با شهرداری',
    department: ClubDepartment.ENGINEER,
    packageFile: 'project-04-mahalleh-yar.zip',
    driveUrl: 'https://drive.google.com/file/d/11o3TZY8O6XvkSd3nusYzc4dpWZQXdniP/view?usp=drive_link',
    missionBrief: `«محله‌یار» یک سامانه‌ی تحت وب خدمات شهری و مشارکت مدنی است که برای ایجاد ارتباط شفاف، مستند و قابل پیگیری میان شهروندان، شورای محله و شهرداری طراحی شده است. شهروندان مشکلات محلی خود را ثبت می‌کنند و اعضای شورای محله مسئولیت بررسی، ارجاع و اعلام نتیجه را در کارتابل بر عهده دارند.`,
    rules: 'سورس‌کد پروژه در گیت‌هاب + دمو آنلاین فعال + ثبت گزارش کار روزانه.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Fullstack', 'Workflow Management', 'Civic Tech', 'Dashboard'],
  },
  {
    slug: 'project-05-intro-video',
    title: 'ویدیوی ۹۰ ثانیه‌ای تیزر و معرفی رُکاد',
    description: 'خلق یک ویدیوی تبلیغاتی و روایی ۹۰ ثانیه‌ای از ایده و سناریو تا استوری‌بورد، تصویربرداری، تدوین و صداگذاری',
    department: ClubDepartment.ARTIST,
    packageFile: 'project-05-intro-video.zip',
    driveUrl: 'https://drive.google.com/file/d/1FcS2OHbB97-PaJopmrDCQX4oPg8Qwl8l/view?usp=drive_link',
    missionBrief: `رُکاد به یک ویدیوی معرفی کوتاه نیاز دارد که در ۹۰ ثانیه بگوید رُکاد چیست، چه مسیری پیش روی نوجوانان مستعد می‌گذارد و چرا ورود به باشگاه ارزشمند است. ویدیو باید دارای خط داستانی جذاب و استانداردهای تدوین و صداگذاری حرفه‌ای باشد.`,
    rules: 'ارسال خروجی باکیفیت 1080p ویدیو + فایل سند سناریو و استوری‌بورد + گزارش کار فرآیند تولید.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Video Editing', 'Premiere / After Effects', 'Storyboarding', 'Sound Design'],
  },
  {
    slug: 'project-06-figma-product',
    title: 'طراحی محصول کامل در فیگما (Figma UI/UX)',
    description: 'طراحی تجربه کاربری (UX) و رابط کاربری (UI) فرایند ورود به باشگاه در سبک نئوبروتالیسم به همراه دیزاین‌سیستم و پروتوتایپ',
    department: ClubDepartment.ARTIST,
    packageFile: 'project-06-figma-product.zip',
    driveUrl: 'https://drive.google.com/file/d/1SZ0ffh-ei4oSa_FHyZD90Ppq8kIVf5KT/view?usp=drive_link',
    missionBrief: `یک محصول دیجیتال موبایل‌محور در فیگما طراحی کنید که متقاضی را از مرحله آشنایی تا پذیرش در باشگاه همراهی کند؛ شامل جریان کاربری، وایرفریم‌ها، UI نهایی، کامپوننت‌های دیزاین‌سیستم، توکن‌های طراحی و پروتوتایپ تعاملی هماهنگ با دیزاین‌پک رُکاد.`,
    rules: 'ارسال لینک عمومی فایل فیگما (با دسترسی Comment/View) + پروتوتایپ قابل تست + گزارش روند طراحی.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Figma', 'UI/UX Design', 'Neobrutalism', 'Design System', 'Prototyping'],
  },
  {
    slug: 'project-07-visual-identity',
    title: 'هویت بصری و برندینگ کامل رُکاد',
    description: 'خلق یک هویت بصری منسجم نئوبروتالیسم شامل طراحی لوگو، پالت رنگ، تایپوگرافی، کتابچه راهنما (Brand Guidelines) و ماک‌آپ‌ها',
    department: ClubDepartment.ARTIST,
    packageFile: 'project-07-visual-identity.zip',
    driveUrl: 'https://drive.google.com/file/d/1P4QNARsVT1aOeytde9jpu6NjMh0A6L-M/view?usp=drive_link',
    missionBrief: `ساخت یک سیستم هویت بصری کامل برای یکی از سه برند معرفی‌شده در بریف، در سبک مدرن نئوبروتالیسم و مینیمال، شامل طراحی لوگو (اصلی، مونوکروم و آیکون)، دفترچه راهنمای برند (Brand Guideline PDF)، سیستم رنگ و فونت فارسی و پیاده‌سازی روی حداقل ۵ ماک‌آپ متنوع.`,
    rules: 'ارسال فایل PDF گایدلاین برند + تصاویر باکیفیت ماک‌آپ‌ها و فایل‌های برداری لوگو.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Branding', 'Logo Design', 'Brand Guidelines', 'Mockups', 'Typography'],
  },
  {
    slug: 'project-08-scriptwriting',
    title: 'سناریونویسی و فیلمنامه‌نویسی داستانی',
    description: 'نگارش ۳ سناریوی کامل، قابل تولید و جذاب برای یک سری ویدیویی هدفمند همراه با کتابچه سری (Series Bible)',
    department: ClubDepartment.JACK_OF_ALL_TRADES,
    packageFile: 'project-08-scriptwriting.zip',
    driveUrl: 'https://drive.google.com/file/d/1tI6H0raBIR_fOrIjQzylirDeYim88_u8/view?usp=drive_link',
    missionBrief: `نگارش سه سناریوی کامل، هم‌سبک و استاندارد برای یک سری ویدیویی رُکاد که هر قسمت یک زاویه از زیست‌بوم آموزش و شتاب‌دهی رُکاد را با روایتی گیرا بیان کند. شامل طراحی دنیا و لحن (Series Bible)، شرح صحنه‌ها، دیالوگ‌ها و یادداشت‌های اجرایی برای کارگردان.`,
    rules: 'ارسال فایل PDF استاندارد سناریوها + مستند بایبل سری (۱ الی ۲ صفحه) + گزارش کار.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Scriptwriting', 'Storytelling', 'Series Bible', 'Creative Writing'],
  },
  {
    slug: 'project-09-content-series',
    title: 'راه‌اندازی سری محتوایی شبکه‌های اجتماعی',
    description: 'طراحی و پایه‌گذاری یک جریان محتوایی استراتژیک برای رُکاد شامل استراتژی مکتوب، تقویم انتشار ۲ هفته‌ای و تولید نمونه کامل',
    department: ClubDepartment.JACK_OF_ALL_TRADES,
    packageFile: 'project-09-content-series.zip',
    driveUrl: 'https://drive.google.com/file/d/11rWDN3PD2W_nYsxxklkS7jHC1CObXa0M/view?usp=drive_link',
    missionBrief: `طراحی و راه‌اندازی یک سری محتوایی هدفمند برای رُکاد شامل: ۱) استراتژی مکتوب سری و پرسونای مخاطب، ۲) تقویم محتوایی ۲ هفته‌ای با ریتم مشخص و قلاب‌های جذاب، ۳) تولید حداقل یک قطعه محتوای کامل و استاندارد، ۴) تعریف شاخص‌های سنجش موفقیت (KPIs).`,
    rules: 'ارسال سند استراتژی و تقویم محتوایی + فایل قطعه تولیدشده + گزارش کار.',
    maxDays: 10,
    maxScore: 100,
    type: ClubChallengeType.PLACEMENT,
    tags: ['Content Strategy', 'Content Calendar', 'Social Media', 'Copywriting'],
  },
];
