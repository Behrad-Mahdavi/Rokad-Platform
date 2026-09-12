import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile, UserRole } from '../../types/auth';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, accessToken: string, refreshToken?: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        if (refreshToken && typeof window !== 'undefined') {
          sessionStorage.setItem('rokad_rt', refreshToken);
        }
        set({
          user,
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        if (refreshToken && typeof window !== 'undefined') {
          sessionStorage.setItem('rokad_rt', refreshToken);
        }
        set({
          accessToken,
          refreshToken: refreshToken || get().refreshToken,
        });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('rokad_rt');
          localStorage.removeItem('rokad_auth_session');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        if (user.isPlatformAdmin) return true;

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        return allowedRoles.includes(user.role);
      },

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN' || user.isPlatformAdmin) return true;
        return user.permissions?.includes(permission) || false;
      },
    }),
    {
      name: 'rokad_auth_session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
