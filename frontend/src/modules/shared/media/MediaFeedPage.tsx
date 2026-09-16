import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { useTenantStore } from '../../../lib/auth/tenant-store';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';
import { useUndoableMutation } from '../../../lib/hooks/useUndoableMutation';
import {
  Heart,
  MessageCircle,
  Share2,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  Send,
  Trash2,
  Pin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Users,
  GraduationCap,
  School,
  X,
  Maximize2,
  File,
} from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

interface MediaComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
}

interface MediaPost {
  id: string;
  tenantId: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl?: string;
  postType: string; // STANDARD, SLIDESHOW, DOCUMENT, ANNOUNCEMENT
  mediaUrls: string[];
  attachments?: Attachment[];
  audienceType: string; // ALL, ROLES, CLASSROOMS
  targetRoles: string[];
  targetClassroomIds: string[];
  isPinned: boolean;
  allowComments: boolean;
  isLikedByMe: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
  comments?: MediaComment[];
}

export const MediaFeedPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);

  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SLIDESHOW' | 'DOCUMENT' | 'ANNOUNCEMENT'>('ALL');
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('STANDARD');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [audienceType, setAudienceType] = useState('ALL');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetClassroomIds, setTargetClassroomIds] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  // Active slide tracker for carousel posts (key = postId, value = slideIndex)
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({});

  // Expanded comments tracker (key = postId, value = boolean)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Comment input state (key = postId, value = string)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  // Lightbox preview state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isStaffOrAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'STAFF' ||
    user?.role === 'TEACHER';

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  // 1. Fetch Feed
  const fetchFeed = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/media');
      if (res.data) {
        setPosts(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load media feed', err);
      showToast('خطا در بارگذاری فید رسانه');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch Classrooms for targeting
  useEffect(() => {
    fetchFeed();
    if (isStaffOrAdmin) {
      apiClient
        .get('/academic/classrooms')
        .then((res) => {
          if (res.data) setClassrooms(res.data);
        })
        .catch(() => {});
    }
  }, [currentTenant?.id]);

  // Handle Like
  const handleToggleLike = async (postId: string) => {
    try {
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const nextLiked = !p.isLikedByMe;
            return {
              ...p,
              isLikedByMe: nextLiked,
              likeCount: nextLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1),
            };
          }
          return p;
        }),
      );

      const res = await apiClient.post(`/media/${postId}/like`);
      if (res.data) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLikedByMe: res.data.isLiked, likeCount: res.data.likeCount }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error('Like toggle failed', err);
      // Revert on error
      fetchFeed();
    }
  };

  // Handle Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: true }));
      const res = await apiClient.post(`/media/${postId}/comments`, { content: text });
      if (res.data) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const currentComments = p.comments || [];
              return {
                ...p,
                comments: [...currentComments, res.data],
                commentCount: p.commentCount + 1,
              };
            }
            return p;
          }),
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
        // Ensure comments are visible
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err: any) {
      console.error('Failed to post comment', err);
      showToast(err.message || 'خطا در ثبت نظر');
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Undoable Delete Mutation for Posts with 5-second countdown
  const { execute: executeUndoableDeletePost } = useUndoableMutation<MediaPost>({
    undoLabel: (p) => `پست «${p.title || 'رسانه'}» حذف شد.`,
    delayMs: 5000,
    optimisticUpdate: (p) => {
      setPosts((prev) => prev.filter((item) => item.id !== p.id));
    },
    revertUpdate: (p) => {
      setPosts((prev) => {
        if (prev.some((item) => item.id === p.id)) return prev;
        return [p, ...prev];
      });
      toast.info(`پست «${p.title || 'رسانه'}» بازگردانی شد.`);
    },
    mutationFn: async (p) => {
      await apiClient.delete(`/media/${p.id}`);
    },
    onError: (err, p) => {
      toast.error(err?.response?.data?.message || `خطا در حذف پست «${p.title || ''}»`);
    },
  });

  // Undoable Delete Mutation for Comments with 5-second countdown
  const { execute: executeUndoableDeleteComment } = useUndoableMutation<{
    post: MediaPost;
    comment: MediaComment;
  }>({
    undoLabel: 'نظر حذف شد.',
    delayMs: 5000,
    optimisticUpdate: ({ post, comment }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === post.id) {
            return {
              ...p,
              comments: (p.comments || []).filter((c) => c.id !== comment.id),
              commentCount: Math.max(0, p.commentCount - 1),
            };
          }
          return p;
        }),
      );
    },
    revertUpdate: ({ post, comment }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === post.id) {
            return {
              ...p,
              comments: [...(p.comments || []), comment],
              commentCount: p.commentCount + 1,
            };
          }
          return p;
        }),
      );
      toast.info('نظر بازگردانی شد.');
    },
    mutationFn: async ({ comment }) => {
      await apiClient.delete(`/media/comments/${comment.id}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'خطا در حذف نظر');
    },
  });

  // Handle Share Post
  const handleSharePost = (post: MediaPost) => {
    const shareUrl = `${window.location.origin}/app/media#${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast('لینک اشتراک‌گذاری پست کپی شد');
    } else {
      showToast(shareUrl);
    }
  };

  // Create Post Submit
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setPostError('عنوان و توضیحات پست الزامی است.');
      return;
    }

    try {
      setIsSubmitting(true);
      setPostError(null);

      const determinedPostType =
        mediaUrls.length > 1
          ? 'SLIDESHOW'
          : attachments.length > 0
          ? 'DOCUMENT'
          : postType;

      const payload = {
        title: title.trim(),
        content: content.trim(),
        postType: determinedPostType,
        mediaUrls,
        attachments: attachments.length > 0 ? attachments : undefined,
        audienceType,
        targetRoles: audienceType === 'ROLES' ? targetRoles : [],
        targetClassroomIds: audienceType === 'CLASSROOMS' ? targetClassroomIds : [],
        isPinned,
        allowComments,
        isPublished: true,
      };

      const res = await apiClient.post('/media', payload);
      if (res.data) {
        setPosts((prev) => [res.data, ...prev]);
        setIsCreateModalOpen(false);
        showToast('پست با موفقیت در رسانه هنرستان منتشر شد');

        // Reset form
        setTitle('');
        setContent('');
        setPostType('STANDARD');
        setMediaUrls([]);
        setAttachments([]);
        setAudienceType('ALL');
        setTargetRoles([]);
        setTargetClassroomIds([]);
        setIsPinned(false);
        setAllowComments(true);
      }
    } catch (err: any) {
      console.error('Failed to create post', err);
      setPostError(err.message || 'خطا در انتشار پست رسانه');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add slide image to form
  const handleAddMediaUrl = () => {
    if (newImageUrl.trim()) {
      setMediaUrls((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  // Add attachment to form
  const handleAddAttachment = () => {
    if (newAttachmentName.trim() && newAttachmentUrl.trim()) {
      setAttachments((prev) => [
        ...prev,
        { name: newAttachmentName.trim(), url: newAttachmentUrl.trim() },
      ]);
      setNewAttachmentName('');
      setNewAttachmentUrl('');
    }
  };

  // Role display badge helper
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="default" className="text-[10px]">سوپرادمین</Badge>;
      case 'SCHOOL_ADMIN':
        return <Badge variant="sec" className="text-[10px]">مدیریت هنرستان</Badge>;
      case 'STAFF':
        return <Badge variant="sec" className="text-[10px]">کادر اجرایی</Badge>;
      case 'TEACHER':
        return <Badge variant="male" className="text-[10px]">مربی / دبیر</Badge>;
      case 'STUDENT':
        return <Badge variant="college" className="text-[10px]">دانش‌آموز</Badge>;
      case 'PARENT':
        return <Badge variant="female" className="text-[10px]">اولیاء</Badge>;
      default:
        return <Badge variant="neutral" className="text-[10px]">{role}</Badge>;
    }
  };

  // Audience indicator helper
  const renderAudienceBadge = (post: MediaPost) => {
    if (post.audienceType === 'ALL') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Users className="w-3 h-3" />
          <span>عمومی (همه)</span>
        </span>
      );
    }
    if (post.audienceType === 'ROLES') {
      const roleLabels = post.targetRoles.map((r) => {
        if (r === 'STUDENT') return 'دانش‌آموزان';
        if (r === 'PARENT') return 'اولیاء';
        if (r === 'TEACHER') return 'مربیان';
        return r;
      });
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-500/20">
          <Users className="w-3 h-3" />
          <span>مخصوص: {roleLabels.join('، ') || 'نقش‌های خاص'}</span>
        </span>
      );
    }
    if (post.audienceType === 'CLASSROOMS') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-500/20">
          <GraduationCap className="w-3 h-3" />
          <span>کلاس‌های منتخب</span>
        </span>
      );
    }
    return null;
  };

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'SLIDESHOW') return p.postType === 'SLIDESHOW' || p.mediaUrls?.length > 1;
    if (activeFilter === 'DOCUMENT') return p.postType === 'DOCUMENT' || (p.attachments && p.attachments.length > 0);
    if (activeFilter === 'ANNOUNCEMENT') return p.postType === 'ANNOUNCEMENT' || p.isPinned;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-[#151C28] bg-gradient-to-l from-primary/15 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/5 dark:to-transparent p-4 sm:p-6 rounded-2xl border border-primary/30 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-1.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span className="text-lg sm:text-xl font-black text-ink-darker dark:text-white">
              رسانه و رویدادهای هنرستان
            </span>
            <Badge variant="default" className="text-[11px]">
              {currentTenant?.name || 'هنرستان رُکاد'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            شبکه رسانه‌ای و محتوایی یکپارچه، گزارش‌های تصویری کارگاهی، اخبار رسمی و اطلاعیه‌های مهم با امکان ثبت نظر و تعامل مستقیم
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse shrink-0">
          {isStaffOrAdmin && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs sm:text-sm flex items-center space-x-1.5 space-x-reverse"
            >
              <Plus className="h-4 w-4" />
              <span>انتشار پست رسانه‌ای</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'ALL'
                ? 'bg-sec dark:bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            همه پست‌ها ({toPersianDigits(posts.length)})
          </button>
          <button
            onClick={() => setActiveFilter('SLIDESHOW')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'SLIDESHOW'
                ? 'bg-sec dark:bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            گالری و اسلایدها
          </button>
          <button
            onClick={() => setActiveFilter('DOCUMENT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'DOCUMENT'
                ? 'bg-sec dark:bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            اسناد و فایل‌ها
          </button>
          <button
            onClick={() => setActiveFilter('ANNOUNCEMENT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'ANNOUNCEMENT'
                ? 'bg-sec dark:bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#1C2536] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            اطلاعیه‌ها و پین‌ها
          </button>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          نمایش {toPersianDigits(filteredPosts.length)} پست رسانه‌ای
        </span>
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base text-ink-darker dark:text-white mb-1">
            هنوز مطلبی در این بخش منتشر نشده است
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            پست‌های کارگاهی، گزارش‌های تصویری و اطلاعیه‌ها در این قسمت نمایش داده می‌شوند.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => {
            const currentSlide = activeSlides[post.id] || 0;
            const hasSlides = post.mediaUrls && post.mediaUrls.length > 0;
            const isSlideCount = post.mediaUrls?.length || 0;
            const isCommentsOpen = !!expandedComments[post.id];

            return (
              <Card
                key={post.id}
                className={`overflow-hidden transition-all border-[1.5px] ${
                  post.isPinned ? 'border-primary/50' : 'border-[#EAEAEA] dark:border-[#242F42]'
                }`}
              >
                {/* Post Header */}
                <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800/80">
                  <div className="flex items-center space-x-3 space-x-reverse min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                      {post.author?.avatarUrl ? (
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {post.author?.firstName?.[0] || 'ر'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-darker dark:text-white truncate">
                          {post.author?.firstName} {post.author?.lastName}
                        </span>
                        {getRoleBadge(post.author?.role)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>
                          {new Date(post.createdAt).toLocaleDateString('fa-IR', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        {renderAudienceBadge(post)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {post.isPinned && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Pin className="w-3 h-3" />
                        <span>سنجاق‌شده</span>
                      </span>
                    )}
                    {(isStaffOrAdmin || post.authorId === user?.id) && (
                      <button
                        onClick={() => executeUndoableDeletePost(post)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="حذف پست"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Title & Content */}
                <div className="p-4 sm:p-5 pt-3.5 space-y-2">
                  <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>

                {/* Slideshow / Image Carousel */}
                {hasSlides && (
                  <div className="px-4 sm:px-5 pb-4">
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-black/40">
                      {/* Image Frame */}
                      <div className="relative aspect-[16/9] w-full flex items-center justify-center overflow-hidden">
                        <img
                          src={post.mediaUrls[currentSlide]}
                          alt={`${post.title} - اسلاید ${currentSlide + 1}`}
                          className="w-full h-full object-cover cursor-pointer transition-all duration-300"
                          onClick={() => setLightboxImage(post.mediaUrls[currentSlide])}
                        />

                        {/* Expand Button */}
                        <button
                          onClick={() => setLightboxImage(post.mediaUrls[currentSlide])}
                          className="absolute top-3 left-3 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-xs"
                          title="بزرگ‌نمایی تصویر"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>

                        {/* Navigation Arrows for Multiple Slides */}
                        {isSlideCount > 1 && (
                          <>
                            <button
                              onClick={() =>
                                setActiveSlides((prev) => ({
                                  ...prev,
                                  [post.id]: (currentSlide - 1 + isSlideCount) % isSlideCount,
                                }))
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-xs shadow-md"
                              aria-label="اسلاید قبلی"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                setActiveSlides((prev) => ({
                                  ...prev,
                                  [post.id]: (currentSlide + 1) % isSlideCount,
                                }))
                              }
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-xs shadow-md"
                              aria-label="اسلاید بعدی"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Dots and Slide Counter */}
                      {isSlideCount > 1 && (
                        <div className="flex items-center justify-between p-2.5 bg-gray-900/80 text-white text-[11px] backdrop-blur-xs">
                          <div className="flex items-center gap-1.5 mr-1">
                            {post.mediaUrls.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  setActiveSlides((prev) => ({ ...prev, [post.id]: idx }))
                                }
                                className={`h-1.5 rounded-full transition-all ${
                                  idx === currentSlide ? 'w-5 bg-primary' : 'w-1.5 bg-white/40'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-xs">
                            {toPersianDigits(currentSlide + 1)} / {toPersianDigits(isSlideCount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* File Attachments Box */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="px-4 sm:px-5 pb-4">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1A2232] border border-gray-200 dark:border-gray-800 space-y-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">
                        فایل‌ها و پیوست‌های دانلودی:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {post.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 hover:border-primary transition-all group"
                          >
                            <div className="flex items-center space-x-2 space-x-reverse min-w-0 pr-1">
                              <File className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs font-bold text-ink-darker dark:text-white truncate">
                                {att.name || 'سند پیوست'}
                              </span>
                            </div>
                            <Download className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    {/* Like Button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center space-x-1.5 space-x-reverse font-bold transition-transform active:scale-125 ${
                        post.isLikedByMe
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-rose-500'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${post.isLikedByMe ? 'fill-current' : ''}`}
                      />
                      <span>{toPersianDigits(post.likeCount)}</span>
                    </button>

                    {/* Comments Toggle Button */}
                    <button
                      onClick={() =>
                        setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="flex items-center space-x-1.5 space-x-reverse text-gray-500 dark:text-gray-400 hover:text-primary font-bold transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{toPersianDigits(post.commentCount)} نظر</span>
                    </button>
                  </div>

                  {/* Share Button */}
                  <button
                    onClick={() => handleSharePost(post)}
                    className="flex items-center space-x-1.5 space-x-reverse text-gray-500 dark:text-gray-400 hover:text-primary font-bold transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">اشتراک‌گذاری</span>
                  </button>
                </div>

                {/* Expandable Comments Drawer */}
                {isCommentsOpen && (
                  <div className="bg-gray-50/70 dark:bg-[#121824]/60 p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    {/* Comment List */}
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-3 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200/80 dark:border-gray-800 flex items-start justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start space-x-2.5 space-x-reverse min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 font-bold text-primary flex items-center justify-center shrink-0 text-xs mt-0.5">
                                {comment.author?.firstName?.[0] || 'ک'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-ink-darker dark:text-white">
                                    {comment.author?.firstName} {comment.author?.lastName}
                                  </span>
                                  {getRoleBadge(comment.author?.role)}
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString('fa-IR')}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                                  {comment.content}
                                </p>
                              </div>
                            </div>

                            {(isStaffOrAdmin || comment.authorId === user?.id) && (
                              <button
                                onClick={() => executeUndoableDeleteComment({ post, comment })}
                                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                title="حذف نظر"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        هنوز نظری برای این پست ثبت نشده است. اولین نفری باشید که دیدگاه خود را می‌نویسید!
                      </p>
                    )}

                    {/* New Comment Input Box */}
                    {post.allowComments ? (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="text"
                          placeholder="دیدگاه خود را اینجا بنویسید..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-ink-darker dark:text-white focus:outline-none focus:border-primary transition-colors"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddComment(post.id)}
                          isLoading={isSubmittingComment[post.id]}
                          className="h-9 px-3 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5 ml-1" />
                          <span>ارسال</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg text-center font-medium">
                        امکان ثبت نظر توسط نویسنده این پست غیرفعال شده است.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 left-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="بزرگ‌نمایی تصویر"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="انتشار مطلب جدید در رسانه هنرستان"
        description="ارسال پست‌های متنی، گالری‌های تصویری اسلایدی و فایل‌های پیوست با تعیین دقیق مخاطبان"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          {postError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{postError}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
              عنوان پست رسانه‌ای:
            </label>
            <input
              type="text"
              required
              placeholder="مثال: برگزاری موفقیت‌آمیز آزمون جامع پودمان سوم شبکه و نرم‌افزار"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-primary"
            />
          </div>

          {/* Content */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300">
              متن کامل توضیحات و گزارش:
            </label>
            <textarea
              required
              rows={4}
              placeholder="شرح کامل رویداد، دستاوردها، نکات کلیدی و اطلاعات مرتبط..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-darker dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Media Images / Slides */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1A2232] border border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-ink-darker dark:text-white">
                  تصاویر اسلایدی (گالری):
                </span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                {toPersianDigits(mediaUrls.length)} تصویر اضافه شده
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="آدرس اینترنتی تصویر (https://...)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 text-xs text-ink-darker dark:text-white focus:outline-none focus:border-primary"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddMediaUrl}>
                افزودن اسلاید
              </Button>
            </div>

            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-14 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 group"
                  >
                    <img src={url} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Attachments */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1A2232] border border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-ink-darker dark:text-white">
                  فایل‌های پیوست قابل دانلود:
                </span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                {toPersianDigits(attachments.length)} فایل
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="عنوان فایل (مثال: جزوه پودمان ۴.pdf)"
                value={newAttachmentName}
                onChange={(e) => setNewAttachmentName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 text-xs text-ink-darker dark:text-white focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="لینک مستقیم فایل"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 text-xs text-ink-darker dark:text-white focus:outline-none focus:border-primary"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddAttachment}>
                  افزودن
                </Button>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#151C28] border border-gray-200 dark:border-gray-700 text-xs"
                  >
                    <span className="font-bold text-ink-darker dark:text-white truncate">
                      {att.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audience Target Selector */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-ink-normal/80 dark:text-gray-300 block">
              جامعه مخاطب این مطلب:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAudienceType('ALL')}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                  audienceType === 'ALL'
                    ? 'border-primary bg-primary-light/50 dark:bg-primary/20 text-primary-darker dark:text-white shadow-2xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                عمومی (کل هنرستان)
              </button>
              <button
                type="button"
                onClick={() => setAudienceType('ROLES')}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                  audienceType === 'ROLES'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-2xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                نقش‌های مشخص
              </button>
              <button
                type="button"
                onClick={() => setAudienceType('CLASSROOMS')}
                className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                  audienceType === 'CLASSROOMS'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-2xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                کلاس‌های مشخص
              </button>
            </div>

            {/* If ROLES selected */}
            {audienceType === 'ROLES' && (
              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex flex-wrap gap-4 text-xs font-bold text-gray-700 dark:text-gray-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetRoles.includes('STUDENT')}
                    onChange={(e) => {
                      if (e.target.checked) setTargetRoles((r) => [...r, 'STUDENT']);
                      else setTargetRoles((r) => r.filter((x) => x !== 'STUDENT'));
                    }}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>دانش‌آموزان (دانش‌آموزان)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetRoles.includes('PARENT')}
                    onChange={(e) => {
                      if (e.target.checked) setTargetRoles((r) => [...r, 'PARENT']);
                      else setTargetRoles((r) => r.filter((x) => x !== 'PARENT'));
                    }}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>اولیاء گرامی</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetRoles.includes('TEACHER')}
                    onChange={(e) => {
                      if (e.target.checked) setTargetRoles((r) => [...r, 'TEACHER']);
                      else setTargetRoles((r) => r.filter((x) => x !== 'TEACHER'));
                    }}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>مربیان و دبیران</span>
                </label>
              </div>
            )}

            {/* If CLASSROOMS selected */}
            {audienceType === 'CLASSROOMS' && (
              <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 block">
                  کلاس‌های مجاز برای مشاهده این مطلب را انتخاب کنید:
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {classrooms.map((cls) => {
                    const isSelected = targetClassroomIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTargetClassroomIds((ids) => ids.filter((id) => id !== cls.id));
                          } else {
                            setTargetClassroomIds((ids) => [...ids, cls.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                            : 'bg-white dark:bg-[#151C28] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Switches */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs font-bold">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-ink-darker dark:text-white">سنجاق کردن در بالای فید رسانه</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <span className="text-ink-darker dark:text-white">امکان ثبت نظر توسط کاربران</span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end space-x-2 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              انتشار رسمی در رسانه
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
