/**
 * Porscad survey client for the Polls tab.
 * Creates step-by-step forms, submits multi-question answers,
 * and fetches live analytics from Supabase — same endpoints as events.
 */

export type PorscadQuestionType =
  | 'choice'
  | 'picture_choice'
  | 'dropdown'
  | 'yes_no'
  | 'likert'
  | 'nps'
  | 'rating'
  | 'matrix'
  | 'ranking'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone_ir'
  | 'link'
  | 'telegram_id'
  | 'statement'
  | 'group'
  | 'file_upload'
  | 'payment'
  | 'opinion_scale';

const optionTypeSet = new Set<string>([
  'choice',
  'picture_choice',
  'dropdown',
  'likert',
  'ranking',
  'matrix',
]);

export function porscadNeedsOptions(type: string): boolean {
  return optionTypeSet.has(type);
}

export function porscadIsInformational(type: string): boolean {
  return type === 'statement' || type === 'group';
}

export const PORSCAD_QUESTION_TYPES: Array<{
  value: PorscadQuestionType;
  label: string;
  hint: string;
  needsOptions: boolean;
}> = [
  {
    value: 'choice',
    label: 'چندگزینه‌ای (تکی / چندتایی)',
    hint: 'گزینه‌های دلخواه با حداکثر انتخاب',
    needsOptions: true,
  },
  {
    value: 'picture_choice',
    label: 'چندگزینه‌ای تصویری',
    hint: 'انتخاب از میان تصاویر همراه با متن',
    needsOptions: true,
  },
  {
    value: 'dropdown',
    label: 'لیست کشویی (Dropdown)',
    hint: 'انتخاب یکی از فهرست گزینه‌ها',
    needsOptions: true,
  },
  {
    value: 'yes_no',
    label: 'بله / خیر (Yes / No)',
    hint: 'پاسخ دو حالته',
    needsOptions: false,
  },
  {
    value: 'likert',
    label: 'طیفی (مقیاس لیکرت)',
    hint: 'موافقت تا مخالفت روی طیف',
    needsOptions: true,
  },
  {
    value: 'nps',
    label: 'امتیاز وفاداری NPS (۰ تا ۱۰)',
    hint: 'عدد صحیح بین ۰ تا ۱۰',
    needsOptions: false,
  },
  {
    value: 'rating',
    label: 'امتیازدهی ستاره‌ای (Rating)',
    hint: 'از ۱ تا ۵ ستاره',
    needsOptions: false,
  },
  {
    value: 'matrix',
    label: 'ماتریسی (جدول سوالات)',
    hint: 'چند سطر با ستون‌های یکسان',
    needsOptions: true,
  },
  {
    value: 'ranking',
    label: 'اولویت‌دهی / رتبه‌بندی',
    hint: 'مرتب‌سازی گزینه‌ها به ترتیب اولویت',
    needsOptions: true,
  },
  {
    value: 'short_text',
    label: 'متن کوتاه',
    hint: 'پاسخ یک‌خطی',
    needsOptions: false,
  },
  {
    value: 'long_text',
    label: 'متن بلند',
    hint: 'پاراگراف و توضیح کامل',
    needsOptions: false,
  },
  {
    value: 'number',
    label: 'عدد',
    hint: 'ورودی عددی',
    needsOptions: false,
  },
  {
    value: 'email',
    label: 'ایمیل',
    hint: 'با اعتبارسنجی فرمت ایمیل',
    needsOptions: false,
  },
  {
    value: 'phone_ir',
    label: 'شماره موبایل ایران',
    hint: 'با اعتبارسنجی 09xxxxxxxxx',
    needsOptions: false,
  },
  {
    value: 'link',
    label: 'لینک / وب‌سایت',
    hint: 'آدرس اینترنتی معتبر',
    needsOptions: false,
  },
  {
    value: 'telegram_id',
    label: 'آیدی تلگرام',
    hint: 'آیدی تلگرام با @',
    needsOptions: false,
  },
  {
    value: 'statement',
    label: 'متن بدون پاسخ (توضیحی)',
    hint: 'پیام راهنما بدون دریافت ورودی',
    needsOptions: false,
  },
  {
    value: 'group',
    label: 'گروه سوال / بخش‌بندی',
    hint: 'جداکننده و تیتر دسته‌بندی',
    needsOptions: false,
  },
  {
    value: 'file_upload',
    label: 'آپلود فایل',
    hint: 'بارگذاری تصویر یا سند',
    needsOptions: false,
  },
  {
    value: 'payment',
    label: 'درگاه پرداخت',
    hint: 'دریافت وجه (فقط نمایش مبلغ در نظرسنجی)',
    needsOptions: false,
  },
  {
    value: 'opinion_scale',
    label: 'مقیاس نظری ۱ تا ۱۰',
    hint: 'عدد صحیح بین ۱ تا ۱۰',
    needsOptions: false,
  },
];

