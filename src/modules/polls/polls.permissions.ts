import { Role } from '../../common/constants';

/**
 * Roles permitted to view poll results, voting statistics, and analytics.
 */
export const POLL_RESULTS_VIEW_ROLES: readonly Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.STAFF,
  Role.TEACHER,
  Role.COACH,
] as const;

/**
 * Roles explicitly restricted from viewing poll results (students, parents, etc.).
 */
export const POLL_RESTRICTED_ROLES: readonly Role[] = [
  Role.STUDENT,
  Role.PARENT,
] as const;

/**
 * Roles permitted to create and manage polls (open, close, archive, delete).
 */
export const POLL_MANAGEMENT_ROLES: readonly Role[] = [
  Role.SUPER_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.STAFF,
  Role.TEACHER,
  Role.COACH,
] as const;

/**
 * Checks if the provided user role is authorized to view poll results & analytics.
 */
export function canViewPollResults(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_RESULTS_VIEW_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the provided user role is authorized to manage polls.
 */
export function canManagePolls(role?: string | null): boolean {
  if (!role) return false;
  return (POLL_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if the provided user/role is authorized to view poll results & analytics
 * considering the poll's specific results visibility configuration (roles or public).
 */
export function canUserViewPollResults(
  role?: string | null,
  poll?: {
    resultsVisibleToRoles?: string[] | null;
    isResultsPublic?: boolean | null;
    createdById?: string | null;
    userCanViewResults?: boolean;
  } | null,
  userId?: string | null,
): boolean {
  if (!role) return false;

  if (poll && typeof poll.userCanViewResults === 'boolean') {
    return poll.userCanViewResults;
  }

  // Super Admin & School Admin can ALWAYS view results
  if (role === Role.SUPER_ADMIN || role === Role.SCHOOL_ADMIN) {
    return true;
  }

  // Creator can always view results
  if (userId && poll?.createdById && userId === poll.createdById) {
    return true;
  }

  if (poll) {
    // If explicitly marked as public results
    if (poll.isResultsPublic) {
      return true;
    }

    // If specific allowed roles are configured on the poll
    if (
      Array.isArray(poll.resultsVisibleToRoles) &&
      poll.resultsVisibleToRoles.length > 0
    ) {
      return poll.resultsVisibleToRoles.includes(role as Role);
    }
  }

  // Fallback to default role permissions (staff, teacher, coach)
  return canViewPollResults(role);
}
