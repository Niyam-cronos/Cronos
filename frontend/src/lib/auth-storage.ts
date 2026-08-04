const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getApiUrl() {
  return API_URL;
}

export function getStoredTokens() {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
