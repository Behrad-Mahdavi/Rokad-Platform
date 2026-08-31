import { create } from 'zustand';
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

// Retrieve saved refresh token from sessionStorage on load (safer than localStorage)
const initialRefreshToken = typeof window !== 'undefined'
  ? sessionStorage.getItem('rokad_rt')
  : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: initialRefreshToken,
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
}));
