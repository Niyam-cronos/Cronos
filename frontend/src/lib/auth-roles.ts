import type { AuthUser } from './types';

const STAFF_ROLES = new Set(['admin', 'hr', 'manager', 'super_admin']);

export function isStaffUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.roles.some((r) => STAFF_ROLES.has(r))) return true;
  return user.permissions.includes('employees.read') || user.permissions.includes('leave.approve');
}

export function isEmployeeUser(user: AuthUser | null | undefined): boolean {
  return !!user && !isStaffUser(user);
}

const EMPLOYEE_PATHS = ['/dashboard', '/attendance', '/leave'];

const STAFF_PATH_PREFIXES = ['/employees', '/masters', '/settings'];

export function isEmployeeAllowedPath(pathname: string): boolean {
  return EMPLOYEE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isStaffOnlyPath(pathname: string): boolean {
  return STAFF_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
