import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { kaApi } from '../../../lib/api/ka';
import { 
  ShoppingBag, 
  Coins, 
  Gift, 
  Sparkles, 
  PackageCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Tag
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from '../../../components/ui/toast/toast';

interface KaRewardsStoreProps {
  userTokens: number;
  onRewardClaimed?: () => void;
}

export const KaRewardsStore: React.FC<KaRewardsStoreProps> = ({
  userTokens = 0,
  onRewardClaimed,
}) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [myClaims, setMyClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'store' | 'myClaims'>('store');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // مودال تایید دریافت پاداش
  const [claimingReward, setClaimingReward] = useState<any | null>(null);
  const [claimingLoading, setClaimingLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewRes, claimsRes] = await Promise.all([
        kaApi.getRewards(),
        kaApi.getMyClaims().catch(() => ({ data: [] })),
      ]);
      setRewards(Array.isArray(rewRes.data) ? rewRes.data : []);
      setMyClaims(Array.isArray(claimsRes.data) ? claimsRes.data : []);
    } catch (e) {
      console.error('Error fetching rewards:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClaim = async () => {
    if (!claimingReward) return;
    const cost = claimingReward.minToken || claimingReward.tokenCost || 10;
    
    if (userTokens < cost) {
      toast.error('موجودی توکن شما برای دریافت این پاداش کافی نیست!');
      return;
    }

    setClaimingLoading(true);
    try {
      await kaApi.claimReward({ rewardId: claimingReward.id });
      toast.success('درخواست دریافت پاداش با موفقیت ثبت شد و به زودی تحویل خواهد شد!');
      setClaimingReward(null);
      fetchData();
      if (onRewardClaimed) onRewardClaimed();
    } catch (e) {
      toast.error('خطا در ثبت درخواست پاداش');
    } finally {
      setClaimingLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(rewards.map(r => r.parent || 'عمومی')))];

  const filteredRewards = rewards.filter(r => {
    if (selectedCategory === 'all') return true;
    return (r.parent || 'عمومی') === selectedCategory;
  });

  return (
    <div className="space-y-8">
      {/* هدر بخش پاداش‌ها و موجودی توکن */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-college-normal" />
            باشگاه و بازارچه پاداش‌های کا
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            توکن‌های کسب‌شده از فعالیت‌های خود را برای جوایز ارزشمند، بن‌های تخفیف و یادبودهای رکاد خرج کنید
          </p>
        </div>

        {/* کارت موجودی توکن */}
        <div className="flex items-center gap-3 bg-college-light/60 dark:bg-college-darker/40 border-2 border-college-normal/30 px-4 py-2.5 rounded-2xl shadow-[2.75px_2.75px_0_#F8A41D]">
          <Coins className="w-6 h-6 text-college-normal shrink-0" />
          <div>
            <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300">موجودی توکن شما</div>
            <div className="text-lg font-black text-college-normal dark:text-college-light">
              {toPersianDigits(userTokens)} <span className="text-xs font-normal">توکن</span>
            </div>
          </div>
        </div>
      </div>

      {/* سوئیچر تب‌های استور / سوابق من */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('store')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'store'
                ? 'bg-college-normal text-white shadow-[2px_2px_0_#C2780E]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            ویترین جوایز
          </button>
          <button
            onClick={() => setActiveSubTab('myClaims')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'myClaims'
                ? 'bg-college-normal text-white shadow-[2px_2px_0_#C2780E]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            پاداش‌های من ({toPersianDigits(myClaims.length)})
          </button>
        </div>

        {activeSubTab === 'store' && categories.length > 2 && (
          <div className="hidden sm:flex items-center gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                {cat === 'all' ? 'همه دسته‌ها' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* محتوای ویترین جوایز */}
      {activeSubTab === 'store' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRewards.map((reward) => {
              const cost = reward.minToken || reward.tokenCost || 10;
              const canAfford = userTokens >= cost;

              return (
                <div
                  key={reward.id}
                  className="group relative flex flex-col justify-between rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28] p-5 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] hover:-translate-y-1 transition-all"
                >
                  <div className="space-y-3">
                    {/* هدر کارت پاداش */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-college-light dark:bg-college-darker/60 flex items-center justify-center text-college-normal shadow-sm group-hover:scale-105 transition-transform">
                        <Gift className="w-6 h-6" />
                      </div>
                      <Badge variant="college" className="text-xs font-black">
                        <Coins className="w-3.5 h-3.5 ml-1" />
                        {toPersianDigits(cost)} توکن
                      </Badge>
                    </div>

                    {/* عنوان و توضیحات */}
                    <div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        {reward.name}
                      </h3>
                      {reward.parent && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                          <Tag className="w-3 h-3" />
                          <span>{reward.parent}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2">
                        {reward.description || 'پاداش ویژه هنرستان رکاد برای هنرجویان پرتلاش و برتر'}
                      </p>
                    </div>
                  </div>

                  {/* دکمه اکشن درخواست پاداش */}
                  <div className="pt-5 border-t border-gray-100 dark:border-gray-800/80 mt-4">
                    <Button
                      onClick={() => setClaimingReward(reward)}
                      disabled={!canAfford}
                      className={`w-full font-bold text-xs ${
                        canAfford
                          ? 'bg-college-normal hover:bg-college-normal/90 text-white shadow-[2px_2px_0_#C2780E]'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <Sparkles className="w-4 h-4 ml-1.5" />
                          دریافت این پاداش
                        </>
                      ) : (
                        `کسری توکن (${toPersianDigits(cost - userTokens)} دیگر)`
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRewards.length === 0 && !loading && (
            <div className="py-16 text-center text-gray-500 space-y-3">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="font-bold text-sm">هیچ پاداشی در این دسته یافت نشد</p>
              <p className="text-xs">به زودی پاداش‌های جدید به این بخش اضافه خواهد شد.</p>
            </div>
          )}
        </div>
      )}

      {/* محتوای سوابق پاداش‌های من */}
      {activeSubTab === 'myClaims' && (
        <Card className="shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary" />
              تاریخچه درخواست‌های پاداش من
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {myClaims.map((claim) => (
                <div key={claim.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      {claim.reward?.name || 'پاداش نامشخص'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>هزینه: {toPersianDigits(claim.tokenCost || claim.token || 0)} توکن</span>
                    </div>
                  </div>

                  <div>
                    {claim.status === 'PENDING' && (
                      <Badge variant="warning">
                        <Clock className="w-3 h-3 ml-1" />
                        در انتظار آماده‌سازی
                      </Badge>
                    )}
                    {claim.status === 'APPROVED' && (
                      <Badge variant="college">
                        <CheckCircle2 className="w-3 h-3 ml-1" />
                        آماده تحویل در دفتر هنرستان
                      </Badge>
                    )}
                    {claim.status === 'DELIVERED' && (
                      <Badge variant="success">
                        <PackageCheck className="w-3 h-3 ml-1" />
                        تحویل داده شد
                      </Badge>
                    )}
                    {claim.status === 'REJECTED' && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 ml-1" />
                        رد شده / مسترد شد
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {myClaims.length === 0 && (
                <div className="py-12 text-center text-gray-500 space-y-2">
                  <PackageCheck className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-bold text-sm">هنوز پاداشی درخواست نکرده‌اید</p>
                  <p className="text-xs">با خرج توکن‌های خود از ویترین جوایز، پاداش بگیرید.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* مودال تایید دریافت پاداش */}
      {claimingReward && (
        <Modal
          isOpen={!!claimingReward}
          onClose={() => setClaimingReward(null)}
          title="تایید دریافت پاداش"
        >
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-college-light/40 dark:bg-college-darker/20 border border-college-normal/30">
              <div className="w-12 h-12 rounded-xl bg-college-normal text-white flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {claimingReward.name}
                </h4>
                <div className="text-xs text-college-normal font-bold mt-1">
                  هزینه توکن: {toPersianDigits(claimingReward.minToken || claimingReward.tokenCost || 10)} توکن
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl">
              <div className="flex justify-between">
                <span>موجودی فعلی شما:</span>
                <span className="font-bold">{toPersianDigits(userTokens)} توکن</span>
              </div>
              <div className="flex justify-between text-college-normal font-bold">
                <span>کسر پس از خرید:</span>
                <span>{toPersianDigits(claimingReward.minToken || claimingReward.tokenCost || 10)} توکن</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 font-black">
                <span>باقیمانده توکن شما:</span>
                <span>{toPersianDigits(userTokens - (claimingReward.minToken || claimingReward.tokenCost || 10))} توکن</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              پس از ثبت، سفارش شما به واحد معاونت و اداری هنرستان ارسال می‌شود و می‌توانید جایزه خود را به صورت فیزیکی یا اعتباری دریافت نمایید.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClaimingReward(null)}
                disabled={claimingLoading}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmClaim}
                disabled={claimingLoading}
                className="bg-college-normal hover:bg-college-normal/90 text-white font-bold"
              >
                {claimingLoading ? 'در حال ثبت...' : 'تایید نهایی و دریافت'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
