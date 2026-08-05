export const API = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
  version: 'v1',
} as const;

export const API_PATHS = {
  auth: {
    loginMethod: '/api/v1/auth/login-method',
    requestOtp: '/api/v1/auth/request-otp',
    verifyOtp: '/api/v1/auth/verify-otp',
    login: '/api/v1/auth/login',
    me: '/api/v1/auth/me',
  },
} as const;
