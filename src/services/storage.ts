import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SignInAccountDetails, SignInAccountDetailsSchema } from '@/src/services/auth';

const TOKEN_KEY = 'travelback.token';
const ACCOUNT_KEY = 'travelback.account';

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

    const raw = JSON.parse(accountStr);
    const parsed = SignInAccountDetailsSchema.safeParse(raw);
    if (!parsed.success) {
      // O cache nao bate com o schema atual (campo novo obrigatorio adicionado,
      // renomeacao, ou cache pre-Zod). Descarta e forca novo login.
      console.warn('[storage] cached account failed schema validation, clearing:', parsed.error.issues);
      await clearSession();
      return null;
    }
    return { token, account: parsed.data };
  } catch (err) {
    console.warn('[storage] failed to load session:', err);
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
    AsyncStorage.removeItem(ACCOUNT_KEY).catch(() => undefined),
  ]);
}
