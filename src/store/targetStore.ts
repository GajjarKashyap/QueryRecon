import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TargetState {
  domain: string;
  companyName: string;
  email: string;
  ip: string;
  setTarget: (target: Partial<TargetState>) => void;
  clearTarget: () => void;
}

export const useTargetStore = create<TargetState>()(
  persist(
    (set) => ({
      domain: '',
      companyName: '',
      email: '',
      ip: '',
      setTarget: (target) => set((state) => ({ ...state, ...target })),
      clearTarget: () => set({ domain: '', companyName: '', email: '', ip: '' }),
    }),
    {
      name: 'query-recon-target-storage',
    }
  )
);
