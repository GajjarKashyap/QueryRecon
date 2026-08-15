import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeysState {
  keys: Record<string, string>;
  models: Record<string, string>;
  setKey: (providerId: string, key: string) => void;
  setModel: (providerId: string, model: string) => void;
  getKey: (providerId: string) => string;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      keys: {
        gemini: '',
        openai: '',
        deepseek: '',
        claude: '',
      },
      models: {
        deepseek: 'auto',
      },
      setKey: (provider, key) => set((state) => ({ keys: { ...state.keys, [provider]: key } })),
      setModel: (provider, model) => set((state) => ({ models: { ...state.models, [provider]: model } })),
      getKey: (provider) => get().keys[provider] || '',
    }),
    {
      name: 'query-recon-api-keys',
    }
  )
);

