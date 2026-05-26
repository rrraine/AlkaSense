import { create } from 'zustand';
import { getActiveSessions } from '../modules/module1_session/services/SessionService';

type SessionStore = {
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  restoreActiveSession: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,

  setActiveSession: (id) => set({ activeSessionId: id }),

  // Called once after initDatabase() on app start — restores ACTIVE session from SQLite
  restoreActiveSession: async () => {
    const sessions = await getActiveSessions();
    set({ activeSessionId: sessions[0]?.id ?? null });
  },
}));