export interface SurveyQuestion {
  type: PorscadQuestionType;
  title: string;
  description?: string;
  options?: string[];
  maxSelections?: number;
  required?: boolean;
  displayMode?: 'buttons' | 'list';
  porscadQuestionId?: string | null;
}

export interface PorscadCreatedForm {
  formId: string;
  formPublicId?: string;
  questionIds: string[];
}

export type PorscadFormStatePatch = Partial<{
  published: boolean;
  archived: boolean;
  deleted_at: string | null;
}>;

const SUPABASE_URL = 'https://pivwmyacpxdywevccpmw.supabase.co/rest/v1';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjI1NTEsImV4cCI6MjEwMzIzODU1MX0.kJVVLPH7qu0X73r0qegGx8G_SOMtgiimDjyHetfz4Os';

/** Fixed service token for polls integration (not user-editable). */
const PORSCAD_SERVICE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjozMzY2OTczNzQ1LCJpYXQiOjE3OTAxNzM3NDUsImlzcyI6InN1cGFiYXNlIiwic3ViIjoiNzA0NWVkYzYtNjk3ZC00ZWY4LWI0MDYtNmU4NGI2MTUyYmUzIiwiZW1haWwiOiJhZG1pbkBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc5MDE3Mzc0NX1dLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.XQTtdM9TKYptyWY-shwTLogeNYo9PebUMi8OWzIOBvg';

export type SurveyAnswerValue = string | number | boolean | string[];
export type SurveyAnswers = Record<string, SurveyAnswerValue>;

export class PorscadSurveyClient {
  public getToken(): string {
    return PORSCAD_SERVICE_TOKEN;
  }

  /** Kept for API compatibility; the service token is fixed. */
  public setToken(_token: string): void {
    // no-op — fixed token
  }

