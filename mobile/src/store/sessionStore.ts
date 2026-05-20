import { create } from 'zustand';

export type SessionForm = {
  evaluatorName: string;
  location: string;
  riceVariety: string;
  notes: string;
};

type SessionStore = {
  activeSessionId: string | null;
  form: SessionForm;
  setForm: (values: Partial<SessionForm>) => void;
  resetForm: () => void;
  setActiveSession: (id: string | null) => void;
};

const defaultForm: SessionForm = {
  evaluatorName: '',
  location: '',
  riceVariety: '',
  notes: '',
};

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,
  form: defaultForm,
  setForm: (values) => set((state) => ({ form: { ...state.form, ...values } })),
  resetForm: () => set({ form: defaultForm }),
  setActiveSession: (id) => set({ activeSessionId: id }),
}));