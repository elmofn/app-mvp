import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SignInAccountDetails } from '@/src/services/auth';

const TOKEN_KEY = 'travelback.token.v2';
const ACCOUNT_KEY = 'travelback.account.v2';

export type StoredSession = {
  token: string;
  account: SignInAccountDetails;
};

export async function saveSession(token: string, account: SignInAccountDetails): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const [token, accountStr] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      AsyncStorage.getItem(ACCOUNT_KEY),
    ]);
    if (!token || !accountStr) return null;
    return { token, account: JSON.parse(accountStr) as SignInAccountDetails };
  } catch (err) {
    console.warn('[storage] failed to load session:', err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
    AsyncStorage.removeItem(ACCOUNT_KEY).catch(() => undefined),
  ]);
}
