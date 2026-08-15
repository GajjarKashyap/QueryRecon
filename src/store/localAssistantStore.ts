import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LocalAssistantRuntime = 'ollama' | 'hermes';
export type HermesProvider = 'custom' | 'gemini' | 'deepseek' | 'bedrock';
export interface LocalAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
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
  hermesProvider: HermesProvider;
  hermesModel: string;
  hermesAutoRoute: boolean;
  hermesCheapModel: string;
  hermesPowerfulModel: string;
  isOpen: boolean;
  isFullscreen: boolean;
  messages: LocalAssistantMessage[];
  setRuntime: (runtime: LocalAssistantRuntime) => void;
  setEndpoint: (endpoint: string) => void;
  setModel: (model: string) => void;
  setHermesEndpoint: (endpoint: string) => void;
  setHermesApiKey: (apiKey: string) => void;
  setHermesProvider: (provider: HermesProvider) => void;
  setHermesModel: (model: string) => void;
  setHermesAutoRoute: (enabled: boolean) => void;
  setHermesCheapModel: (model: string) => void;
  setHermesPowerfulModel: (model: string) => void;
  setOpen: (isOpen: boolean) => void;
  setFullscreen: (isFullscreen: boolean) => void;
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
      hermesProvider: 'custom',
      hermesModel: 'minicpm5-1b',
      hermesAutoRoute: true,
      hermesCheapModel: 'amazon.nova-lite-v1:0',
      hermesPowerfulModel: '',
      isOpen: false,
      isFullscreen: false,
      messages: [welcomeMessage()],
      setRuntime: runtime => set({ runtime }),
      setEndpoint: endpoint => set({ endpoint }),
      setModel: model => set({ model }),
      setHermesEndpoint: hermesEndpoint => set({ hermesEndpoint }),
      setHermesApiKey: hermesApiKey => set({ hermesApiKey }),
      setHermesProvider: hermesProvider => set({ hermesProvider }),
      setHermesModel: hermesModel => set({ hermesModel }),
      setHermesAutoRoute: hermesAutoRoute => set({ hermesAutoRoute }),
      setHermesCheapModel: hermesCheapModel => set({ hermesCheapModel }),
      setHermesPowerfulModel: hermesPowerfulModel => set({ hermesPowerfulModel }),
      setOpen: isOpen => set({ isOpen }),
      setFullscreen: isFullscreen => set({ isFullscreen }),
      addMessage: message => set(state => ({ messages: [...state.messages, message].slice(-50) })),
      clearMessages: () => set({ messages: [welcomeMessage()] }),
    }),
    { name: 'query-recon-local-assistant' }
  )
);
