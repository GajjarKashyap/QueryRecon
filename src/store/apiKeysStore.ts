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
        gemini: 'gemini-3.1-flash-lite',
        deepseek: 'auto',
        openai: 'gpt-4.1-mini',
        claude: 'claude-sonnet-4-5',
      },
      setKey: (provider, key) => set((state) => ({ keys: { ...state.keys, [provider]: key } })),
      setModel: (provider, model) => set((state) => ({ models: { ...state.models, [provider]: model } })),
      getKey: (provider) => get().keys[provider] || '',
    }),
    {
      name: 'query-recon-api-keys',
      version: 1,
      migrate: (persisted) => {
        const state = persisted as ApiKeysState;
        return state.models?.gemini === 'gemini-2.5-flash'
          ? { ...state, models: { ...state.models, gemini: 'gemini-3.1-flash-lite' } }
          : state;
      },
    }
  )
);

