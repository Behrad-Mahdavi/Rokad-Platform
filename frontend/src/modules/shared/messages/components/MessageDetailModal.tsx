import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { apiClient } from '../../../../lib/api/client';
import { toast } from '../../../../components/ui/toast/toast';
import { gregorianToJalaliStr, toPersianDigits } from '../../../../utils/jalali';
import { AcademicMessageItem, MessageAttachment } from '../types';
import {
  Star,
  Trash2,
  Reply,
  Download,
  Paperclip,
  Clock,
  User,
  Building,
  AlertTriangle,
  FileText,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  messageId: string | null;
  onClose: () => void;
  onDeleted?: (messageId: string) => void;
  onReply?: (recipientId: string, recipientName: string, subject: string) => void;
}

export const MessageDetailModal: React.FC<Props> = ({
  isOpen,
  messageId,
  onClose,
  onDeleted,
  onReply,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [togglingStar, setTogglingStar] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !messageId) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/messages/${messageId}`);
        const msg = res.data?.data || res.data;
        setData(msg);
        setIsStarred(msg.isStarred || false);
      } catch (err: any) {
        toast.error('خطا در بارگذاری جزئیات پیام');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, messageId, onClose]);

  const handleToggleStar = async () => {
    if (!messageId) return;
    try {
      setTogglingStar(true);
      const res = await apiClient.patch(`/messages/${messageId}/star`);
      setIsStarred(res.data?.isStarred ?? !isStarred);
      toast.success(isStarred ? 'پیام از ستاره‌دارها خارج شد' : 'پیام ستاره‌دار شد');
    } catch {
      toast.error('خطا در تغییر وضعیت ستاره');
    } finally {
      setTogglingStar(false);
    }
  };

  const handleDelete = async () => {
    if (!messageId || !window.confirm('آیا از حذف این پیام از صندوق خود اطمینان دارید؟')) return;
    try {
      await apiClient.delete(`/messages/${messageId}`);
      toast.success('پیام با موفقیت حذف گردید');
      if (onDeleted) onDeleted(messageId);
      onClose();
    } catch {
      toast.error('خطا در حذف پیام');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>فوری و اضطراری</span>
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            مهم
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            عادی
          </span>
        );
    }
  };

  const getSenderRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return 'مدیریت مجتمع آموزشی';
      case 'TEACHER':
        return 'استاد / دبیر';
      case 'STUDENT':
        return 'هنرجو';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      default:
        return 'کادر مدرسه';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="مشاهده پیام" maxWidth="xl">
        {loading || !data ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">در حال بارگذاری جزئیات پیام...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header / Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-black text-sm border border-primary/20">
                  {data.sender?.firstName?.[0] || 'ر'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">
                      {data.sender?.firstName} {data.sender?.lastName}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold">
                      {getSenderRoleLabel(data.sender?.role)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{gregorianToJalaliStr(data.createdAt)}</span>
                    {data.targetClassroom && (
                      <span className="flex items-center gap-1 text-primary">
                        <Building className="w-3 h-3" />
                        {data.targetClassroom.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getPriorityBadge(data.priority)}
                <button
                  type="button"
                  onClick={handleToggleStar}
                  disabled={togglingStar}
                  className={`p-2 rounded-xl border transition-colors ${
                    isStarred
                      ? 'bg-amber-50 text-amber-500 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                      : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-500'
                  }`}
                  title="نشان‌کردن / ستاره‌دار"
                >
                  <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                  title="حذف پیام"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subject Title */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 block mb-1">موضوع:</span>
              <h2 className="text-base font-black text-gray-900 dark:text-white leading-snug">
                {data.title}
              </h2>
            </div>

            {/* Message Body */}
            <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed min-h-28">
              {data.body}
            </div>

            {/* Attachments Section */}
            {data.attachments && data.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  <span>پیوست‌های این پیام ({toPersianDigits(data.attachments.length)}):</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.attachments.map((att: MessageAttachment, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {att.type === 'image' ? (
                          <div
                            onClick={() => setPreviewImage(att.url)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-85 shrink-0"
                          >
                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold truncate text-gray-800 dark:text-gray-200">
                            {att.name}
                          </p>
                          {att.size && (
                            <p className="text-[10px] text-gray-400 font-mono">
                              {toPersianDigits((att.size / 1024).toFixed(0))} KB
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {att.type === 'image' && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(att.url)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="مشاهده تصویر"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <a
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="دانلود فایل"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              {data.sender && !data.isSender && onReply ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const recipientName = `${data.sender.firstName} ${data.sender.lastName}`;
                    const replySubject = data.title.startsWith('پاسخ:') ? data.title : `پاسخ: ${data.title}`;
                    onReply(data.sender.id, recipientName, replySubject);
                    onClose();
                  }}
                  className="font-bold text-xs"
                >
                  <Reply className="w-4 h-4 ml-1.5" />
                  <span>پاسخ به این پیام</span>
                </Button>
              ) : (
                <div />
              )}

              <Button type="button" variant="secondary" size="sm" onClick={onClose} className="text-xs">
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Lightbox Preview for Images */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="پیش‌نمایش تصویر"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </>
  );
};
