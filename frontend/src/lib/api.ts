import { createApiClient } from './api-client';
import { getApiUrl, getStoredTokens, setStoredTokens, clearStoredTokens } from './auth-storage';
import type { AuthUser } from './types';

export const api = createApiClient({
  baseUrl: getApiUrl(),
  getAccessToken: () => getStoredTokens()?.accessToken ?? null,
  onUnauthorized: () => {
    clearStoredTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
});

export async function loginUser(email: string, password: string) {
  const res = await api.login(email, password);
  if (!res.success || !res.data) throw new Error(res.error || res.message || 'Login failed');
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
  const res = await api.me();
  if (!res.success || !res.data) throw new Error(res.error || 'Not authenticated');
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
