import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Shield,
  Users,
  BookOpen,
  Plus,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { rbacApi } from './api/rbac.api';
import {
  PermissionCatalogResponse,
  SchoolRoleItem,
  MemberAccessItem,
  CreateSchoolRolePayload,
} from './types/rbac.types';
import { RolesListTab } from './components/RolesListTab';
import { RoleFormModal } from './components/RoleFormModal';
import { MembersAccessTab } from './components/MembersAccessTab';
import { PermissionCatalogTab } from './components/PermissionCatalogTab';
import { toPersianDigits } from '../../../lib/utils';

export const RoleBuilderPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'members' | 'catalog'>('roles');

  // Data states
  const [catalog, setCatalog] = useState<PermissionCatalogResponse | null>(null);
  const [roles, setRoles] = useState<SchoolRoleItem[]>([]);
  const [members, setMembers] = useState<MemberAccessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Members filters
  const [staffOnly, setStaffOnly] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');

  // Role form modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SchoolRoleItem | null>(null);

  // Delete modal state
  const [roleToDelete, setRoleToDelete] = useState<SchoolRoleItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catData, rolesData, membersData] = await Promise.all([
        rbacApi.getPermissionsCatalog(),
        rbacApi.getSchoolRoles(),
        rbacApi.getMembersAccess({ search: memberSearch, staffOnly }),
      ]);
      setCatalog(catData);
      setRoles(rolesData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'خطا در بارگذاری اطلاعات نقش‌ها');
    } finally {
      setLoading(false);
    }
  }, [staffOnly, memberSearch]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle Create or Update Role
  const handleSaveRole = async (data: CreateSchoolRolePayload) => {
    if (editingRole) {
      await rbacApi.updateSchoolRole(editingRole.id, data);
    } else {
      await rbacApi.createSchoolRole(data);
    }
    // Refresh roles
    const updatedRoles = await rbacApi.getSchoolRoles();
    setRoles(updatedRoles);
  };

  // Handle Delete Role
  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await rbacApi.deleteSchoolRole(roleToDelete.id);
      setRoleToDelete(null);
      const updatedRoles = await rbacApi.getSchoolRoles();
      setRoles(updatedRoles);
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || err?.message || 'خطا در حذف نقش');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-ink-dark dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span>سازنده نقش‌ها و مدیریت دسترسی‌ها (RBAC)</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            تعریف نقش‌های سفارشی مدرسه، تخصیص مجوزهای دانه‌ای، و مدیریت استثناهای دسترسی اعضا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllData}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Stat Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400">مجوزهای سیستمی سامانه</div>
            <div className="text-lg font-black text-ink-dark dark:text-white mt-0.5">
              {catalog ? toPersianDigits(catalog.totalCount) : '...'} دسترسی
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400">نقش‌های سازمانی مدرسه</div>
            <div className="text-lg font-black text-ink-dark dark:text-white mt-0.5">
              {toPersianDigits(roles.length)} نقش
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400">اعضای دارای نقش سازمانی</div>
            <div className="text-lg font-black text-ink-dark dark:text-white mt-0.5">
              {toPersianDigits(members.filter((m) => m.schoolRoles.length > 0).length)} نفر
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-rose-950/40 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`pb-3.5 px-3 text-xs font-bold transition-all relative ${
            activeTab === 'roles'
              ? 'text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-ink-dark dark:hover:text-white'
          }`}
        >
          <span>نقش‌های سازمانی مدرسه</span>
          <span className="mr-1.5 px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary">
            {toPersianDigits(roles.length)}
          </span>
          {activeTab === 'roles' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`pb-3.5 px-3 text-xs font-bold transition-all relative ${
            activeTab === 'members'
              ? 'text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-ink-dark dark:hover:text-white'
          }`}
        >
          <span>اعضا و مدیریت دسترسی</span>
          <span className="mr-1.5 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {toPersianDigits(members.length)}
          </span>
          {activeTab === 'members' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`pb-3.5 px-3 text-xs font-bold transition-all relative ${
            activeTab === 'catalog'
              ? 'text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-ink-dark dark:hover:text-white'
          }`}
        >
          <span>کاتالوگ پرمیشن‌ها (دیکشنری ۲۸ تایی)</span>
          {activeTab === 'catalog' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading && !catalog ? (
        <div className="text-center py-20 text-xs text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>در حال بارگذاری اطلاعات دسترسی‌ها...</span>
        </div>
      ) : (
        <>
          {activeTab === 'roles' && (
            <RolesListTab
              roles={roles}
              onCreateClick={() => {
                setEditingRole(null);
                setIsRoleModalOpen(true);
              }}
              onEditClick={(role) => {
                setEditingRole(role);
                setIsRoleModalOpen(true);
              }}
              onDeleteClick={(role) => {
                setRoleToDelete(role);
                setDeleteError(null);
              }}
            />
          )}

          {activeTab === 'members' && (
            <MembersAccessTab
              members={members}
              availableRoles={roles}
              staffOnly={staffOnly}
              onStaffOnlyChange={(val) => setStaffOnly(val)}
              search={memberSearch}
              onSearchChange={(val) => setMemberSearch(val)}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'catalog' && catalog && (
            <PermissionCatalogTab catalog={catalog} />
          )}
        </>
      )}

      {/* Role Create / Edit Modal */}
      {isRoleModalOpen && catalog && (
        <RoleFormModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          onSubmit={handleSaveRole}
          initialRole={editingRole}
          catalog={catalog}
        />
      )}

      {/* Safe Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-sm text-ink-dark dark:text-white">
                  حذف نقش سازمانی
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  نقش: <span className="font-bold text-ink-dark dark:text-white">{roleToDelete.name}</span>
                </p>
              </div>
            </div>

            {roleToDelete.assignedUsersCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                این نقش در حال حاضر به <strong>{toPersianDigits(roleToDelete.assignedUsersCount)} کاربر</strong> اختصاص داده شده است و امکان حذف آن وجود ندارد. لطفاً ابتدا در تب اعضا، این نقش را از کاربران سلب نمایید.
              </div>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                آیا از حذف کامل این نقش سازمانی اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
            )}

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{deleteError}</div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                انصراف
              </button>
              {roleToDelete.assignedUsersCount === 0 && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteRole}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {deleteLoading ? 'در حال حذف...' : 'تایید حذف'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