  private getHeaders(customToken?: string) {
    const token = customToken || this.getToken();
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  public async testConnection(
    token?: string,
  ): Promise<{ success: boolean; message: string; user?: any }> {
    const activeToken = token || this.getToken();
    if (!activeToken) {
      return {
        success: false,
        message: 'توکن دسترسی پرس‌کاد تنظیم نشده است.',
      };
    }

    try {
      const res = await fetch(
        'https://pivwmyacpxdywevccpmw.supabase.co/auth/v1/user',
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${activeToken}`,
          },
        },
      );

      if (res.ok) {
        const user = await res.json();
        return {
          success: true,
          message: `اتصال برقرار شد (${user.email || 'کاربر پرس‌کاد'})`,
          user,
        };
      }

      const err = await res.json();
      if (err.message === 'JWT expired') {
        return {
          success: false,
          message: 'توکن پرس‌کاد منقضی شده؛ لطفاً دوباره وارد شوید.',
        };
      }
      return {
        success: false,
        message: err.msg || err.message || 'خطا در احراز توکن پرس‌کاد',
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'خطا در اتصال به پرس‌کاد: ' + (e?.message || ''),
      };
    }
  }

  private async resolveUserId(token: string): Promise<string> {
    let userId = '6d939d65-cf93-4786-b70c-6bd895b642a6';
    try {
      const userRes = await fetch(
        'https://pivwmyacpxdywevccpmw.supabase.co/auth/v1/user',
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData?.id) userId = userData.id;
      } else {
        const errJson = await userRes.json();
        if (errJson.message === 'JWT expired') {
          throw new Error('توکن پرس‌کاد منقضی شده است.');
        }
        throw new Error(
          errJson.msg || errJson.message || 'احراز هویت پرس‌کاد ناموفق بود',
        );
      }
    } catch (err: any) {
      throw new Error(err.message || 'احراز هویت پرس‌کاد ناموفق بود');
    }
    return userId;
  }

  /**
   * Create a step-by-step survey form with one row per question in Porscad.
   */
  public async createSurveyForm(params: {
    title: string;
    description?: string;
    questions: SurveyQuestion[];
  }): Promise<PorscadCreatedForm> {
    const token = this.getToken();
    if (!token) {
      throw new Error(
        'برای ساخت فرم در پرس‌کاد ابتدا توکن دسترسی را وارد کنید.',
      );
    }

    const userId = await this.resolveUserId(token);
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const formSlug = `form-${randomSuffix}`;
    const publicId = `fr_${Math.random().toString(36).substring(2, 12)}`;

    const createFormRes = await fetch(`${SUPABASE_URL}/forms`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        title: params.title,
        description: params.description || '',
        published: true,
        created_by: userId,
        manager_id: userId,
        form_type: 'step_by_step',
        slug: formSlug,
        public_id: publicId,
        settings: {
          prevent_duplicate: true,
        },
      }),
    });

    if (!createFormRes.ok) {
      const err = await createFormRes.json();
      throw new Error(
        `ساخت فرم پرس‌کاد ناموفق بود: ${err.message || err.details || 'خطای ناشناخته'}`,
      );
    }

    const forms = await createFormRes.json();
    if (!Array.isArray(forms) || forms.length === 0) {
      throw new Error('پاسخ نامعتبر از پرس‌کاد دریافت شد.');
    }

    const formId = forms[0].id;
    const formPublicId = forms[0].public_id || publicId;
    const questionIds: string[] = [];

    for (let i = 0; i < params.questions.length; i++) {
      const q = params.questions[i];
      const createQRes = await fetch(`${SUPABASE_URL}/questions`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          form_id: formId,
          type: q.type,
          title: q.title,
          description: q.description || '',
          required: q.required ?? true,
          options: q.options || [],
          max_selections: q.maxSelections || 1,
          display_mode: q.displayMode || 'buttons',
          position: i,
        }),
      });

      if (!createQRes.ok) {
        const err = await createQRes.json();
        throw new Error(
          `ساخت سوال «${q.title}» در پرس‌کاد ناموفق بود: ${err.message || ''}`,
        );
      }

      const questions = await createQRes.json();
      const qid =
        Array.isArray(questions) && questions.length > 0
          ? questions[0].id
          : `q_${Date.now()}_${i}`;
      questionIds.push(qid);
    }

    return { formId, formPublicId, questionIds };
  }

  /**
   * Sync form lifecycle state to Porscad (published / archived / soft-delete).
   * Returns false when no token or form is missing — caller treats as best-effort.
   */
  public async updateFormState(
    formId: string | null | undefined,
    patch: PorscadFormStatePatch,
  ): Promise<boolean> {
    if (!formId) return false;
    const token = this.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${SUPABASE_URL}/forms?id=eq.${formId}`, {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          ...patch,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Soft-delete (trash) the linked Porscad form after local poll delete.
   */
  public async trashForm(formId: string | null | undefined): Promise<boolean> {
    if (!formId) return false;
    const token = this.getToken();
    if (!token) return false;

    const nowIso = new Date().toISOString();
    return this.updateFormState(formId, {
      published: false,
      deleted_at: nowIso,
    });
  }

  /**
   * Submit all step-by-step answers via the public RPC used by events voting.
   * Keys of pAnswers are Porscad question ids (or index fallbacks).
   */
  public async submitSurveyAnswers(params: {
    formPublicId: string;
    formId: string;
    questionIds: string[];
    questions: SurveyQuestion[];
    answersByIndex: SurveyAnswers;
    respondentName: string;
  }): Promise<{ success: boolean; message?: string; responseId?: string }> {
    const token = this.getToken();
    const pAnswers: Record<string, any> = {};

    params.questions.forEach((q, index) => {
      const raw = params.answersByIndex[String(index)];
      if (raw === undefined || raw === null || raw === '') return;
      const key = params.questionIds[index] || String(index);
      pAnswers[key] = raw;
    });

    if (Object.keys(pAnswers).length === 0) {
      return { success: false, message: 'هیچ پاسخی ثبت نشده است.' };
    }

    try {
      const rpcRes = await fetch(`${SUPABASE_URL}/rpc/submit_public_response`, {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          p_form_public_id: params.formPublicId || params.formId,
          p_answers: pAnswers,
          p_meta: {
            source: 'Rokad-Platform-Polls',
            voter: params.respondentName,
            startedAt: new Date(Date.now() - 10000).toISOString(),
            completedAt: new Date().toISOString(),
          },
          p_times: {},
        }),
      });

      if (!rpcRes.ok) {
        let errMsg = 'ثبت پاسخ در پرس‌کاد ناموفق بود';
        try {
          const errJson = await rpcRes.json();
          errMsg = errJson.message || errJson.msg || errMsg;
        } catch {
          errMsg = `HTTP ${rpcRes.status}`;
        }
        return { success: false, message: errMsg };
      }

      const data = await rpcRes.json().catch(() => ({}));
      const responseId = data?.responseId || data?.response_id;
      return { success: true, responseId };
    } catch (e: any) {
      return {
        success: false,
        message: `خطا در ارسال به پرس‌کاد: ${e?.message || 'اتصال برقرار نشد'}`,
      };
    }
  }

  /**
   * GET live analytics: answers for each remote question id.
   * Only data returned by Porscad is used — no invented metrics.
   */
  public async fetchLiveAnalytics(params: {
    questionIds: string[];
    questions: SurveyQuestion[];
    optionsByQuestionIndex?: Record<string, string[]>;
  }): Promise<{
    totalRespondents: number;
    perQuestion: Array<{
      index: number;
      title: string;
      type: string;
      answered: number;
      options: Array<{ text: string; count: number; percentage: number }>;
      avgRating: number | null;
      rawValues?: Array<{ value: any; count: number }>;
    }>;
    respondents: Array<{ name?: string; completedAt?: string }>;
  }> {
    const ids = params.questionIds.filter(Boolean);
    const empty = {
      totalRespondents: 0,
      perQuestion: [],
      respondents: [],
    };
    if (ids.length === 0) return empty;

    const answersRes = await fetch(
      `${SUPABASE_URL}/answers?question_id=in.("${ids.join('","')}")&select=value,meta,question_id,created_at`,
      { headers: this.getHeaders() },
    );

    if (!answersRes.ok) {
      throw new Error(`HTTP ${answersRes.status}`);
    }

    const rows = await answersRes.json();
    if (!Array.isArray(rows)) {
      throw new Error('پاسخ نامعتبر از پرس‌کاد');
    }

    const respondents: Array<{ name?: string; completedAt?: string }> = [];
    const byQuestion: Record<
      string,
      { counts: Map<string, number>; nums: number[]; answered: number; values: Map<string, number> }
    > = {};

    for (const id of ids) {
      byQuestion[id] = {
        counts: new Map(),
        nums: [],
        answered: 0,
        values: new Map(),
      };
    }

    const seenRespondents = new Set<string>();

    for (const row of rows) {
      const qid = row.question_id;
      const bucket = byQuestion[qid];
      if (!bucket) continue;
      bucket.answered += 1;

      const val = row.value;
      if (typeof val === 'number') {
        bucket.nums.push(val);
        const key = String(val);
        bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
      } else if (Array.isArray(val)) {
        for (const v of val) {
          const key = String(v);
          bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
        }
      } else if (val !== null && val !== undefined && val !== '') {
        const key = String(val);
        bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
      }

      const meta = row.meta;
      const name =
        (meta && (meta.voter || meta.name)) || undefined;
      const completedAt = row.created_at;
      const dedupeKey = `${name || ''}|${completedAt || ''}|${qid}`;
      if (name && !seenRespondents.has(dedupeKey)) {
        seenRespondents.add(dedupeKey);
        respondents.push({ name, completedAt });
      }
    }

    const perQuestion = params.questions.map((q, index) => {
      const id = params.questionIds[index];
      const bucket = byQuestion[id] || {
        counts: new Map(),
        nums: [],
        answered: 0,
        values: new Map(),
      };

      const baseOptions = (q.options || []).map((text) => ({
        text,
        count: bucket.counts.get(text) || 0,
      }));

      bucket.counts.forEach((count, text) => {
        if (!baseOptions.find((o) => o.text === text)) {
          baseOptions.push({ text, count });
        }
      });

      const answered = bucket.answered;
      const options = baseOptions
        .map((o) => ({
          text: o.text,
          count: o.count,
          percentage:
            answered > 0 ? Math.round((o.count / answered) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const avgRating =
        bucket.nums.length > 0
          ? Number(
              (
                bucket.nums.reduce((s, n) => s + n, 0) / bucket.nums.length
              ).toFixed(2),
            )
          : null;

      return {
        index,
        title: q.title,
        type: q.type,
        answered,
        options,
        avgRating,
      };
    });

    const uniqueNames = new Set(
      respondents.map((r) => r.name).filter(Boolean),
    );
    const totalRespondents = uniqueNames.size || rows.length;

    return { totalRespondents, perQuestion, respondents };
  }

  /**
   * When no remote link exists, aggregate from locally stored admin view only.
   */
  public summarizeLocal(
    questions: SurveyQuestion[],
    localResponses: Array<Record<string, any>>,
  ) {
    const perQuestion = questions.map((q, index) => {
      const counts = new Map<string, number>();
      const nums: number[] = [];
      let answered = 0;

      for (const resp of localResponses) {
        const raw = resp?.answers?.[String(index)];
        if (raw === undefined || raw === null || raw === '') continue;
        answered += 1;
        if (typeof raw === 'number') {
          nums.push(raw);
          const key = String(raw);
          counts.set(key, (counts.get(key) || 0) + 1);
        } else if (Array.isArray(raw)) {
          for (const item of raw) {
            const key = String(item);
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        } else {
          const key = String(raw);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }

      const options = (q.options || []).map((text) => ({
        text,
        count: counts.get(text) || 0,
        percentage:
          answered > 0
            ? Math.round(((counts.get(text) || 0) / answered) * 100)
            : 0,
      }));

      counts.forEach((count, text) => {
        if (!options.find((o) => o.text === text)) {
          options.push({
            text,
            count,
            percentage:
              answered > 0 ? Math.round((count / answered) * 100) : 0,
          });
        }
      });

      return {
        index,
        title: q.title,
        type: q.type,
        answered,
        options: options.sort((a, b) => b.count - a.count),
        avgRating:
          nums.length > 0
            ? Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2))
            : null,
      };
    });

    return {
      totalRespondents: localResponses.length,
      perQuestion,
      respondents: localResponses.map((r) => ({
        name: r.respondentName,
        completedAt: r.createdAt,
      })),
    };
  }
}

export const porscadSurvey = new PorscadSurveyClient();
