import { create } from 'zustand';
import { getActiveSessions } from '../modules/module1_session/services/SessionService';

type SessionStore = {
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  restoreActiveSession: (evaluatorId: string) => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,

  setActiveSession: (id) => set({ activeSessionId: id }),

  // Called from DashboardScreen on focus after auth is known
  restoreActiveSession: async (evaluatorId: string) => {
    const sessions = await getActiveSessions(evaluatorId);
    set({ activeSessionId: sessions[0]?.id ?? null });
  },
}));
