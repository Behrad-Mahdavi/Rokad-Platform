import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  BookOpen,
  Download,
  FileText,
  Video,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

export const StudentMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/learning-materials');
      setMaterials(res.data || []);
    } catch (err) {
      console.error('Failed to load materials', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.lesson?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-darker flex items-center space-x-2 space-x-reverse">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>محتوای آموزشی، جزوات و ویدیوها (Learning Materials)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            دانلود مستقیم جزوات درسی، نمونه سوالات و ویدیوهای بارگذاری‌شده توسط معلمان
          </p>
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="جستجو در عنوان یا نام درس..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 px-3 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))
        ) : filteredMaterials.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
            فایل آموزشی یافت نشد.
          </div>
        ) : (
          filteredMaterials.map((mat) => (
            <Card key={mat.id} className="flex flex-col justify-between p-6 border hover:border-primary transition-all">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="default">{mat.lesson?.name || 'حسابان'}</Badge>
                  <span className="text-[11px] font-mono font-bold text-gray-500">{mat.fileSizeMb || 5} MB</span>
                </div>

                <h3 className="font-bold text-base text-ink-darker mb-1 flex items-center space-x-1.5 space-x-reverse">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{mat.title}</span>
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  {mat.description || 'جزوه تکمیلی تدریس جلسه کلاسی'}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-mono">
                  {new Date(mat.createdAt || Date.now()).toLocaleDateString('fa-IR')}
                </span>

                <a
                  href={mat.fileUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 space-x-reverse bg-primary-light text-primary-darker hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>دانلود فایل</span>
                </a>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
