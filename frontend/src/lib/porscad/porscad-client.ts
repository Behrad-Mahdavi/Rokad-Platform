/**
 * Porscad (پرس‌کاد) Service Client
 * Full Live Integration with Porscad Supabase & Web Service
 * Allows Admin to build custom surveys based on selected ideas
 */

export interface PorscadOption {
  id: string;
  ideaId?: string;
  text: string;
  authorName?: string;
  voteCount: number;
  percentage?: number;
}

export interface PorscadQuestionSettings {
  questionType: 'choice' | 'rating' | 'dropdown' | 'opinion_scale' | 'yes_no';
  maxSelections: number; // حداکثر انتخاب‌های مجاز هر کاربر (1 تا N)
  displayMode: 'buttons' | 'list';
  required: boolean;
  allowChangeVote: boolean;
}

export type PorscadDisplayOrder = 'RANK' | 'RANK_VOTES' | 'RANDOM' | 'IGNORE_RANK';

export interface PorscadPollData {
  formId: string;
  formPublicId?: string;
  questionId: string;
  title: string;
  questionTitle: string;
  description?: string;
  selectedIdeaIds: string[];
  options: PorscadOption[];
  settings: PorscadQuestionSettings;
  totalVotes: number;
  totalRespondents: number;
  isPublished: boolean;
  isClosed: boolean;
  isResultsPublic?: boolean;
  showVoteCounts?: boolean;
  displayOrder?: PorscadDisplayOrder;
  topWinnersCount?: number;
  closedAt?: string;
  winningOptionId?: string;
  winningOptionIds?: string[];
  syncStatus: 'LOCAL_SYNCED' | 'PORSCAD_CLOUD_SYNCED';
  porscadToken?: string;
  createdAt: string;
}

export interface CreateCustomPollParams {
  eventId: string;
  eventTitle: string;
  formTitle?: string;
  formDescription?: string;
  questionTitle: string;
  questionType: 'choice' | 'rating' | 'dropdown' | 'opinion_scale' | 'yes_no';
  selectedIdeas: Array<{ id: string; title: string; authorName: string; description?: string }>;
  maxSelections: number;
  displayMode?: 'buttons' | 'list';
  required?: boolean;
}

export interface PorscadVoteResult {
  success: boolean;
  message?: string;
  responseId?: string;
  updatedPoll?: PorscadPollData;
}

const SUPABASE_URL = 'https://pivwmyacpxdywevccpmw.supabase.co/rest/v1';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjI1NTEsImV4cCI6MjEwMzIzODU1MX0.kJVVLPH7qu0X73r0qegGx8G_SOMtgiimDjyHetfz4Os';

export class PorscadService {
  private getStorageKey(eventId: string) {
    return `rokad_porscad_poll_${eventId}`;
  }

  public getToken(): string {
    try {
      const customToken = localStorage.getItem('rokad_porscad_token');
      if (customToken) return customToken.trim();

      const porscadAuth = localStorage.getItem('sb-pivwmyacpxdywevccpmw-auth-token');
      if (porscadAuth) {
        const parsed = JSON.parse(porscadAuth);
        if (parsed?.access_token) return parsed.access_token;
      }
    } catch {
      // ignore
    }
    return '';
  }

  public setToken(token: string): void {
    localStorage.setItem('rokad_porscad_token', token.trim());
  }

