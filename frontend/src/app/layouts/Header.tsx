import React from 'react';
import { useAuthStore } from '../../lib/auth/auth-store';
import { useTenantStore } from '../../lib/auth/tenant-store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LogOut, Palette, School, Shield } from 'lucide-react';
import { BrandThemeKey } from '../../types/tenant';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { currentTenant, theme, setTheme } = useTenantStore();

  const themes: { key: BrandThemeKey; label: string; color: string }[] = [
    { key: 'ecosystem', label: 'اکوسیستم (اصلی)', color: '#59BBAF' },
    { key: 'male', label: 'پسرانه', color: '#202A5A' },
    { key: 'female', label: 'دخترانه', color: '#E0195B' },
    { key: 'college', label: 'کالج', color: '#F8A41D' },
    { key: 'club', label: 'کلوپ', color: '#652D90' },
  ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'سوپرادمین سامانه';
      case 'SCHOOL_ADMIN':
        return 'مدیر مدرسه';
      case 'TEACHER':
        return 'معلم / کادر آموزشی';
      case 'STUDENT':
        return 'دانش‌آموز';
      case 'PARENT':
        return 'ولی دانش‌آموز';
      default:
        return 'کاربر سامانه';
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Left (in RTL: Right) - Tenant & Title */}
      <div className="flex items-center space-x-3 space-x-reverse">
        <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center text-primary-dark border border-primary/20">
          <School className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-ink-darker leading-tight">
            {currentTenant?.name || 'پلتفرم جامع مدارس رُکاد'}
          </h1>
          <div className="flex items-center space-x-2 space-x-reverse mt-0.5">
            <span className="text-[11px] text-gray-500 font-mono">
              {currentTenant?.slug || 'rokad-platform'}
            </span>
            <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4">
              نسخه ۱.۰
            </Badge>
          </div>
        </div>
      </div>

      {/* Right (in RTL: Left) - Theme Switcher, User & Actions */}
      <div className="flex items-center space-x-4 space-x-reverse">
        {/* Theme Picker */}
        <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 space-x-1 space-x-reverse">
          <Palette className="h-4 w-4 text-gray-400 mx-1" />
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              title={t.label}
              className={`h-5 w-5 rounded-full transition-transform ${
                theme === t.key ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: t.color }}
            />
          ))}
        </div>

        {/* User Info & Role */}
        <div className="flex items-center space-x-3 space-x-reverse border-r border-gray-200 pr-4">
          <div className="text-left">
            <div className="font-bold text-xs text-ink-normal text-right">
              {user ? `${user.firstName} ${user.lastName}` : 'کاربر مهمان'}
            </div>
            <div className="flex items-center justify-end space-x-1 space-x-reverse mt-0.5">
              {user?.role === 'SUPER_ADMIN' && <Shield className="h-3 w-3 text-amber-500 ml-0.5" />}
              <span className="text-[10px] text-gray-500">
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div className="h-9 w-9 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center font-bold text-xs text-ink-normal">
            {user?.firstName ? user.firstName[0] : 'U'}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="خروج از حساب کاربری"
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
