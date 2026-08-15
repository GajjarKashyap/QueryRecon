import { useEffect, useRef, useState } from 'react';
import { Bot, BrainCircuit, Download, Loader2, Maximize2, Minimize2, RotateCcw, Send, Settings2, Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useLocalAssistantStore } from '../../store/localAssistantStore';

const QUICK_ACTIONS = ['Open Research Mode', 'Open Query Builder', 'Explain this page'];

export function LocalAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollAnchor = useRef<HTMLDivElement>(null);
  const endpoint = useLocalAssistantStore(state => state.endpoint);
  const model = useLocalAssistantStore(state => state.model);
  const runtime = useLocalAssistantStore(state => state.runtime);
  const hermesEndpoint = useLocalAssistantStore(state => state.hermesEndpoint);
  const hermesApiKey = useLocalAssistantStore(state => state.hermesApiKey);
  const open = useLocalAssistantStore(state => state.isOpen);
  const fullscreen = useLocalAssistantStore(state => state.isFullscreen);
  const messages = useLocalAssistantStore(state => state.messages);
  const setOpen = useLocalAssistantStore(state => state.setOpen);
  const setFullscreen = useLocalAssistantStore(state => state.setFullscreen);
  const addMessage = useLocalAssistantStore(state => state.addMessage);
  const clearMessages = useLocalAssistantStore(state => state.clearMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, busy]);

  const downloadChat = () => {
    const transcript = messages
      .filter(message => message.id !== 'welcome')
      .map(message => `## ${message.role === 'user' ? 'You' : runtime === 'hermes' ? 'Hermes Agent' : 'MiniCPM5'}\n\n${message.thinking ? `<details>\n<summary>Thinking</summary>\n\n${message.thinking}\n\n</details>\n\n` : ''}${message.content}`)
      .join('\n\n---\n\n');
    const url = URL.createObjectURL(new Blob([`# QueryRecon local assistant chat\n\n${transcript}`], { type: 'text/markdown' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `queryrecon-chat-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const send = async (value = input) => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    setInput('');
    setBusy(true);
    const context = messages.filter(message => message.id !== 'welcome').map(({ role, content }) => ({ role, content }));
    addMessage({ id: crypto.randomUUID(), role: 'user', content: prompt, createdAt: Date.now() });
    try {
      const assistant = await import('../../core/localAssistant');
      const result = runtime === 'hermes'
        ? { content: await assistant.runHermesAgent(prompt, hermesEndpoint, hermesApiKey, location.pathname, context) }
        : await assistant.runLocalAssistant(prompt, endpoint, model, location.pathname, context);
      addMessage({ id: crypto.randomUUID(), role: 'assistant', ...result, createdAt: Date.now() });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown local model error';
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        createdAt: Date.now(),
        content: runtime === 'hermes'
          ? `Hermes is offline. Start “hermes gateway”, then check its endpoint, API key, and CORS settings. ${detail}`
          : `MiniCPM5 is offline. Start Ollama, then verify the endpoint and model in Settings. ${detail}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className={fullscreen && open ? 'fixed inset-0 z-50 bg-background/90 p-0 backdrop-blur-xl' : 'fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5'} aria-label="Local AI assistant">
      {open && (
        <Card className={fullscreen ? 'flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-surface-elevated' : 'mb-3 flex h-[min(38rem,calc(100dvh-6.5rem))] w-[min(27rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden border-primary/25 bg-surface-elevated shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl'}>
          <header className="flex items-center justify-between border-b border-border/80 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-elevated bg-success" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight">{runtime === 'hermes' ? 'Hermes Agent' : 'MiniCPM5 local'}</p>
                <p className="text-[0.68rem] text-muted-foreground">{runtime === 'hermes' ? 'Tool access follows Hermes settings' : `${model} · private via Ollama`}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={downloadChat} disabled={messages.length <= 1} aria-label="Download saved chat"><Download /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setFullscreen(!fullscreen)} aria-label={fullscreen ? 'Exit full screen' : 'Open full screen'}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/settings')} aria-label="Open assistant settings"><Settings2 /></Button>
              <Button variant="ghost" size="icon-sm" onClick={clearMessages} aria-label="Clear assistant conversation"><RotateCcw /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close local assistant"><X /></Button>
            </div>
          </header>

          <div className={`flex-1 space-y-4 overflow-y-auto px-4 py-5 ${fullscreen ? 'mx-auto w-full max-w-5xl' : ''}`} aria-live="polite">
            {messages.map(message => (
              <article key={message.id} className={`flex max-w-[92%] gap-2.5 ${message.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[0.6rem] font-bold ${message.role === 'user' ? 'bg-foreground/10 text-foreground' : 'bg-primary/10 text-primary'}`}>
                  {message.role === 'user' ? 'YOU' : <Sparkles className="h-3 w-3" />}
                </span>
                <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-tr-md bg-primary text-primary-foreground' : 'rounded-tl-md border border-border/70 bg-background/80 text-foreground'}`}>
                  {message.thinking && (
                    <details className="group mb-2 rounded-xl border border-primary/15 bg-primary/5 text-xs text-muted-foreground">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-foreground marker:content-none">
                        <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                        Thinking
                        <span className="ml-auto text-[0.6rem] uppercase tracking-wider group-open:hidden">Show</span>
                        <span className="ml-auto hidden text-[0.6rem] uppercase tracking-wider group-open:inline">Hide</span>
                      </summary>
                      <div className="max-h-52 overflow-y-auto whitespace-pre-wrap border-t border-primary/10 px-3 py-2 font-mono text-[0.7rem] leading-5">{message.thinking}</div>
                    </details>
                  )}
                  <p className="whitespace-pre-wrap text-pretty">{message.content}</p>
                  <time className={`mt-1 block text-[0.6rem] tabular-nums ${message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              </article>
            ))}
            {messages.length === 1 && (
              <div className="grid gap-2 pt-1">
                {QUICK_ACTIONS.map(action => (
                  <button key={action} type="button" onClick={() => void send(action)} className="rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                    {action}
                  </button>
                ))}
              </div>
            )}
            {busy && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                {runtime === 'hermes' ? 'Hermes is working…' : 'MiniCPM5 is responding locally…'}
              </div>
            )}
            <div ref={scrollAnchor} />
          </div>

          <footer className={`border-t border-border/80 bg-background/25 p-3 ${fullscreen ? 'mx-auto w-full max-w-5xl' : ''}`}>
            <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={runtime === 'hermes' ? 'Ask Hermes to research or use a tool…' : 'Ask or tell MiniCPM what to open…'}
                disabled={busy}
                rows={2}
                className="min-h-12 max-h-28 flex-1 resize-none rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                aria-label="Message local assistant"
              />
              <Button type="submit" size="icon-lg" className="h-12 w-12 rounded-xl" disabled={!input.trim() || busy} aria-label="Send to local assistant"><Send className="h-4 w-4" /></Button>
            </form>
            <p className="mt-2 px-1 text-[0.65rem] text-muted-foreground">Enter to send · recent chat is used as context · saved locally after every reply</p>
          </footer>
        </Card>
      )}

      {!fullscreen && (
        <Button onClick={() => setOpen(!open)} className="h-12 rounded-xl border border-primary/30 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]" aria-label={open ? 'Close local assistant' : 'Open local assistant'}>
          <Bot className="mr-2 h-5 w-5" /> {runtime === 'hermes' ? 'Hermes' : 'MiniCPM5'}
        </Button>
      )}
    </aside>
  );
}
