import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bot, Check, KeyRound, Network, Scale, Search, ShieldCheck, Sparkles, TerminalSquare, WandSparkles } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useLocalAssistantStore, type HermesProvider } from '../store/localAssistantStore';
import { ONBOARDING_COMPLETE_KEY, safeOnboardingNext } from '../core/onboarding';

const CLOUD_PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', model: 'gemini-3.1-flash-lite', recommended: true },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', recommended: false },
  { id: 'openai', name: 'OpenAI', model: 'gpt-4.1-mini', recommended: false },
  { id: 'claude', name: 'Anthropic Claude', model: 'claude-sonnet-4-5', recommended: false },
] as const;

const FEATURES = [
  { icon: Search, title: 'Research Mode', text: 'Collect web, academic, news, and structured sources in parallel, then build a cited answer.' },
  { icon: WandSparkles, title: 'Query Builder', text: 'Turn natural-language goals into precise dorks and reusable search strategies.' },
  { icon: Scale, title: 'AI Court', text: 'Send one question to any two AI models for independent opinions, cross-review, and a final ruling.' },
  { icon: Network, title: 'Investigation Board', text: 'Connect evidence, notes, links, images, and relationships on a persistent visual canvas.' },
  { icon: Bot, title: 'Hermes Agent', text: 'Use a tool-capable local agent with its own memory, browser, terminal, and configured skills.' },
  { icon: TerminalSquare, title: 'Local MiniCPM', text: 'Run private assistance through Ollama and let the floating helper guide QueryRecon workflows.' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const keys = useApiKeysStore(state => state.keys);
  const models = useApiKeysStore(state => state.models);
  const setKey = useApiKeysStore(state => state.setKey);
  const setModel = useApiKeysStore(state => state.setModel);
  const assistant = useLocalAssistantStore();
  const [step, setStep] = useState(0);
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>(keys);
  const [draftModels, setDraftModels] = useState<Record<string, string>>(models);
  const [runtime, setRuntime] = useState(assistant.runtime);
  const [ollamaEndpoint, setOllamaEndpoint] = useState(assistant.endpoint);
  const [ollamaModel, setOllamaModel] = useState(assistant.model);
  const [hermesEndpoint, setHermesEndpoint] = useState(assistant.hermesEndpoint);
  const [hermesKey, setHermesKey] = useState(assistant.hermesApiKey);
  const [hermesProvider, setHermesProvider] = useState<HermesProvider>(assistant.hermesProvider);
  const [hermesModel, setHermesModel] = useState(assistant.hermesModel);

  const finish = (save = true) => {
    if (save) {
      CLOUD_PROVIDERS.forEach(provider => {
        setKey(provider.id, draftKeys[provider.id]?.trim() || '');
        setModel(provider.id, draftModels[provider.id]?.trim() || provider.model);
      });
      assistant.setRuntime(runtime);
      assistant.setEndpoint(ollamaEndpoint.trim() || 'http://localhost:11434');
      assistant.setModel(ollamaModel.trim() || 'minicpm5-1b');
      assistant.setHermesEndpoint(hermesEndpoint.trim() || 'http://localhost:8642');
      assistant.setHermesApiKey(hermesKey.trim());
      assistant.setHermesProvider(hermesProvider);
      assistant.setHermesModel(hermesModel.trim() || 'minicpm5-1b');
    }
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, '1');
    navigate(safeOnboardingNext(searchParams.get('next')), { replace: true });
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-background px-4 py-6 sm:px-8 lg:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Sparkles className="h-5 w-5" /></span><div><p className="font-semibold tracking-tight text-foreground">QueryRecon</p><p className="text-xs text-muted-foreground">Intelligence research workspace</p></div></div>
          <Button variant="ghost" onClick={() => finish(false)}>Skip setup</Button>
        </header>

        <div className="my-8 grid grid-cols-3 gap-2" aria-label={`Setup step ${step + 1} of 3`}>{['Discover', 'Cloud AI', 'Local AI'].map((label, index) => <div key={label}><div className={`h-1 rounded-full transition-colors duration-200 ${index <= step ? 'bg-primary' : 'bg-border'}`} /><p className={`mt-2 text-[0.68rem] font-semibold tracking-wider uppercase ${index === step ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p></div>)}</div>

        <section key={step} className="flex-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          {step === 0 && <div><Badge variant="secondary" className="mb-4"><Sparkles /> Version 2</Badge><h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-6xl">Research, reason, and investigate from one workspace.</h1><p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">QueryRecon combines structured query building, deep multi-source research, visual evidence mapping, local agents, and multi-model deliberation. This setup takes about two minutes.</p><div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(feature => <Card key={feature.title} className="gap-3 border-border/80 bg-surface p-5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><feature.icon className="h-4 w-4" /></span><div><h2 className="font-semibold text-foreground">{feature.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.text}</p></div></Card>)}</div></div>}

          {step === 1 && <div><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span><div><h1 className="text-3xl font-semibold tracking-tight text-foreground">Connect cloud AI</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Add only the providers you use. Gemini powers the strongest default experience; AI Court can use any two configured providers, including two models from the same provider.</p></div></div><div className="mt-8 grid gap-4 lg:grid-cols-2">{CLOUD_PROVIDERS.map(provider => <Card key={provider.id} className="gap-4 border-border/80 bg-surface p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-foreground">{provider.name}</h2><p className="text-xs text-muted-foreground">Optional API connection</p></div>{provider.recommended && <Badge>Recommended</Badge>}</div><label className="grid gap-1.5 text-xs font-medium">API key<Input type="password" autoComplete="off" value={draftKeys[provider.id] || ''} onChange={event => setDraftKeys(current => ({ ...current, [provider.id]: event.target.value }))} placeholder={`${provider.name} API key`} /></label><label className="grid gap-1.5 text-xs font-medium">Preferred model<Input value={draftModels[provider.id] || provider.model} onChange={event => setDraftModels(current => ({ ...current, [provider.id]: event.target.value }))} placeholder={provider.model} className="font-mono text-xs" /></label></Card>)}</div><p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Keys are stored in this browser profile and excluded from Git. You can change or test them later in Settings.</p></div>}

          {step === 2 && <div><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="h-5 w-5" /></span><div><h1 className="text-3xl font-semibold tracking-tight text-foreground">Choose your local assistant</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Ollama provides direct, private in-app guidance. Hermes adds an agent gateway with its own tools, memory, browser, terminal, and permission controls.</p></div></div><div className="mt-8 grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]"><Card className="h-fit gap-3 border-border/80 bg-surface p-5"><p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Assistant runtime</p><Select value={runtime} onValueChange={value => value && setRuntime(value as 'ollama' | 'hermes')}><SelectTrigger className="h-12 w-full bg-background px-3"><SelectValue /></SelectTrigger><SelectContent align="start" className="p-1.5 shadow-xl"><SelectItem value="ollama" className="min-h-12 px-3">Ollama · direct local model</SelectItem><SelectItem value="hermes" className="min-h-12 px-3">Hermes · agent gateway</SelectItem></SelectContent></Select><p className="text-xs leading-5 text-muted-foreground">Both modes remain available later from Settings and the floating assistant.</p></Card><Card className="gap-4 border-border/80 bg-surface p-5">{runtime === 'ollama' ? <><div><h2 className="font-semibold text-foreground">Ollama connection</h2><p className="mt-1 text-xs text-muted-foreground">Recommended for MiniCPM5 and private local guidance.</p></div><label className="grid gap-1.5 text-xs font-medium">Endpoint<Input value={ollamaEndpoint} onChange={event => setOllamaEndpoint(event.target.value)} placeholder="http://localhost:11434" /></label><label className="grid gap-1.5 text-xs font-medium">Model<Input value={ollamaModel} onChange={event => setOllamaModel(event.target.value)} placeholder="minicpm5-1b" className="font-mono text-xs" /></label></> : <><div><h2 className="font-semibold text-foreground">Hermes gateway</h2><p className="mt-1 text-xs text-muted-foreground">Run <code>hermes gateway run</code>, keep it on localhost, and paste its API_SERVER_KEY below.</p></div><label className="grid gap-1.5 text-xs font-medium">Gateway endpoint<Input value={hermesEndpoint} onChange={event => setHermesEndpoint(event.target.value)} placeholder="http://localhost:8642" /></label><label className="grid gap-1.5 text-xs font-medium">Gateway API key<Input type="password" autoComplete="off" value={hermesKey} onChange={event => setHermesKey(event.target.value)} placeholder="API_SERVER_KEY" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium">Inference provider<Select value={hermesProvider} onValueChange={value => value && setHermesProvider(value as HermesProvider)}><SelectTrigger className="h-10 w-full bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="custom">Local / custom</SelectItem><SelectItem value="gemini">Gemini</SelectItem><SelectItem value="deepseek">DeepSeek</SelectItem><SelectItem value="bedrock">Amazon Bedrock</SelectItem></SelectContent></Select></label><label className="grid gap-1.5 text-xs font-medium">Hermes model<Input value={hermesModel} onChange={event => setHermesModel(event.target.value)} placeholder="gemini-3.1-flash-lite" className="font-mono text-xs" /></label></div></>}</Card></div></div>}
        </section>

        <footer className="mt-8 flex items-center justify-between border-t border-border/70 pt-5"><Button variant="ghost" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0}><ArrowLeft /> Back</Button>{step < 2 ? <Button onClick={() => setStep(current => current + 1)}>Continue <ArrowRight /></Button> : <Button onClick={() => finish(true)}><Check /> Save and open QueryRecon</Button>}</footer>
      </div>
    </main>
  );
}
