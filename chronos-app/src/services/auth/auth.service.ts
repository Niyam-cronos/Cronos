import { API, API_PATHS } from '@/constants';
import type { ApiEnvelope } from '@/types';
import type { AuthTokens, AuthUser, LoginMethod } from '@/types';
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '@/lib/auth-storage';

class AuthHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

async function post<T>(path: string, body?: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API.baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseEnvelope<T>(response);
  if (!payload.success || payload.data === undefined) {
    throw new AuthHttpError(payload.error || payload.message || 'Request failed', response.status);
  }
  return payload.data;
}

async function get<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API.baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await parseEnvelope<T>(response);
  if (!payload.success || payload.data === undefined) {
    throw new AuthHttpError(payload.error || payload.message || 'Request failed', response.status);
  }
  return payload.data;
}

export async function refreshSession(): Promise<AuthTokens> {
  const tokens = await getStoredTokens();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token');
  }

  const data = await post<AuthTokens & { user: AuthUser }>('/api/v1/auth/refresh', {
    refreshToken: tokens.refreshToken,
  });

  const next = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  await setStoredTokens(next);
  return next;
}

async function getValidAccessToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens?.accessToken) {
    throw new Error('Not authenticated');
  }
  return tokens.accessToken;
}

export async function getLoginMethod(email: string): Promise<LoginMethod> {
  const data = await post<{ method: LoginMethod }>(API_PATHS.auth.loginMethod, { email });
  return data.method;
}

export async function requestLoginOtp(email: string): Promise<{ message: string }> {
  return post<{ message: string }>(API_PATHS.auth.requestOtp, { email });
}

export async function verifyLoginOtp(email: string, otp: string): Promise<AuthUser> {
  const data = await post<AuthTokens & { user: AuthUser }>(API_PATHS.auth.verifyOtp, { email, otp });
  await setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const data = await post<AuthTokens & { user: AuthUser }>(API_PATHS.auth.login, { email, password });
  await setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const accessToken = await getValidAccessToken();

  try {
    return await get<AuthUser>(API_PATHS.auth.me, accessToken);
  } catch (error) {
    if (!(error instanceof AuthHttpError) || error.status !== 401) {
      throw error;
    }

    const refreshed = await refreshSession();
    return get<AuthUser>(API_PATHS.auth.me, refreshed.accessToken);
  }
}

export async function logout(): Promise<void> {
  const tokens = await getStoredTokens();
  await clearStoredTokens();
  if (tokens?.refreshToken) {
    await fetch(`${API.baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => undefined);
  }
}

export async function hasStoredSession(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return Boolean(tokens?.accessToken && tokens?.refreshToken);
}
