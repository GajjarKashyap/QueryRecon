import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LocalAssistantRuntime = 'ollama' | 'hermes';
export interface LocalAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

const welcomeMessage = (): LocalAssistantMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: 'Local assistant ready. I can explain QueryRecon, open pages, and build reversible queries.',
  createdAt: Date.now(),
});

interface LocalAssistantState {
  runtime: LocalAssistantRuntime;
  endpoint: string;
  model: string;
  hermesEndpoint: string;
  hermesApiKey: string;
  isOpen: boolean;
  messages: LocalAssistantMessage[];
  setRuntime: (runtime: LocalAssistantRuntime) => void;
  setEndpoint: (endpoint: string) => void;
  setModel: (model: string) => void;
  setHermesEndpoint: (endpoint: string) => void;
  setHermesApiKey: (apiKey: string) => void;
  setOpen: (isOpen: boolean) => void;
  addMessage: (message: LocalAssistantMessage) => void;
  clearMessages: () => void;
}

export const useLocalAssistantStore = create<LocalAssistantState>()(
  persist(
    set => ({
      runtime: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'minicpm5-1b',
      hermesEndpoint: 'http://localhost:8642',
      hermesApiKey: '',
      isOpen: false,
      messages: [welcomeMessage()],
      setRuntime: runtime => set({ runtime }),
      setEndpoint: endpoint => set({ endpoint }),
      setModel: model => set({ model }),
      setHermesEndpoint: hermesEndpoint => set({ hermesEndpoint }),
      setHermesApiKey: hermesApiKey => set({ hermesApiKey }),
      setOpen: isOpen => set({ isOpen }),
      addMessage: message => set(state => ({ messages: [...state.messages, message].slice(-50) })),
      clearMessages: () => set({ messages: [welcomeMessage()] }),
    }),
    { name: 'query-recon-local-assistant' }
  )
);
