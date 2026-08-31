import { create } from 'zustand';
import { TenantInfo, BrandThemeKey } from '../../types/tenant';

interface TenantState {
  currentTenant: TenantInfo | null;
  theme: BrandThemeKey;
  setCurrentTenant: (tenant: TenantInfo) => void;
  setTheme: (theme: BrandThemeKey) => void;
  clearTenant: () => void;
}

// Default initial tenant info
const defaultTenant: TenantInfo = {
  id: '',
  name: 'مجتمع آموزشی رُکاد',
  slug: 'rokad-boys',
  type: 'SCHOOL',
  theme: 'ecosystem',
};

export const useTenantStore = create<TenantState>((set) => ({
  currentTenant: defaultTenant,
  theme: 'ecosystem',

  setCurrentTenant: (tenant) => {
    const rawTheme = (tenant.theme || 'ecosystem').toLowerCase() as BrandThemeKey;
    set({
      currentTenant: tenant,
      theme: ['ecosystem', 'male', 'female', 'college', 'club'].includes(rawTheme)
        ? rawTheme
        : 'ecosystem',
    });
  },

  setTheme: (theme) => set({ theme }),

  clearTenant: () => set({ currentTenant: null, theme: 'ecosystem' }),
}));
