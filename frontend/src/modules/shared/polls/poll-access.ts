import { UserRole } from '../../../types/auth';

/**
 * Roles permitted to view poll results, statistics, and analytics.
 */
export const POLL_RESULTS_VIEW_ROLES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'STAFF',
  'TEACHER',
  'COACH',
] as const;

/**
 * Roles restricted from viewing poll results (students, parents, etc.).
 */
export const POLL_RESTRICTED_ROLES: readonly UserRole[] = [
  'STUDENT',
  'PARENT',
] as const;

/**
 * Roles permitted to create and manage polls.
 */
export const POLL_MANAGEMENT_ROLES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'STAFF',
  'TEACHER',
  'COACH',
] as const;

/**
 * Checks if the given role has permission to view poll results & analytics.
 */
export function canViewPollResults(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_RESULTS_VIEW_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the given role has permission to manage polls (close, reopen, archive, delete).
 */
export function canManagePolls(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the given role has permission to create new polls.
 */
export function canCreatePolls(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the given user/role has permission to view poll results & analytics
 * considering the poll's specific configuration (allowed roles or public).
 */
export function canUserViewPollResults(
  role?: string | null,
  poll?: {
    resultsVisibleToRoles?: string[] | null;
    isResultsPublic?: boolean | null;
    createdById?: string | null;
    userCanViewResults?: boolean;
    createdBy?: { id?: string };
  } | null,
  userId?: string | null,
): boolean {
  if (!role) return false;

  // If server explicitly computed userCanViewResults
  if (poll && typeof poll.userCanViewResults === 'boolean') {
    return poll.userCanViewResults;
  }

  // Super Admin & School Admin can ALWAYS view results
  if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') {
    return true;
  }

  // Creator can always view results
  const creatorId = poll?.createdById || poll?.createdBy?.id;
  if (userId && creatorId && userId === creatorId) {
    return true;
  }

  if (poll) {
    if (poll.isResultsPublic) {
      return true;
    }
    if (
      Array.isArray(poll.resultsVisibleToRoles) &&
      poll.resultsVisibleToRoles.length > 0
    ) {
      return poll.resultsVisibleToRoles.includes(role as UserRole);
    }
  }

  // Default role permission
  return canViewPollResults(role);
}
