export type UserRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'STAFF';

export interface UserProfile {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  permissions?: string[];
  isPlatformAdmin?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    theme: string;
  };
}
