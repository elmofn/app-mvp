import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

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
  signIn: (login: string, password: string) => Promise<SignInResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ account: null, token: null });
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    loadSession()
      .then((session) => {
        if (session) {
          setState({ account: session.account, token: session.token });
        }
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const signIn = async (login: string, password: string) => {
    setIsSigningIn(true);
    try {
      const response = await apiSignIn(login, password);
      if (response.success && response.token && response.accountDetails) {
        setState({
          account: response.accountDetails,
          token: response.token,
        });
        await saveSession(response.token, response.accountDetails);
      }
      return response;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    setState({ account: null, token: null });
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ ...state, isRestoring, isSigningIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
