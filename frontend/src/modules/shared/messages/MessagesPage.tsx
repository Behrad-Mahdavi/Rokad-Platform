import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { apiClient } from '../../../lib/api/client';
import { toast } from '../../../components/ui/toast/toast';
import { gregorianToJalaliStr, toPersianDigits } from '../../../utils/jalali';
import { InboxItem, AcademicMessageItem, MessagePriority } from './types';
import { ComposeMessageModal } from './components/ComposeMessageModal';
import { MessageDetailModal } from './components/MessageDetailModal';
import {
  MessageSquare,
  Send,
  Inbox,
  Star,
  Plus,
  Search,
  Filter,
  Paperclip,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Archive,
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'starred'>('inbox');
  const [loading, setLoading] = useState(true);

  // Data
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [sentItems, setSentItems] = useState<AcademicMessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyRecipient, setReplyRecipient] = useState<{
    id: string;
    name: string;
    subject: string;
  } | null>(null);

  // Fetch messages based on active tab
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'inbox' || activeTab === 'starred') {
        const res = await apiClient.get('/messages/inbox', {
          params: {
            starredOnly: activeTab === 'starred',
            unreadOnly: unreadOnly && activeTab === 'inbox',
            search: searchQuery.trim() || undefined,
          },
        });
        const result = res.data?.data || [];
        setInboxItems(result);
        if (res.data?.meta?.unreadCount !== undefined) {
          setUnreadCount(res.data.meta.unreadCount);
        }
      } else if (activeTab === 'sent') {
        const res = await apiClient.get('/messages/sent', {
          params: {
            search: searchQuery.trim() || undefined,
          },
        });
        setSentItems(res.data?.data || []);
      }
    } catch (err: any) {
      toast.error('خطا در دریافت لیست پیام‌ها');
    } finally {
      setLoading(false);
    }
  }, [activeTab, unreadOnly, searchQuery]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleToggleStar = async (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    try {
      const res = await apiClient.patch(`/messages/${messageId}/star`);
      const newStarred = res.data?.isStarred ?? false;

      setInboxItems((prev) =>
        prev.map((item) =>
          item.message.id === messageId ? { ...item, isStarred: newStarred } : item,
        ),
      );
      toast.success(newStarred ? 'پیام ستاره‌دار شد' : 'پیام از ستاره‌دارها خارج شد');
    } catch {
      toast.error('خطا در تغییر وضعیت ستاره');
    }
  };

  const handleReply = (recipientId: string, recipientName: string, subject: string) => {
    setReplyRecipient({ id: recipientId, name: recipientName, subject });
    setIsComposeOpen(true);
  };

  const filteredInboxItems = inboxItems.filter((item) => {
    if (priorityFilter !== 'ALL' && item.message.priority !== priorityFilter) return false;
    return true;
  });

  const filteredSentItems = sentItems.filter((item) => {
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    return true;
  });

  const getPriorityBadge = (priority: MessagePriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>فوری</span>
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            مهم
          </span>
        );
      default:
        return null;
    }
  };

  const getSenderRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-medium">مدیریت</span>;
      case 'TEACHER':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">استاد</span>;
      case 'STUDENT':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">دانش‌آموز</span>;
      case 'PARENT':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">ولی</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#151C28] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  سامانه پیام‌ها و مکاتبات
                </h1>
                {unreadCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary text-white font-bold animate-pulse">
                    {toPersianDigits(unreadCount)} جدید
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ارسال و دریافت پیام‌های رسمی، بخشنامه‌های کلاسی و پیوست‌های تحصیلی
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchMessages}
            isLoading={loading}
            className="text-xs"
            title="بروزرسانی پیام‌ها"
          >
            <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
            <span>بروزرسانی</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setReplyRecipient(null);
              setIsComposeOpen(true);
            }}
            className="font-bold text-xs"
          >
            <Plus className="w-4 h-4 ml-1.5" />
            <span>ارسال پیام جدید</span>
          </Button>
        </div>
      </div>

      {/* 2. Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'inbox'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>صندوق ورودی</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'inbox' ? 'bg-white text-primary' : 'bg-primary text-white'
                }`}
              >
                {toPersianDigits(unreadCount)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'sent'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>پیام‌های ارسالی</span>
          </button>

          <button
            onClick={() => setActiveTab('starred')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'starred'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>ستاره‌دارها</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پیام‌ها..."
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">همه اولویت‌ها</option>
            <option value="URGENT">فقط فوری</option>
            <option value="IMPORTANT">فقط مهم</option>
            <option value="NORMAL">عادی</option>
          </select>

          {activeTab === 'inbox' && (
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                unreadOnly
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
              }`}
            >
              خوانده‌نشده
            </button>
          )}
        </div>
      </div>

      {/* 3. Messages List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#151C28] rounded-3xl border border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">در حال بارگذاری پیام‌ها...</p>
        </div>
      ) : activeTab === 'inbox' || activeTab === 'starred' ? (
        filteredInboxItems.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#151C28] rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {activeTab === 'starred' ? 'هیچ پیام ستاره‌داری یافت نشد' : 'صندوق ورودی شما خالی است'}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              پیام‌های جدید ارسال‌شده توسط اساتید، کادر مدرسه یا هم‌کلاسی‌ها در این قسمت نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredInboxItems.map((item) => {
              const isUnread = !item.isRead;
              const hasAttachments = item.message.attachments && item.message.attachments.length > 0;

              return (
                <div
                  key={item.recipientRecordId}
                  onClick={() => setSelectedMessageId(item.message.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isUnread
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 shadow-2xs'
                      : 'bg-white dark:bg-[#151C28] border-gray-100 dark:border-gray-800 hover:border-gray-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Unread dot */}
                    <div className="w-2.5 flex items-center justify-center shrink-0">
                      {isUnread && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>

                    {/* Sender Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-black text-xs shrink-0 border border-primary/20">
                      {item.message.sender?.firstName?.[0] || 'ر'}
                    </div>

                    {/* Content Snippet */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {item.message.sender?.firstName} {item.message.sender?.lastName}
                        </span>
                        {getSenderRoleBadge(item.message.sender?.role)}
                        {getPriorityBadge(item.message.priority)}
                        {item.message.classroom && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Building className="w-3 h-3 text-primary" />
                            {item.message.classroom.name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">
                        {item.message.title}
                      </h4>

                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.message.body}
                      </p>
                    </div>
                  </div>

                  {/* Meta / Right Side */}
                  <div className="flex items-center gap-3 shrink-0">
                    {hasAttachments && (
                      <div
                        className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg"
                        title="دارای فایل پیوست"
                      >
                        <Paperclip className="w-3 h-3 text-primary" />
                        <span className="font-mono">{toPersianDigits(item.message.attachments.length)}</span>
                      </div>
                    )}

                    <span className="text-[11px] text-gray-400 font-mono">
                      {gregorianToJalaliStr(item.createdAt)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(e, item.message.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.isStarred
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-gray-300 dark:text-gray-600 hover:text-amber-500'
                      }`}
                      title="ستاره‌دار"
                    >
                      <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Sent Items */
        filteredSentItems.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#151C28] rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center">
              <Send className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              هیچ پیام ارسالی ثبت نشده است
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              پیام‌هایی که برای دیگر کاربران، کلاس‌ها یا کل مدرسه ارسال می‌کنید در اینجا آرشیو می‌گردند.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSentItems.map((item) => {
              const hasAttachments = item.attachments && item.attachments.length > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMessageId(item.id)}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#151C28] hover:border-gray-300 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      <Send className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary">
                          {item.targetType === 'ALL'
                            ? 'ارسال همگانی'
                            : item.targetType === 'ROLE'
                            ? 'ارسال به گروه نقشی'
                            : item.targetType === 'CLASSROOM'
                            ? `کلاس ${item.classroom?.name || ''}`
                            : 'پیام مستقیم / فردی'}
                        </span>
                        {item.recipientsCount !== undefined && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {toPersianDigits(item.recipientsCount)} گیرنده
                          </span>
                        )}
                        {getPriorityBadge(item.priority)}
                      </div>

                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">
                        {item.title}
                      </h4>

                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {hasAttachments && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                        <Paperclip className="w-3 h-3 text-primary" />
                        <span className="font-mono">{toPersianDigits(item.attachments.length)}</span>
                      </div>
                    )}

                    <span className="text-[11px] text-gray-400 font-mono">
                      {gregorianToJalaliStr(item.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 4. Modals */}
      <ComposeMessageModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setReplyRecipient(null);
        }}
        onSuccess={fetchMessages}
        defaultRecipientId={replyRecipient?.id}
        defaultRecipientName={replyRecipient?.name}
        defaultSubject={replyRecipient?.subject}
      />

      <MessageDetailModal
        isOpen={Boolean(selectedMessageId)}
        messageId={selectedMessageId}
        onClose={() => setSelectedMessageId(null)}
        onDeleted={() => {
          setSelectedMessageId(null);
          fetchMessages();
        }}
        onReply={handleReply}
      />
    </div>
  );
};
