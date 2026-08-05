export type UserRole = 'ADMIN' | 'HR' | 'EMPLOYEE';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

export type LoginMethod = 'password' | 'otp';
