import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LocalAssistantRuntime = 'ollama' | 'hermes';

interface LocalAssistantState {
  runtime: LocalAssistantRuntime;
  endpoint: string;
  model: string;
  hermesEndpoint: string;
  hermesApiKey: string;
  setRuntime: (runtime: LocalAssistantRuntime) => void;
  setEndpoint: (endpoint: string) => void;
  setModel: (model: string) => void;
  setHermesEndpoint: (endpoint: string) => void;
  setHermesApiKey: (apiKey: string) => void;
}

export const useLocalAssistantStore = create<LocalAssistantState>()(
  persist(
    set => ({
      runtime: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'minicpm5-1b',
      hermesEndpoint: 'http://localhost:8642',
      hermesApiKey: '',
      setRuntime: runtime => set({ runtime }),
      setEndpoint: endpoint => set({ endpoint }),
      setModel: model => set({ model }),
      setHermesEndpoint: hermesEndpoint => set({ hermesEndpoint }),
      setHermesApiKey: hermesApiKey => set({ hermesApiKey }),
    }),
    { name: 'query-recon-local-assistant' }
  )
);
