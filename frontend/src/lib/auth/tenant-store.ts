import { create } from 'zustand';
import { TenantInfo, BrandThemeKey } from '../../types/tenant';

interface TenantState {
  currentTenant: TenantInfo | null;
  theme: BrandThemeKey;
  setCurrentTenant: (tenant: TenantInfo) => void;
  setTheme: (theme: BrandThemeKey) => void;
  clearTenant: () => void;
}

export const ROKAD_BRANCHES: Record<'boys' | 'girls', TenantInfo> = {
  boys: {
    id: 'boys-tenant-id',
    name: 'هنرستان فنی و حرفه‌ای پسرانه رُکاد',
    slug: 'rokad-boys',
    type: 'SCHOOL',
    theme: 'male',
    logoUrl: '/logo.svg',
  },
  girls: {
    id: 'girls-tenant-id',
    name: 'هنرستان فنی و حرفه‌ای دخترانه رُکاد',
    slug: 'rokad-girls',
    type: 'SCHOOL',
    theme: 'female',
    logoUrl: '/logo.svg',
  },
};

export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: ROKAD_BRANCHES.boys,
  theme: 'male',

  setCurrentTenant: (tenant) => {
    const rawTheme = (tenant.theme || (tenant.slug === 'rokad-girls' ? 'female' : 'male')).toLowerCase() as BrandThemeKey;
    set({
      currentTenant: tenant,
      theme: ['ecosystem', 'male', 'female', 'college', 'club'].includes(rawTheme)
        ? rawTheme
        : 'male',
    });
  },

  setTheme: (theme) => set({ theme }),

  clearTenant: () => set({ currentTenant: ROKAD_BRANCHES.boys, theme: 'male' }),
}));

