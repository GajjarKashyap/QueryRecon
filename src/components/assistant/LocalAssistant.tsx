import { useEffect, useState } from 'react';
import { Bot, Download, Maximize2, Minimize2, RotateCcw, Send, Settings2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useLocalAssistantStore } from '../../store/localAssistantStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { AssistantMessages } from './AssistantMessages';

const QUICK_ACTIONS = ['Open Research Mode', 'Open Query Builder', 'Explain this page'];

export function LocalAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const endpoint = useLocalAssistantStore(state => state.endpoint);
  const model = useLocalAssistantStore(state => state.model);
  const runtime = useLocalAssistantStore(state => state.runtime);
  const hermesEndpoint = useLocalAssistantStore(state => state.hermesEndpoint);
  const hermesApiKey = useLocalAssistantStore(state => state.hermesApiKey);
  const hermesProvider = useLocalAssistantStore(state => state.hermesProvider);
  const hermesModel = useLocalAssistantStore(state => state.hermesModel);
  const hermesAutoRoute = useLocalAssistantStore(state => state.hermesAutoRoute);
  const hermesCheapModel = useLocalAssistantStore(state => state.hermesCheapModel);
  const hermesPowerfulModel = useLocalAssistantStore(state => state.hermesPowerfulModel);
  const providerKey = useApiKeysStore(state => state.keys[hermesProvider] || '');
  const open = useLocalAssistantStore(state => state.isOpen);
  const fullscreen = useLocalAssistantStore(state => state.isFullscreen);
  const messages = useLocalAssistantStore(state => state.messages);
  const setOpen = useLocalAssistantStore(state => state.setOpen);
  const setFullscreen = useLocalAssistantStore(state => state.setFullscreen);
  const setRuntime = useLocalAssistantStore(state => state.setRuntime);
  const setModel = useLocalAssistantStore(state => state.setModel);
  const setHermesProvider = useLocalAssistantStore(state => state.setHermesProvider);
  const setHermesModel = useLocalAssistantStore(state => state.setHermesModel);
  const addMessage = useLocalAssistantStore(state => state.addMessage);
  const clearMessages = useLocalAssistantStore(state => state.clearMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void import('../../core/localAssistant').then(async assistant => {
      try {
        const discovered = runtime !== 'hermes'
          ? (await assistant.testLocalAssistant(endpoint, model)).models
          : hermesProvider === 'gemini' && providerKey
            ? await assistant.listGeminiModels(providerKey)
            : hermesProvider === 'deepseek' && providerKey
              ? await (await import('../../core/research/aiSummary')).listDeepSeekModels(providerKey)
              : await assistant.listHermesModels(hermesEndpoint, hermesApiKey, hermesProvider);
        if (active) {
          setAvailableModels(discovered);
          if (runtime === 'hermes' && discovered.length > 0 && !discovered.includes(useLocalAssistantStore.getState().hermesModel)) setHermesModel(discovered[0]);
        }
      } catch {
        if (active) setAvailableModels([]);
      }
    });
    return () => { active = false; };
  }, [endpoint, hermesApiKey, hermesEndpoint, hermesProvider, model, open, providerKey, runtime, setHermesModel]);

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
        ? await assistant.runHermesAgent(prompt, hermesEndpoint, hermesApiKey, location.pathname, context, { provider: hermesProvider, model: hermesModel, autoRoute: hermesAutoRoute, cheapModel: hermesCheapModel, powerfulModel: hermesPowerfulModel })
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
          : `The local model is offline. Start Ollama, then verify the endpoint and model in Settings. ${detail}`,
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
                <p className="text-sm font-semibold tracking-tight">{runtime === 'hermes' ? 'Hermes Agent' : 'Local assistant'}</p>
                <p className="text-[0.68rem] text-muted-foreground">{runtime === 'hermes' ? `${hermesProvider} · ${hermesModel}` : `${model} · private via Ollama`}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={downloadChat} disabled={messages.length <= 1} aria-label="Download saved chat"><Download /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setFullscreen(!fullscreen)} aria-label={fullscreen ? 'Exit full screen' : 'Open full screen'}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => navigate(runtime === 'hermes' ? '/hermes-agent' : '/settings')} aria-label="Open assistant settings"><Settings2 /></Button>
              <Button variant="ghost" size="icon-sm" onClick={clearMessages} aria-label="Clear assistant conversation"><RotateCcw /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close local assistant"><X /></Button>
            </div>
          </header>

          <div className={`grid gap-2 border-b border-border/80 bg-background/20 px-4 py-2.5 ${runtime === 'hermes' ? 'grid-cols-[7rem_7rem_minmax(0,1fr)]' : 'grid-cols-[7rem_minmax(0,1fr)]'}`}>
            <select value={runtime} onChange={event => setRuntime(event.target.value as 'ollama' | 'hermes')} className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground" aria-label="Assistant runtime">
              <option value="ollama">Ollama</option>
              <option value="hermes">Hermes</option>
            </select>
            {runtime === 'hermes' && (
              <select value={hermesProvider} onChange={event => { setHermesProvider(event.target.value as 'custom' | 'gemini' | 'deepseek' | 'bedrock'); setHermesModel(''); }} className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground" aria-label="Hermes provider">
                <option value="custom">Local</option>
                <option value="gemini">Gemini</option>
                <option value="deepseek">DeepSeek</option>
                <option value="bedrock">Bedrock</option>
              </select>
            )}
            <select value={runtime === 'hermes' ? hermesModel : model} onChange={event => runtime === 'hermes' ? setHermesModel(event.target.value) : setModel(event.target.value)} className="h-8 min-w-0 rounded-lg border border-border bg-background px-2 text-xs text-foreground" aria-label="Assistant model">
              <option value={runtime === 'hermes' ? hermesModel : model}>{runtime === 'hermes' ? hermesModel : model}</option>
              {availableModels.filter(item => item !== (runtime === 'hermes' ? hermesModel : model)).map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className={`flex-1 space-y-4 overflow-y-auto px-4 py-5 ${fullscreen ? 'mx-auto w-full max-w-5xl' : ''}`} aria-live="polite">
            <AssistantMessages messages={messages} busy={busy} busyLabel={runtime === 'hermes' ? 'Hermes is working…' : `${model} is responding locally…`} quickActions={QUICK_ACTIONS} onQuickAction={action => void send(action)} />
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
                placeholder={runtime === 'hermes' ? 'Ask Hermes to research or use a tool…' : `Ask ${model} or tell it what to open…`}
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
          <Bot className="mr-2 h-5 w-5" /> {runtime === 'hermes' ? 'Hermes' : model}
        </Button>
      )}
    </aside>
  );
}
