import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiSource } from '../core/research/advancedApis';

interface CustomApiState {
  customApis: ApiSource[];
  addApi: (api: ApiSource) => void;
  removeApi: (id: string) => void;
}

export const useCustomApiStore = create<CustomApiState>()(
  persist(
    (set) => ({
      customApis: [],
      addApi: (api) => set((state) => ({ customApis: [...state.customApis, api] })),
      removeApi: (id) => set((state) => ({ customApis: state.customApis.filter(a => a.id !== id) })),
    }),
    {
      name: 'query-recon-custom-apis',
    }
  )
);
