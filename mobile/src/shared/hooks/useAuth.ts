import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../core/firebase';

export type EvaluatorRole = 'evaluator' | 'certified_evaluator' | 'admin';

export type AuthState = {
  user: User | null;
  role: EvaluatorRole | null;
  idToken: string | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    idToken: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const [tokenResult, idToken] = await Promise.all([
          user.getIdTokenResult(),
          user.getIdToken(),
        ]);
        const role = (tokenResult.claims['role'] as EvaluatorRole) ?? null;
        setState({ user, role, idToken, loading: false });
      } else {
        setState({ user: null, role: null, idToken: null, loading: false });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
