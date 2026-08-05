export type UserRole = 'ADMIN' | 'HR' | 'EMPLOYEE';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string | null;
  roles: string[];
  permissions: string[];
};

export type LoginMethod = 'password' | 'otp';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};
