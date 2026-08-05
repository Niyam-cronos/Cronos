import { createApiClient } from './api-client';
import { getApiUrl, getStoredTokens, setStoredTokens, clearStoredTokens } from './auth-storage';
import type { AuthUser } from './types';

export const api = createApiClient({
  baseUrl: getApiUrl(),
  getAccessToken: () => getStoredTokens()?.accessToken ?? null,
});

async function refreshTokens(): Promise<boolean> {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) return false;

  const response = await fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  const json = await response.json();
  if (!json.success || !json.data?.accessToken || !json.data?.refreshToken) {
    return false;
  }

  setStoredTokens(json.data.accessToken, json.data.refreshToken);
  return true;
}

export async function loginUser(email: string, password: string) {
  const res = await api.login(email, password);
  if (!res.success || !res.data) throw new Error(res.error || res.message || 'Login failed');
  setStoredTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.user;
}

export async function getLoginMethod(email: string): Promise<'otp' | 'password'> {
  const res = await api.post<{ method: 'otp' | 'password' }>('/api/v1/auth/login-method', { email });
  if (!res.success || !res.data) throw new Error(res.error || res.message || 'Could not check login method');
  return res.data.method;
}

export async function requestLoginOtp(email: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/api/v1/auth/request-otp', { email });
  if (!res.success || !res.data) throw new Error(res.error || res.message || 'Could not send code');
  return res.data;
}

export async function verifyLoginOtp(email: string, otp: string) {
  const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
    '/api/v1/auth/verify-otp',
    { email, otp }
  );
  if (!res.success || !res.data) throw new Error(res.error || res.message || 'Invalid code');
  setStoredTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.user;
}

export async function logoutUser() {
  const tokens = getStoredTokens();
  clearStoredTokens();
  if (tokens?.refreshToken) {
    await fetch(`${getApiUrl()}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
  }
}

export async function fetchMe(): Promise<AuthUser> {
  if (!getStoredTokens()) {
    throw new Error('Not authenticated');
  }

  let res = await api.me();
  if ((!res.success || !res.data) && getStoredTokens()) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await api.me();
    }
  }

  if (!res.success || !res.data) {
    clearStoredTokens();
    throw new Error(res.error || 'Not authenticated');
  }

  return res.data;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const tokens = getStoredTokens();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || json.message || 'Request failed');
  return json.data as T;
}
