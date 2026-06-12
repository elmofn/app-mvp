import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { authenticateWithBiometric, getBiometricStatus } from '@/src/services/biometric';
import { formatLocationPayload, getCachedLocation, getCurrentLocation } from '@/src/services/location';
import {
  signIn as apiSignIn,
  SignInAccountDetails,
  SignInResponse,
} from '@/src/services/auth';
import { clearSession, loadSession, saveSession } from '@/src/services/storage';

type AuthState = {
  account: SignInAccountDetails | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  isRestoring: boolean;
  isSigningIn: boolean;
  isLocked: boolean;
  biometricAvailable: boolean;
  signIn: (login: string, password: string) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  lock: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ account: null, token: null });
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Mantemos um ref do state atual para o AppState listener acessar sem
  // virar dependencia (re-attachar listener a cada render seria caro).
  const stateRef = useRef(state);
  stateRef.current = state;
  const biometricAvailableRef = useRef(false);
  biometricAvailableRef.current = biometricAvailable;

  // Boot: restaura sessao, dispara location e checa hardware biometrico.
  useEffect(() => {
    // Disparo da geolocation eh fire-and-forget - n bloqueia o boot. O
    // resultado fica cacheado em getCachedLocation() para o proximo signIn.
    getCurrentLocation().catch(() => undefined);

    Promise.all([loadSession(), getBiometricStatus()])
      .then(([session, status]) => {
        const available = status === 'available';
        setBiometricAvailable(available);
        if (session) {
          setState({ account: session.account, token: session.token });
          // Se havia sessao persistida + biometria disponivel, ja entra
          // travado - o BiometricGate exibe o prompt assim que renderiza.
          if (available) {
            setIsLocked(true);
          }
        }
      })
      .finally(() => setIsRestoring(false));
  }, []);

  // AppState: ao voltar do background com sessao ativa + biometria, tranca
  // a sessao para forcar nova autenticacao biometrica.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (stateRef.current.token && biometricAvailableRef.current) {
          setIsLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    setIsSigningIn(true);
    try {
      // Usa a coord cacheada se ja temos. Se ainda nao chegou, tenta
      // fetchar agora (provavelmente vem rapido em rede + GPS quente).
      let coords = getCachedLocation();
      if (!coords) coords = await getCurrentLocation();
      const geolocation = formatLocationPayload(coords);

      const response = await apiSignIn(login, password, geolocation);
      if (response.success && response.token && response.accountDetails) {
        setState({
          account: response.accountDetails,
          token: response.token,
        });
        await saveSession(response.token, response.accountDetails);
        setIsLocked(false);
      }
      return response;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setState({ account: null, token: null });
    setIsLocked(false);
    await clearSession();
  }, []);

  const unlock = useCallback(async () => {
    const result = await authenticateWithBiometric('Unlock TravelBACK');
    if (result.success) {
      setIsLocked(false);
      return true;
    }
    console.warn('[auth] unlock failed:', result.error, result.warning);
    return false;
  }, []);

  const lock = useCallback(() => {
    if (stateRef.current.token) setIsLocked(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isRestoring,
        isSigningIn,
        isLocked,
        biometricAvailable,
        signIn,
        signOut,
        unlock,
        lock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
