import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@/types';

const TOKENS_KEY = 'chronos_auth_tokens';

export async function getStoredTokens(): Promise<AuthTokens | null> {
  try {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export async function setStoredTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearStoredTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}
