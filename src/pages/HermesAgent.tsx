import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Clipboard, Cloud, Cpu, Database, KeyRound, Loader2, RefreshCw, Send, TerminalSquare } from 'lucide-react';
import { AssistantMessages } from '../components/assistant/AssistantMessages';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from '../components/ui/toast';
import { useApiKeysStore } from '../store/apiKeysStore';
import { type HermesProvider, useLocalAssistantStore } from '../store/localAssistantStore';

const PROVIDERS: Array<{ id: HermesProvider; name: string; note: string; icon: typeof Cpu }> = [
  { id: 'custom', name: 'Local model', note: 'Ollama or another local OpenAI-compatible server', icon: Cpu },
  { id: 'gemini', name: 'Gemini', note: 'Google AI Studio models through Hermes', icon: Cloud },
  { id: 'deepseek', name: 'DeepSeek', note: 'DeepSeek cloud models through Hermes', icon: Database },
];

const QUICK_ACTIONS = [
  'Inspect the current project and explain its main features.',
  'Create a research plan for comparing SQL and NoSQL.',
  'Suggest a precise search query and explain each operator.',
];

export default function HermesAgent() {
  const endpoint = useLocalAssistantStore(state => state.hermesEndpoint);
  const gatewayKey = useLocalAssistantStore(state => state.hermesApiKey);
  const provider = useLocalAssistantStore(state => state.hermesProvider);
  const model = useLocalAssistantStore(state => state.hermesModel);
  const messages = useLocalAssistantStore(state => state.messages);
  const setEndpoint = useLocalAssistantStore(state => state.setHermesEndpoint);
  const setGatewayKey = useLocalAssistantStore(state => state.setHermesApiKey);
  const setProvider = useLocalAssistantStore(state => state.setHermesProvider);
  const setModel = useLocalAssistantStore(state => state.setHermesModel);
  const setRuntime = useLocalAssistantStore(state => state.setRuntime);
  const addMessage = useLocalAssistantStore(state => state.addMessage);
  const keys = useApiKeysStore(state => state.keys);
  const setKey = useApiKeysStore(state => state.setKey);
  const [providerKey, setProviderKey] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setProviderKey(provider === 'custom' ? '' : keys[provider] || '');
    setAvailableModels([]);
  }, [keys, provider]);

  const setupCommands = useMemo(() => [
    'hermes model',
    'hermes config set API_SERVER_ENABLED true',
    'hermes config set API_SERVER_KEY YOUR_GATEWAY_KEY',
    `hermes config set API_SERVER_CORS_ORIGINS ${window.location.origin}`,
    'hermes gateway',
  ].join('\n'), []);

  const chooseProvider = (nextProvider: HermesProvider) => {
    setProvider(nextProvider);
    setRuntime('hermes');
    if (nextProvider === 'custom') setModel(useLocalAssistantStore.getState().model);
    else setModel('');
  };

  const discoverModels = async () => {
    setChecking(true);
    try {
      const { listHermesModels, testHermesAgent } = await import('../core/localAssistant');
      await testHermesAgent(endpoint, gatewayKey);
      const discovered = await listHermesModels(endpoint, gatewayKey, provider);
      setAvailableModels(discovered);
      setConnected(true);
      if (!model && discovered[0]) setModel(discovered[0]);
      toast(discovered.length ? `Found ${discovered.length} ${provider} model${discovered.length === 1 ? '' : 's'}.` : 'Hermes is online, but this provider has no configured models.', discovered.length ? 'success' : 'error');
    } catch (error) {
      setConnected(false);
      toast(error instanceof Error ? error.message : 'Could not connect to Hermes Agent.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const copySetup = async () => {
    try {
      await navigator.clipboard.writeText(setupCommands);
      toast('Hermes setup commands copied.', 'success');
    } catch {
      toast('Could not copy. Select the commands manually.', 'error');
    }
  };

  const saveProviderKey = () => {
    if (provider === 'custom') return;
    setKey(provider, providerKey.trim());
    toast(`${provider === 'gemini' ? 'Gemini' : 'DeepSeek'} key saved locally for QueryRecon. Run “hermes model” once to register it with Hermes too.`, 'success');
  };

  const send = async (value = input) => {
    const prompt = value.trim();
    if (!prompt || !model.trim() || busy) return;
    setInput('');
    setBusy(true);
    setRuntime('hermes');
    const context = messages.filter(message => message.id !== 'welcome').map(({ role, content }) => ({ role, content }));
    addMessage({ id: crypto.randomUUID(), role: 'user', content: prompt, createdAt: Date.now() });
    try {
      const { runHermesAgent } = await import('../core/localAssistant');
      const content = await runHermesAgent(prompt, endpoint, gatewayKey, '/hermes-agent', context, { provider, model });
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content, createdAt: Date.now() });
      setConnected(true);
    } catch (error) {
      setConnected(false);
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hermes could not complete this request. ${error instanceof Error ? error.message : 'Check the gateway and provider configuration.'}`,
        createdAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="h-full overflow-y-auto bg-background px-4 py-6 sm:px-7 lg:px-10">
      <div className="mx-auto flex min-h-full max-w-[96rem] flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-primary uppercase"><TerminalSquare className="h-4 w-4" /> Agent workspace</div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Hermes Agent</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Connect QueryRecon to the real Hermes gateway, choose a configured inference provider for each run, and keep the complete conversation saved in this browser.</p>
          </div>
          <Badge variant={connected ? 'default' : 'outline'} className="h-7 rounded-md px-3">
            {connected ? <CheckCircle2 /> : <Bot />} {connected ? 'Gateway connected' : 'Gateway not checked'}
          </Badge>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.75fr)]">
          <Card className="flex min-h-[42rem] flex-col overflow-hidden border-border/80 bg-surface">
            <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Persistent agent chat</h2>
                <p className="text-xs text-muted-foreground">{provider} · {model || 'select a model'} · saved after every message</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => useLocalAssistantStore.getState().clearMessages()}>Clear chat</Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <AssistantMessages messages={messages} busy={busy} busyLabel={`Hermes is running ${model || 'the selected model'}…`} quickActions={QUICK_ACTIONS} onQuickAction={action => void send(action)} />
            </div>
            <form onSubmit={event => { event.preventDefault(); void send(); }} className="border-t border-border/80 bg-background/25 p-4">
              <div className="flex items-end gap-3">
                <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={3} disabled={busy} placeholder={model ? 'Give Hermes a task…' : 'Choose or discover a model before sending…'} className="min-h-16 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60" aria-label="Message Hermes Agent" />
                <Button type="submit" size="icon-lg" className="h-12 w-12 rounded-xl" disabled={!input.trim() || !model.trim() || busy} aria-label="Send to Hermes"><Send /></Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Hermes may use terminal, files, browser, memory, or other tools enabled in your Hermes installation.</p>
            </form>
          </Card>

          <aside className="space-y-5">
            <Card className="space-y-5 border-border/80 bg-surface p-5">
              <div>
                <h2 className="font-semibold text-foreground">Inference route</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Hermes owns tool execution. QueryRecon sends a per-request provider and model override.</p>
              </div>
              <div className="grid gap-2">
                {PROVIDERS.map(item => {
                  const Icon = item.icon;
                  const active = provider === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => chooseProvider(item.id)} className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? 'border-primary/45 bg-primary/8 text-foreground' : 'border-border/70 bg-background/30 text-muted-foreground hover:border-primary/25 hover:text-foreground'}`}>
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} />
                      <span><span className="block text-sm font-medium">{item.name}</span><span className="mt-0.5 block text-xs leading-4">{item.note}</span></span>
                    </button>
                  );
                })}
              </div>

              <label className="grid gap-1.5 text-xs font-medium text-foreground">
                Model
                <Input list="hermes-models" value={model} onChange={event => setModel(event.target.value)} placeholder="Discover or enter an exact model ID" className="h-10" />
                <datalist id="hermes-models">{availableModels.map(item => <option key={item} value={item} />)}</datalist>
              </label>
              <Button variant="outline" className="w-full" onClick={() => void discoverModels()} disabled={checking}>{checking ? <Loader2 className="animate-spin" /> : <RefreshCw />} Test gateway and discover models</Button>
            </Card>

            <Card className="space-y-4 border-border/80 bg-surface p-5">
              <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><h2 className="font-semibold text-foreground">Gateway connection</h2></div>
              <label className="grid gap-1.5 text-xs font-medium text-foreground">Endpoint<Input value={endpoint} onChange={event => { setEndpoint(event.target.value); setConnected(false); }} placeholder="http://localhost:8642" className="h-10" /></label>
              <label className="grid gap-1.5 text-xs font-medium text-foreground">Gateway API key<Input type="password" value={gatewayKey} onChange={event => { setGatewayKey(event.target.value); setConnected(false); }} placeholder="API_SERVER_KEY" className="h-10" /></label>
              {provider !== 'custom' && (
                <div className="space-y-2 border-t border-border/70 pt-4">
                  <label className="grid gap-1.5 text-xs font-medium text-foreground">{provider === 'gemini' ? 'Gemini' : 'DeepSeek'} API key<Input type="password" value={providerKey} onChange={event => setProviderKey(event.target.value)} placeholder={provider === 'gemini' ? 'Google AI Studio key' : 'DeepSeek API key'} className="h-10" /></label>
                  <Button variant="secondary" size="sm" onClick={saveProviderKey} disabled={!providerKey.trim()}>Save key for QueryRecon</Button>
                  <p className="text-[0.7rem] leading-5 text-muted-foreground">For security, the gateway does not accept provider secrets in chat requests. Run <code>hermes model</code> once and paste this key into Hermes as well.</p>
                </div>
              )}
            </Card>

            <Card className="space-y-3 border-warning/25 bg-warning/5 p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-foreground">First-time setup</h2><Button variant="ghost" size="icon-sm" onClick={() => void copySetup()} aria-label="Copy setup commands"><Clipboard /></Button></div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/70 p-3 font-mono text-[0.68rem] leading-5 text-muted-foreground">{setupCommands}</pre>
              <p className="text-xs leading-5 text-warning">Local Hermes models require at least a 64K context window for tool workflows. MiniCPM5-1B with the current 1K low-memory profile is suitable for QueryRecon’s direct assistant, but not the full Hermes tool loop.</p>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
