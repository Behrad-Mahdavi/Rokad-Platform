import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { apiClient } from '../../../../lib/api/client';
import { toast } from '../../../../components/ui/toast/toast';
import { toPersianDigits } from '../../../../lib/utils';
import {
  AllowedRecipientsData,
  MessageAttachment,
  MessagePriority,
  MessageTargetAudience,
  MessageTargetType,
} from '../types';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  AlertCircle,
  Users,
  Building,
  GraduationCap,
  Shield,
  Search,
  Check,
  UploadCloud,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRecipientId?: string;
  defaultRecipientName?: string;
  defaultSubject?: string;
}

export const ComposeMessageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRecipientId,
  defaultRecipientName,
  defaultSubject,
}) => {
  const [allowed, setAllowed] = useState<AllowedRecipientsData | null>(null);
  const [loadingAllowed, setLoadingAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form State
  const [title, setTitle] = useState(defaultSubject || '');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('NORMAL');
  const [targetType, setTargetType] = useState<MessageTargetType>('INDIVIDUAL');
  const [targetAudience, setTargetAudience] = useState<MessageTargetAudience>('ALL');
  const [targetClassroomId, setTargetClassroomId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    defaultRecipientId ? [defaultRecipientId] : [],
  );
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);

  // User search query for individual selector
  const [userSearch, setUserSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load allowed recipients when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchAllowed = async () => {
      try {
        setLoadingAllowed(true);
        const res = await apiClient.get('/messages/recipients/allowed');
        const data = res.data?.data || res.data;
        setAllowed(data);

        // Auto-select initial target type based on permissions
        if (defaultRecipientId) {
          setTargetType('INDIVIDUAL');
          setSelectedUserIds([defaultRecipientId]);
        } else if (data.canBroadcast) {
          setTargetType('ALL');
        } else if (data.canClassroom && data.classrooms?.length > 0) {
          setTargetType('CLASSROOM');
          setTargetClassroomId(data.classrooms[0].id);
        } else {
          setTargetType('INDIVIDUAL');
        }
      } catch (err: any) {
        toast.error('خطا در دریافت فهرست مخاطبان مجاز');
      } finally {
        setLoadingAllowed(false);
      }
    };

    fetchAllowed();
  }, [isOpen, defaultRecipientId]);

  // Handle file attachment upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 20 * 1024 * 1024) {
      toast.error('حداکثر حجم مجاز هر فایل ۲۰ مگابایت می‌باشد');
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleName', 'messages');

      let fileUrl = '';
      try {
        const uploadRes = await apiClient.post('/storage/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = uploadRes.data?.data || uploadRes.data;
        fileUrl = uploadData?.fileUrl || uploadData?.url;
      } catch {
        // Fallback: convert small file to base64 Data URL so user is never blocked
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: fileUrl,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          size: file.size,
        },
      ]);
      toast.success(`فایل ${file.name} با موفقیت پیوست شد`);
    } catch (err: any) {
      toast.error('خطا در آپلود فایل پیوست');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('لطفاً عنوان و موضوع پیام را وارد فرمایید');
      return;
    }
    if (!body.trim()) {
      toast.error('لطفاً متن پیام را وارد فرمایید');
      return;
    }

    if (targetType === 'INDIVIDUAL' && selectedUserIds.length === 0) {
      toast.error('لطفاً حداقل یک مخاطب برای پیام خود انتخاب کنید');
      return;
    }

    if (targetType === 'CLASSROOM' && !targetClassroomId) {
      toast.error('لطفاً کلاس آموزشی مورد نظر را انتخاب نمایید');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/messages', {
        title: title.trim(),
        body: body.trim(),
        priority,
        targetType,
        targetAudience,
        targetClassroomId: targetType === 'CLASSROOM' ? targetClassroomId : undefined,
        recipientIds: targetType === 'INDIVIDUAL' ? selectedUserIds : undefined,
        attachments,
      });

      toast.success('پیام با موفقیت ارسال گردید');
      onSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'خطا در ارسال پیام';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = (allowed?.users || []).filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase().trim();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const roleName = u.role.toLowerCase();
    const cls = (u.classroomName || '').toLowerCase();
    return fullName.includes(q) || roleName.includes(q) || cls.includes(q);
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold">مدیریت</span>;
      case 'TEACHER':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold">استاد / دبیر</span>;
      case 'STUDENT':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">هنرجو</span>;
      case 'PARENT':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">ولی دانش‌آموز</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 font-bold">کادر</span>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ارسال پیام جدید" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Target Type Selector */}
        {allowed && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              نوع و نحوه ارسال پیام:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allowed.canBroadcast && (
                <button
                  type="button"
                  onClick={() => setTargetType('ALL')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    targetType === 'ALL'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>همگانی (کل مدرسه)</span>
                </button>
              )}

              {allowed.canBroadcast && (
                <button
                  type="button"
                  onClick={() => setTargetType('ROLE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    targetType === 'ROLE'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>بر اساس نقش</span>
                </button>
              )}

              {allowed.canClassroom && allowed.classrooms.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('CLASSROOM');
                    if (!targetClassroomId && allowed.classrooms.length > 0) {
                      setTargetClassroomId(allowed.classrooms[0].id);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    targetType === 'CLASSROOM'
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>کلاس آموزشی</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setTargetType('INDIVIDUAL')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  targetType === 'INDIVIDUAL'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>پیام فردی / مستقیم</span>
              </button>
            </div>
          </div>
        )}

        {/* 1.1 Target Sub-options: ROLE */}
        {targetType === 'ROLE' && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              انتخاب گروه مخاطبان:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'ALL', label: 'تمام اعضای مدرسه' },
                { key: 'TEACHERS', label: 'تمامی دبیران و اساتید' },
                { key: 'STUDENTS', label: 'تمامی دانش‌آموزان' },
                { key: 'PARENTS', label: 'تمامی اولیاء محترم' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTargetAudience(opt.key as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    targetAudience === opt.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1.2 Target Sub-options: CLASSROOM */}
        {targetType === 'CLASSROOM' && allowed && (
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  انتخاب کلاس:
                </label>
                <select
                  value={targetClassroomId}
                  onChange={(e) => setTargetClassroomId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  {allowed.classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.code ? `(${cls.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  گیرندگان درون کلاس:
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">هم دانش‌آموزان و هم اولیاء</option>
                  <option value="STUDENTS">فقط دانش‌آموزان کلاس</option>
                  <option value="PARENTS">فقط اولیای دانش‌آموزان کلاس</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 1.3 Target Sub-options: INDIVIDUAL USER PICKER */}
        {targetType === 'INDIVIDUAL' && (
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                انتخاب گیرنده یا گیرندگان پیام:
              </label>
              <span className="text-[11px] font-mono text-primary font-bold">
                {toPersianDigits(selectedUserIds.length)} مخاطب انتخاب شده
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="جستجوی نام یا نقش کاربر..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400">
                  هیچ کاربری یافت نشد.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleUser(u.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20 text-primary font-bold'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs">
                          {u.firstName} {u.lastName}
                        </span>
                        {u.classroomName && (
                          <span className="text-[10px] text-gray-400">({u.classroomName})</span>
                        )}
                        {u.childName && (
                          <span className="text-[10px] text-gray-400">(ولیِ {u.childName})</span>
                        )}
                      </div>
                      <div>{getRoleBadge(u.role)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 2. Message Title & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
              عنوان و موضوع پیام:
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: دستورالعمل آزمون نوبت اول، هماهنگی کلاس فوق‌العاده..."
              required
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
              درجه اهمیت / اولویت:
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="NORMAL">عادی</option>
              <option value="IMPORTANT">مهم (Important)</option>
              <option value="URGENT">فوری / اضطراری (Urgent)</option>
            </select>
          </div>
        </div>

        {/* 3. Message Body */}
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
            متن پیام:
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            required
            placeholder="متن پیام خود را اینجا بنویسید..."
            className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary leading-relaxed"
          />
        </div>

        {/* 4. Attachments Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-primary" />
              <span>پیوست‌ها (فایل، عکس، اسناد):</span>
            </label>

            <button
              type="button"
              disabled={uploadingFile}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{uploadingFile ? 'در حال آپلود...' : 'افزودن پیوست'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.docx,.xlsx,.zip"
            />
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {att.type === 'image' ? (
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold truncate text-gray-800 dark:text-gray-200">{att.name}</p>
                      {att.size && (
                        <p className="text-[10px] text-gray-400 font-mono">
                          {toPersianDigits((att.size / 1024).toFixed(0))} KB
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="text-gray-400 hover:text-rose-600 p-1 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            انصراف
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting} className="font-bold">
            <Send className="w-4 h-4 ml-1.5" />
            <span>ارسال پیام</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
