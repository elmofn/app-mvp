import React, { createContext, ReactNode, useContext, useState } from 'react';

import {
  signIn as apiSignIn,
  SignInAccountDetails,
  SignInResponse,
} from '@/src/services/auth';

type AuthState = {
  account: SignInAccountDetails | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  isSigningIn: boolean;
  signIn: (login: string, password: string) => Promise<SignInResponse>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ account: null, token: null });
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async (login: string, password: string) => {
    setIsSigningIn(true);
    try {
      const response = await apiSignIn(login, password);
      if (response.success && response.token && response.accountDetails) {
        setState({
          account: response.accountDetails,
          token: response.token,
        });
      }
      return response;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = () => {
    setState({ account: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, isSigningIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
