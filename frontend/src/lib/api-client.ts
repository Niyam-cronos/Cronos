import type { ApiResponse, AuthTokens, AuthUser } from './types';

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getAccessToken?: () => string | null;
  private onUnauthorized?: () => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAccessToken = config.getAccessToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken?.();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.onUnauthorized?.();
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  login(email: string, password: string) {
    return this.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/v1/auth/login', {
      email,
      password,
    });
  }

  logout() {
    return this.post('/api/v1/auth/logout');
  }

  me() {
    return this.get<AuthUser>('/api/v1/auth/me');
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
