import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeysState {
  keys: Record<string, string>;
  setKey: (providerId: string, key: string) => void;
  getKey: (providerId: string) => string;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      keys: {
        gemini: '',
        openai: '',
      },
      setKey: (provider, key) => set((state) => ({ keys: { ...state.keys, [provider]: key } })),
      getKey: (provider) => get().keys[provider] || '',
    }),
    {
      name: 'query-recon-api-keys',
    }
  )
);
