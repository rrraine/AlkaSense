import { create } from 'zustand';

interface SessionState {

  activeSession: any | null;

  selectedSession: any | null;

  sessionProgress: {
    total: number;
    confirmed: number;
    pending: number;
    imageSubmitted: number;
    progress: number;
  } | null;

  // ───────────────────────────────────────────────────────────
  // Actions
  // ───────────────────────────────────────────────────────────

  setActiveSession: (
    session: any | null
  ) => void;

  setSelectedSession: (
    session: any | null
  ) => void;

  setSessionProgress: (
    progress: any
  ) => void;

  clearSession: () => void;
}

export const useSessionStore =
  create<SessionState>((set) => ({

    activeSession: null,

    selectedSession: null,

    sessionProgress: null,

    // ─────────────────────────────────────────────────────────
    // Set Active Session
    // ─────────────────────────────────────────────────────────

    setActiveSession: (
      session
    ) =>
      set({
        activeSession: session,
      }),

    // ─────────────────────────────────────────────────────────
    // Set Selected Session
    // ─────────────────────────────────────────────────────────

    setSelectedSession: (
      session
    ) =>
      set({
        selectedSession: session,
      }),

    // ─────────────────────────────────────────────────────────
    // Set Session Progress
    // ─────────────────────────────────────────────────────────

    setSessionProgress: (
      progress
    ) =>
      set({
        sessionProgress: progress,
      }),

    // ─────────────────────────────────────────────────────────
    // Clear Session
    // ─────────────────────────────────────────────────────────

    clearSession: () =>
      set({
        activeSession: null,
        selectedSession: null,
        sessionProgress: null,
      }),
  }));