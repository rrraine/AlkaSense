import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase';
import { getCurrentEvaluator } from '../services/SessionService';
import type { User } from '../db/repositories/UserRepository';

interface UserContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUser() {
    try {
      const evaluator = await getCurrentEvaluator();
      setUser(evaluator);
    } catch (err) {
      console.error('UserContext fetch error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Re-fetch whenever Firebase auth state changes
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}