  public getHeaders(customToken?: string) {
    const token = customToken || this.getToken();
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  public async testConnection(token?: string): Promise<{ success: boolean; message: string; user?: any }> {
    const activeToken = token || this.getToken();
    if (!activeToken) {
      return { success: false, message: 'توکن پرس‌کاد وارد نشده است.' };
    }

    try {
      const res = await fetch('https://pivwmyacpxdywevccpmw.supabase.co/auth/v1/user', {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.ok) {
        const user = await res.json();
        return { success: true, message: `اتصال برقرار است (کاربر: ${user.email})`, user };
      } else {
        const err = await res.json();
        return {
          success: false,
          message: err.message === 'JWT expired' ? 'توکن منقضی شده است (JWT expired). لطفاً توکن جدید از پرس‌کاد کپی کنید.' : (err.msg || err.message || 'خطا در احراز هویت توکن'),
        };
      }
    } catch (e: any) {
      return { success: false, message: 'خطای ارتباط با سرور پرس‌کاد: ' + (e?.message || '') };
    }
  }

  public getLocalPollData(eventId: string): PorscadPollData | null {
    try {
      const saved = localStorage.getItem(this.getStorageKey(eventId));
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse Porscad local poll', e);
    }
    return null;
  }

  public saveLocalPollData(eventId: string, poll: PorscadPollData): void {
    try {
      localStorage.setItem(this.getStorageKey(eventId), JSON.stringify(poll));
    } catch (e) {
      console.error('Failed to save Porscad local poll', e);
    }
  }

  /**
   * Admin creates a custom Porscad form with chosen ideas, question type, and max selections
   */
  public async createCustomPorscadForm(params: CreateCustomPollParams): Promise<PorscadPollData> {
    const {
      eventId,
      eventTitle,
      formTitle,
      formDescription,
      questionTitle,
      questionType,
      selectedIdeas,
      maxSelections,
      displayMode = 'buttons',
      required = true,
    } = params;

    const token = this.getToken();
    if (!token) {
      throw new Error('توکن احراز هویت پرس‌کاد موجود نیست. لطفاً ابتدا توکن خود را در بخش «تنظیمات توکن پرس‌کاد» وارد نمایید.');
    }

    // First, verify user info from token
    let userId = '6d939d65-cf93-4786-b70c-6bd895b642a6';
    try {
      const userRes = await fetch('https://pivwmyacpxdywevccpmw.supabase.co/auth/v1/user', {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData?.id) userId = userData.id;
      } else {
        const errJson = await userRes.json();
        if (errJson.message === 'JWT expired') {
          throw new Error('توکن پرس‌کاد منقضی شده است (JWT expired). لطفاً توکن جدید را از پرس‌کاد دریافت و در تنظیمات ذخیره کنید.');
        }
        throw new Error(errJson.msg || errJson.message || 'خطا در اعتبارسنجی توکن با سرور پرس‌کاد');
      }
    } catch (err: any) {
      throw new Error(err.message || 'خطا در ارتباط با سرور پرس‌کاد');
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const formSlug = `form-${randomSuffix}`;
    const publicId = `fr_${Math.random().toString(36).substring(2, 12)}`;

    const optionLabels = selectedIdeas.map((i) => `ایده: ${i.title} (${i.authorName})`);

    const finalFormTitle = formTitle?.trim() || `نظرسنجی ایده‌های رویداد: ${eventTitle}`;
    const finalFormDesc = formDescription?.trim() || `فرم رسمی داوری و رای‌گیری ایده‌های منتخب رویداد «${eventTitle}»`;

    const createFormRes = await fetch(`${SUPABASE_URL}/forms`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        title: finalFormTitle,
        description: finalFormDesc,
        published: true,
        created_by: userId,
        manager_id: userId,
        form_type: 'step_by_step',
        slug: formSlug,
        public_id: publicId,
        settings: {
          max_selections: maxSelections,
          prevent_duplicate: false,
        },
      }),
    });

    if (!createFormRes.ok) {
      const err = await createFormRes.json();
      throw new Error(`خطای ایجاد فرم در پرس‌کاد: ${err.message || err.details || 'عدم دسترسی'}`);
    }

    const forms = await createFormRes.json();
    if (!Array.isArray(forms) || forms.length === 0) {
      throw new Error('پاسخ معتبری از پرس‌کاد برای فرم ایجاد شده دریافت نشد.');
    }

    const formId = forms[0].id;
    const formPublicId = forms[0].public_id;

    const createQRes = await fetch(`${SUPABASE_URL}/questions`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        form_id: formId,
        type: questionType,
        title: questionTitle || `کدام ایده یا ایده‌ها شایسته انتخاب هستند؟ (حداکثر ${maxSelections} انتخاب)`,
        description: 'بر اساس نوآوری، خلاقیت و ارزش کاربردی ایده منتخب خود را تعیین کنید.',
        required,
        options: optionLabels,
        max_selections: maxSelections,
        display_mode: displayMode,
        position: 0,
      }),
    });

    if (!createQRes.ok) {
      const err = await createQRes.json();
      throw new Error(`فرم ساخته شد اما ایجاد سوال با خطا مواجه شد: ${err.message || ''}`);
    }

    const questions = await createQRes.json();
    const questionId = Array.isArray(questions) && questions.length > 0 ? questions[0].id : `q_${Date.now()}`;

    const options: PorscadOption[] = selectedIdeas.map((idea, index) => ({
      id: idea.id || `opt_${index + 1}`,
      ideaId: idea.id,
      text: `ایده: ${idea.title} (${idea.authorName})`,
      authorName: idea.authorName,
      voteCount: 0,
      percentage: 0,
    }));

    const pollData: PorscadPollData = {
      formId,
      formPublicId,
      questionId,
      title: `نظرسنجی ایده‌های رویداد: ${eventTitle}`,
      questionTitle: questionTitle || `کدام ایده یا ایده‌ها شایسته انتخاب هستند؟`,
      description: `هر شرکت‌کننده می‌تواند حداکثر ${maxSelections === 1 ? '۱ ایده' : `${maxSelections} ایده`} را انتخاب نماید.`,
      selectedIdeaIds: selectedIdeas.map((i) => i.id),
      options,
      settings: {
        questionType,
        maxSelections,
        displayMode,
        required,
        allowChangeVote: true,
      },
      totalVotes: 0,
      totalRespondents: 0,
      isPublished: true,
      isClosed: false,
      syncStatus: 'PORSCAD_CLOUD_SYNCED',
      showVoteCounts: false,
      displayOrder: 'RANK',
      createdAt: new Date().toISOString(),
    };

    this.saveLocalPollData(eventId, pollData);
    return pollData;
  }

  /**
   * Fetch Live Analytics and Answers from Porscad Cloud
   * Throws when a real remote question exists but GET fails, so callers can surface the error.
   */
  public async fetchLiveAnalytics(eventId: string): Promise<PorscadPollData | null> {
    const poll = this.getLocalPollData(eventId);
    if (!poll) return null;

    if (!poll.questionId || poll.questionId.startsWith('porscad_q_')) {
      return poll;
    }

    try {
      const answersRes = await fetch(
        `${SUPABASE_URL}/answers?question_id=eq.${poll.questionId}&select=value`,
        { headers: this.getHeaders() }
      );

      if (!answersRes.ok) {
        throw new Error(`HTTP ${answersRes.status}`);
      }

      const answersData = await answersRes.json();
      if (!Array.isArray(answersData)) {
        throw new Error('Invalid answers payload from Porscad');
      }

      const cloudVoteCounts: Record<string, number> = {};
      for (const item of answersData) {
        const val = item.value;
        if (Array.isArray(val)) {
          for (const v of val) {
            cloudVoteCounts[v] = (cloudVoteCounts[v] || 0) + 1;
          }
        } else if (typeof val === 'string') {
          cloudVoteCounts[val] = (cloudVoteCounts[val] || 0) + 1;
        }
      }

      const updatedOptions = poll.options.map((opt) => {
        // Remote Porscad/Supabase answers are the source of truth once GET succeeds
        const votes = cloudVoteCounts[opt.text] ?? 0;
        return { ...opt, voteCount: votes };
      });

      const newTotal = updatedOptions.reduce((sum, o) => sum + o.voteCount, 0);
      const optionsWithPct = updatedOptions.map((opt) => ({
        ...opt,
        percentage: newTotal > 0 ? Math.round((opt.voteCount / newTotal) * 100) : 0,
      }));

      const updatedPoll: PorscadPollData = {
        ...poll,
        options: optionsWithPct,
        totalVotes: newTotal,
        totalRespondents: answersData.length,
      };

      this.saveLocalPollData(eventId, updatedPoll);
      return updatedPoll;
    } catch (e) {
      console.warn('Failed to fetch live analytics from cloud:', e);
      throw e instanceof Error ? e : new Error('Failed to fetch live analytics from Porscad');
    }
  }

  /**
   * Submit a student vote to Porscad Cloud RPC & Local Storage
   */
  public async submitVote(
    eventId: string,
    selectedOptionIds: string[],
    voterName: string = 'دانش‌آموز'
  ): Promise<PorscadVoteResult> {
    const poll = this.getLocalPollData(eventId);
    if (!poll) {
      return { success: false, message: 'نظرسنجی هنوز ایجاد نشده است.' };
    }

    if (poll.isClosed) {
      return { success: false, message: 'نظرسنجی به پایان رسیده و ثبت رای مسدود است.' };
    }

    if (selectedOptionIds.length === 0) {
      return { success: false, message: 'لطفاً حداقل یک گزینه را انتخاب کنید.' };
    }

    if (selectedOptionIds.length > poll.settings.maxSelections) {
      return {
        success: false,
        message: `شما حداکثر می‌توانید ${poll.settings.maxSelections} ایده را انتخاب نمایید.`,
      };
    }

    const prevVotedStr = localStorage.getItem(`rokad_porscad_voted_${eventId}`);
    const prevVoted: string[] = prevVotedStr ? JSON.parse(prevVotedStr) : [];

    const updatedOptions = poll.options.map((opt) => {
      let count = opt.voteCount;
      if (prevVoted.includes(opt.id) && !selectedOptionIds.includes(opt.id)) {
        count = Math.max(0, count - 1);
      }
      if (selectedOptionIds.includes(opt.id) && !prevVoted.includes(opt.id)) {
        count = count + 1;
      }
      return { ...opt, voteCount: count };
    });

    const newTotal = updatedOptions.reduce((sum, o) => sum + o.voteCount, 0);
    const optionsWithPct = updatedOptions.map((opt) => ({
      ...opt,
      percentage: newTotal > 0 ? Math.round((opt.voteCount / newTotal) * 100) : 0,
    }));

    const updatedPoll: PorscadPollData = {
      ...poll,
      options: optionsWithPct,
      totalVotes: newTotal,
      totalRespondents: (poll.totalRespondents || 0) + (prevVoted.length === 0 ? 1 : 0),
    };

    // Submit to Porscad Cloud first — only persist locally after success
    let responseId: string | undefined;
    try {
      const selectedLabels = updatedOptions
        .filter((o) => selectedOptionIds.includes(o.id) || selectedOptionIds.includes(o.ideaId || ''))
        .map((o) => o.text);

      const pAnswers: Record<string, any> = {};
      pAnswers[poll.questionId] = poll.settings.maxSelections === 1 ? selectedLabels[0] : selectedLabels;

      const rpcRes = await fetch(`${SUPABASE_URL}/rpc/submit_public_response`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          p_form_public_id: poll.formPublicId || poll.formId,
          p_answers: pAnswers,
          p_meta: {
            source: 'Rokad-Platform-Events',
            voter: voterName,
            selectedCount: selectedOptionIds.length,
            startedAt: new Date(Date.now() - 10000).toISOString(),
            completedAt: new Date().toISOString(),
          },
          p_times: {},
        }),
      });

      if (!rpcRes.ok) {
        let errMsg = 'ثبت رای در پرس‌کاد ناموفق بود';
        try {
          const errJson = await rpcRes.json();
          errMsg = errJson.message || errJson.msg || errMsg;
        } catch {
          errMsg = `HTTP ${rpcRes.status}`;
        }
        return {
          success: false,
          message: `خطا در ارسال رای به پرس‌کاد: ${errMsg}`,
        };
      }

      const data = await rpcRes.json().catch(() => ({}));
      responseId = data?.responseId || data?.response_id;
    } catch (e: any) {
      console.error('Porscad submission failed:', e);
      return {
        success: false,
        message: `خطا در ارسال رای به پرس‌کاد: ${e?.message || 'ارتباط برقرار نشد'}`,
      };
    }

    localStorage.setItem(`rokad_porscad_voted_${eventId}`, JSON.stringify(selectedOptionIds));

    // After a successful POST, always re-GET live analytics so displayed results
    // come from Porscad/Supabase (including votes made outside this browser).
    let finalPoll = updatedPoll;
    try {
      const remotePoll = await this.fetchLiveAnalytics(eventId);
      if (remotePoll) {
        finalPoll = { ...remotePoll, isClosed: poll.isClosed };
        this.saveLocalPollData(eventId, finalPoll);
      } else {
        this.saveLocalPollData(eventId, updatedPoll);
      }
    } catch (e) {
      console.warn('Live analytics refresh after vote failed, using optimistic counts:', e);
      this.saveLocalPollData(eventId, updatedPoll);
    }

    return {
      success: true,
      message: `رای شما (${selectedOptionIds.length} انتخاب) با موفقیت در پرس‌کاد ثبت شد!`,
      responseId,
      updatedPoll: finalPoll,
    };
  }

  /**
   * Finish Assessment & Determine Top N Winners with display order options
   */
  public async finishAssessmentAndDetermineWinner(
    eventId: string,
    topCount: number = 3,
    options?: {
      showVoteCounts?: boolean;
      displayOrder?: PorscadDisplayOrder;
      isResultsPublic?: boolean;
    }
  ): Promise<PorscadPollData | null> {
    let poll = this.getLocalPollData(eventId);
    if (!poll) return null;

    // GET remote results first so winners are based on Porscad/Supabase, not local cache
    if (poll.questionId && !poll.questionId.startsWith('porscad_q_')) {
      try {
        const remote = await this.fetchLiveAnalytics(eventId);
        if (remote) poll = { ...remote, isClosed: poll.isClosed };
      } catch (e) {
        console.warn('Pre-finish live analytics GET failed, using local counts:', e);
      }
    }

    const sorted = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
    const topWinners = sorted.slice(0, Math.min(topCount, sorted.length));
    const winningOptionIds = topWinners.map((o) => o.id);

    const displayOrder = options?.displayOrder || 'RANK';
    let ordered = [...sorted];
    if (displayOrder === 'RANDOM') {
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
      }
    } else if (displayOrder === 'IGNORE_RANK') {
      ordered = [...poll.options];
    }

    const updatedPoll: PorscadPollData = {
      ...poll,
      options: ordered,
      isClosed: true,
      closedAt: new Date().toISOString(),
      topWinnersCount: topCount,
      showVoteCounts: options?.showVoteCounts ?? poll.showVoteCounts ?? false,
      displayOrder,
      isResultsPublic: options?.isResultsPublic ?? false,
      winningOptionId: topWinners[0]?.id,
      winningOptionIds,
    };

    this.saveLocalPollData(eventId, updatedPoll);
    return updatedPoll;
  }

  /**
   * Toggle vote count/percentage visibility for the audience (admin checkbox)
   */
  public setShowVoteCounts(eventId: string, show: boolean): PorscadPollData | null {
    const poll = this.getLocalPollData(eventId);
    if (!poll) return null;
    const updatedPoll: PorscadPollData = { ...poll, showVoteCounts: show };
    this.saveLocalPollData(eventId, updatedPoll);
    return updatedPoll;
  }

  /**
   * Edit existing Porscad form/question (do NOT create a new form)
   */
  public async updateExistingPorscadForm(params: {
    eventId: string;
    eventTitle: string;
    formTitle: string;
    formDescription: string;
    questionTitle: string;
    questionType: PorscadQuestionSettings['questionType'];
    selectedIdeas: Array<{ id: string; title: string; authorName: string; description?: string }>;
    maxSelections: number;
  }): Promise<PorscadPollData> {
    const existing = this.getLocalPollData(params.eventId);
    if (!existing || !existing.formId) {
      throw new Error('فرم موجودی برای ویرایش یافت نشد. ابتدا فرم را یک‌بار بسازید.');
    }

    const token = this.getToken();
    if (!token) {
      throw new Error('توکن احراز هویت پرس‌کاد موجود نیست.');
    }

    const optionLabels = params.selectedIdeas.map((i) => `ایده: ${i.title} (${i.authorName})`);

    const patchForm = await fetch(`${SUPABASE_URL}/forms?id=eq.${existing.formId}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        title: params.formTitle,
        description: params.formDescription,
        published: true,
        settings: {
          max_selections: params.maxSelections,
          prevent_duplicate: false,
        },
      }),
    });
    if (!patchForm.ok) {
      const err = await patchForm.json().catch(() => ({}));
      throw new Error(`خطای ویرایش فرم در پرس‌کاد: ${err.message || err.details || patchForm.status}`);
    }

    if (existing.questionId && !existing.questionId.startsWith('porscad_q_')) {
      const patchQ = await fetch(`${SUPABASE_URL}/questions?id=eq.${existing.questionId}`, {
        method: 'PATCH',
        headers: this.getHeaders(token),
        body: JSON.stringify({
          type: params.questionType,
          title: params.questionTitle,
          options: optionLabels,
          max_selections: params.maxSelections,
          display_mode: 'buttons',
          required: true,
        }),
      });
      if (!patchQ.ok) {
        const err = await patchQ.json().catch(() => ({}));
        throw new Error(`خطای ویرایش سوال در پرس‌کاد: ${err.message || err.details || patchQ.status}`);
      }
    }

    const options: PorscadOption[] = params.selectedIdeas.map((idea, index) => {
      const prev = existing.options.find((o) => o.ideaId === idea.id || o.id === idea.id);
      return {
        id: prev?.id || idea.id || `opt_${index + 1}`,
        ideaId: idea.id,
        text: `ایده: ${idea.title} (${idea.authorName})`,
        authorName: idea.authorName,
        voteCount: prev?.voteCount || 0,
        percentage: prev?.percentage || 0,
      };
    });

    const totalVotes = options.reduce((s, o) => s + o.voteCount, 0);
    const withPct = options.map((o) => ({
      ...o,
      percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0,
    }));

    const updated: PorscadPollData = {
      ...existing,
      title: `نظرسنجی ایده‌های رویداد: ${params.eventTitle}`,
      questionTitle: params.questionTitle,
      description: `هر شرکت‌کننده می‌تواند حداکثر ${params.maxSelections === 1 ? '۱ ایده' : `${params.maxSelections} ایده`} را انتخاب نماید.`,
      selectedIdeaIds: params.selectedIdeas.map((i) => i.id),
      options: withPct,
      totalVotes,
      settings: {
        ...existing.settings,
        questionType: params.questionType,
        maxSelections: params.maxSelections,
      },
      isPublished: true,
      syncStatus: 'PORSCAD_CLOUD_SYNCED',
    };

    this.saveLocalPollData(params.eventId, updated);
    return updated;
  }

  /**
   * List all local Porscad polls (admin panel)
   */
  public listLocalPolls(): Array<{ eventId: string; poll: PorscadPollData }> {
    const out: Array<{ eventId: string; poll: PorscadPollData }> = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('rokad_porscad_poll_')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const poll = JSON.parse(raw) as PorscadPollData;
          if (poll && poll.formId) {
            out.push({ eventId: key.replace('rokad_porscad_poll_', ''), poll });
          }
        } catch {
          // skip invalid
        }
      }
    } catch {
      // ignore
    }
    return out.sort((a, b) => (b.poll.createdAt || '').localeCompare(a.poll.createdAt || ''));
  }

  /**
   * Toggle Results Visibility for Students
   */
  public setResultsPublic(eventId: string, isPublic: boolean): PorscadPollData | null {
    const poll = this.getLocalPollData(eventId);
    if (!poll) return null;

    const updatedPoll: PorscadPollData = {
      ...poll,
      isResultsPublic: isPublic,
    };

    this.saveLocalPollData(eventId, updatedPoll);
    return updatedPoll;
  }

  /**
   * Reopen assessment
   */
  public reopenAssessment(eventId: string): PorscadPollData | null {
    const poll = this.getLocalPollData(eventId);
    if (!poll) return null;

    const updatedPoll: PorscadPollData = {
      ...poll,
      isClosed: false,
      isResultsPublic: false,
      closedAt: undefined,
    };

    this.saveLocalPollData(eventId, updatedPoll);
    return updatedPoll;
  }
}

export const porscadClient = new PorscadService();
