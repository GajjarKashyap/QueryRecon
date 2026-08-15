import { useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { useLocalAssistantStore } from '../../store/localAssistantStore';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function LocalAssistant() {
  const location = useLocation();
  const endpoint = useLocalAssistantStore(state => state.endpoint);
  const model = useLocalAssistantStore(state => state.model);
  const runtime = useLocalAssistantStore(state => state.runtime);
  const hermesEndpoint = useLocalAssistantStore(state => state.hermesEndpoint);
  const hermesApiKey = useLocalAssistantStore(state => state.hermesApiKey);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'Local assistant ready. Direct Ollama mode can open pages and build reversible queries; Hermes mode provides the tools enabled in your Hermes gateway.' },
  ]);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput('');
    setBusy(true);
    setMessages(current => [...current, { id: crypto.randomUUID(), role: 'user', content: prompt }]);
    try {
      const assistant = await import('../../core/localAssistant');
      const answer = runtime === 'hermes'
        ? await assistant.runHermesAgent(prompt, hermesEndpoint, hermesApiKey, location.pathname)
        : await assistant.runLocalAssistant(prompt, endpoint, model, location.pathname);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', content: answer }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown local model error';
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: runtime === 'hermes'
          ? `I could not reach Hermes Agent. Verify that “hermes gateway” is running and check its endpoint, API key, and CORS settings. ${detail}`
          : `I could not reach MiniCPM5. Open Settings and verify Ollama, the endpoint, and model name. ${detail}`,
      }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <Card className="mb-3 flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden border-primary/30 bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Bot className="h-4 w-4" /></span>
              <div>
                <p className="text-sm font-semibold">Local guide</p>
                <p className="text-[0.65rem] text-muted-foreground">{runtime === 'hermes' ? 'Hermes Agent · local gateway' : `${model} · private via Ollama`}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(false)} aria-label="Close local assistant"><X className="h-4 w-4" /></Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map(message => (
              <div key={message.id} className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed ${message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-background text-foreground'}`}>
                {message.content}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {runtime === 'hermes' ? 'Hermes Agent is working…' : 'MiniCPM5 is deciding which safe action to use…'}</div>}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && send()}
                placeholder={runtime === 'hermes' ? 'Ask Hermes to research or use a tool…' : 'Go to Query Builder and create…'}
                disabled={busy}
              />
              <Button onClick={send} disabled={!input.trim() || busy} aria-label="Send to local assistant"><Send className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-[0.65rem] text-muted-foreground">{runtime === 'hermes' ? 'Hermes may use the toolsets enabled in its own configuration. Review its permissions.' : 'Query edits support Undo. External searches and destructive actions are unavailable.'}</p>
          </div>
        </Card>
      )}

      <Button onClick={() => setOpen(value => !value)} className="h-12 rounded-full px-4 shadow-lg" aria-label="Open local MiniCPM5 assistant">
        <Bot className="mr-2 h-5 w-5" /> {runtime === 'hermes' ? 'Hermes' : 'MiniCPM5'}
      </Button>
    </div>
  );
}
