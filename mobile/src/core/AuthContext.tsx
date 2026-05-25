import React, { createContext, useContext } from 'react';
import { useAuth, AuthState } from '../shared/hooks/useAuth';

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  idToken: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
