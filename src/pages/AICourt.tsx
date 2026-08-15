import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BrainCircuit, CheckCircle2, Gavel, Loader2, Plus, RefreshCw, Scale, Send, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ResearchAnswer } from '../components/research/ResearchAnswer';
import { toast } from '../components/ui/toast';
import { runAICourt, type CourtProvider, type CourtResponse } from '../core/ai/court';
import { db, type AICourtCase, type AICourtTurn } from '../store/db';
import { useApiKeysStore } from '../store/apiKeysStore';

const PROVIDERS: { id: CourtProvider; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'claude', label: 'Anthropic Claude' },
];

const DEFAULT_MODELS: Record<CourtProvider, string> = {
  gemini: 'gemini-3.1-flash-lite',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4.1-mini',
  claude: 'claude-sonnet-4-5',
};

const MODEL_PRESETS: Record<CourtProvider, string[]> = {
  gemini: ['gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  claude: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'],
};

type Participant = { provider: CourtProvider; model: string };

function ModelPicker({ provider, model, discovered, onChange }: { provider: CourtProvider; model: string; discovered: string[]; onChange: (model: string) => void }) {
  const options = [...new Set([...MODEL_PRESETS[provider], ...discovered])];
  const custom = !options.includes(model);
  return <div className="grid gap-2"><select value={custom ? '__custom__' : model} onChange={event => onChange(event.target.value === '__custom__' ? '' : event.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary"><option value="__custom__">Custom model ID…</option>{options.map(item => <option key={item} value={item}>{item}</option>)}</select>{custom && <Input value={model} onChange={event => onChange(event.target.value)} placeholder="Enter exact model ID" />}</div>;
}

function ProviderOpinion({ response, title }: { response?: CourtResponse; title: string }) {
  if (!response) return null;
  return (
    <Card className={`gap-0 border p-5 ${response.error ? 'border-destructive/35 bg-destructive/5' : 'border-border/80 bg-surface'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{response.model} · {(response.latencyMs / 1000).toFixed(1)}s</p></div>
        <Badge variant={response.error ? 'outline' : 'secondary'}>{response.provider}</Badge>
      </div>
      {response.error ? <p className="text-sm text-destructive">{response.error}</p> : <ResearchAnswer content={response.content} />}
      {response.reasoning && (
        <details className="mt-5 rounded-lg border border-border/70 bg-background/35 p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Provider reasoning / thinking</summary>
          <div className="mt-3 border-t border-border/60 pt-3"><ResearchAnswer content={response.reasoning} /></div>
        </details>
      )}
      {response.usage?.totalTokens ? <p className="mt-4 text-[0.7rem] text-muted-foreground">{response.usage.totalTokens.toLocaleString()} tokens</p> : null}
    </Card>
  );
}

function TurnView({ turn }: { turn: AICourtTurn }) {
  return (
    <article className="space-y-4 border-b border-border/70 pb-8 last:border-0">
      <div className="ml-auto max-w-3xl rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground"><p>{turn.question}</p></div>
      {turn.status === 'running' && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /><span>{turn.progress || 'Opening the case…'}</span>
        </div>
      )}
      {turn.error && <div className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm text-destructive">{turn.error}</div>}
      {turn.opinions.length > 0 && <div className="grid gap-4 xl:grid-cols-2"><ProviderOpinion response={turn.opinions[0]} title={`${turn.opinions[0]?.provider || 'First model'} opinion`} /><ProviderOpinion response={turn.opinions[1]} title={`${turn.opinions[1]?.provider || 'Second model'} opinion`} /></div>}
      {turn.reviews.length > 0 && (
        <details className="rounded-xl border border-border bg-background/25 p-4" open>
          <summary className="cursor-pointer font-medium text-foreground">Cross-examination</summary>
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><ProviderOpinion response={turn.reviews[0]} title={`${turn.reviews[0]?.provider || 'First model'} review`} /><ProviderOpinion response={turn.reviews[1]} title={`${turn.reviews[1]?.provider || 'Second model'} review`} /></div>
        </details>
      )}
      {turn.verdict && (
        <Card className="gap-0 border-primary/35 bg-primary/5 p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Gavel className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold text-foreground">Final ruling</h3></div><Badge><CheckCircle2 /> {turn.judge} judge</Badge></div>
          <ResearchAnswer content={turn.verdict.content} />
          {turn.verdict.reasoning && <details className="mt-5 rounded-lg border border-primary/20 p-3"><summary className="cursor-pointer text-xs font-medium text-muted-foreground">Judge reasoning / thinking</summary><div className="mt-3"><ResearchAnswer content={turn.verdict.reasoning} /></div></details>}
          {turn.usage?.totalTokens ? <p className="mt-5 text-xs text-muted-foreground">Total court usage: {turn.usage.totalTokens.toLocaleString()} tokens across this turn.</p> : null}
        </Card>
      )}
    </article>
  );
}

export default function AICourt() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const keys = useApiKeysStore(state => state.keys);
  const savedModels = useApiKeysStore(state => state.models);
  const setSavedModel = useApiKeysStore(state => state.setModel);
  const cases = useLiveQuery(() => db.courtCases.orderBy('updatedAt').reverse().toArray(), [], []);
  const [activeCase, setActiveCase] = useState<AICourtCase | null>(null);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'standard' | 'god'>('standard');
  const [judge, setJudge] = useState<0 | 1>(0);
  const [participants, setParticipants] = useState<[Participant, Participant]>([
    { provider: 'gemini', model: savedModels.gemini || DEFAULT_MODELS.gemini },
    { provider: 'deepseek', model: savedModels.deepseek === 'auto' ? DEFAULT_MODELS.deepseek : savedModels.deepseek || DEFAULT_MODELS.deepseek },
  ]);
  const [availableModels, setAvailableModels] = useState<Partial<Record<CourtProvider, string[]>>>({});
  const [detecting, setDetecting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!caseId) { setActiveCase(null); return; }
    let active = true;
    void db.courtCases.get(caseId).then(value => { if (active) setActiveCase(value || null); });
    return () => { active = false; };
  }, [caseId, cases]);

  const canRun = Boolean(question.trim() && participants.every(item => keys[item.provider] && item.model.trim()) && !busy);
  const totalCalls = mode === 'god' ? 5 : 3;
  const latestUsage = useMemo(() => activeCase?.turns.reduce((sum, turn) => sum + (turn.usage?.totalTokens || 0), 0) || 0, [activeCase]);

  const detectModels = async () => {
    const selectedProviders = [...new Set(participants.map(item => item.provider))];
    if (selectedProviders.some(provider => !keys[provider])) { toast('Save API keys for both selected providers in Settings first.', 'error'); return; }
    setDetecting(true);
    const [{ listGeminiModels }, { listDeepSeekModels }] = await Promise.all([import('../core/localAssistant'), import('../core/research/aiSummary')]);
    const discover = async (provider: CourtProvider) => {
      if (provider === 'gemini') return listGeminiModels(keys.gemini);
      if (provider === 'deepseek') return listDeepSeekModels(keys.deepseek);
      if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${keys.openai}` } });
        if (!response.ok) throw new Error(`OpenAI model discovery returned HTTP ${response.status}`);
        const data = await response.json();
        return (data.data || []).map((item: { id?: string }) => item.id).filter(Boolean).sort() as string[];
      }
      return MODEL_PRESETS.claude;
    };
    const results = await Promise.allSettled(selectedProviders.map(async provider => [provider, await discover(provider)] as const));
    const found = Object.fromEntries(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
    setAvailableModels(current => ({ ...current, ...found }));
    toast(results.some(result => result.status === 'rejected') ? 'Some models could not be detected. Use Custom model ID if needed.' : 'Models detected. Your selected models were preserved.', results.some(result => result.status === 'rejected') ? 'error' : 'success');
    setDetecting(false);
  };

  useEffect(() => {
    if (keys.gemini && keys.deepseek) void detectModels();
    // Initial discovery never replaces a selected or custom model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateParticipant = (index: 0 | 1, update: Partial<Participant>) => {
    setParticipants(current => {
      const next = [...current] as [Participant, Participant];
      const provider = update.provider || next[index].provider;
      next[index] = { ...next[index], ...update, ...(update.provider ? { model: savedModels[provider] && savedModels[provider] !== 'auto' ? savedModels[provider] : DEFAULT_MODELS[provider] } : {}) };
      return next;
    });
  };

  const updateTurn = async (id: string, updater: (turn: AICourtTurn) => AICourtTurn) => {
    const current = await db.courtCases.get(id);
    if (!current) return;
    const next = { ...current, updatedAt: Date.now(), turns: current.turns.map(turn => updater(turn)) };
    await db.courtCases.put(next);
    setActiveCase(next);
  };

  const submit = async () => {
    if (!canRun) return;
    setBusy(true);
    const now = Date.now();
    const id = activeCase?.id || crypto.randomUUID();
    const turnId = crypto.randomUUID();
    const pending: AICourtTurn = { id: turnId, question: question.trim(), mode, judge: participants[judge].provider, status: 'running', progress: 'Opening the case', createdAt: now, opinions: [], reviews: [] };
    const base: AICourtCase = activeCase || { id, title: question.trim().slice(0, 72), createdAt: now, updatedAt: now, turns: [] };
    const saved = { ...base, updatedAt: now, turns: [...base.turns, pending] };
    await db.courtCases.put(saved);
    setActiveCase(saved);
    if (!caseId) navigate(`/ai-court/${id}`, { replace: true });
    const prompt = question.trim();
    setQuestion('');
    try {
      const history = base.turns.flatMap(turn => turn.verdict ? [{ role: 'user' as const, content: turn.question }, { role: 'assistant' as const, content: turn.verdict.content }] : []);
      const result = await runAICourt({
        question: prompt, history, mode, judge,
        participants: participants.map(item => ({ ...item, apiKey: keys[item.provider] })) as [{ provider: CourtProvider; model: string; apiKey: string }, { provider: CourtProvider; model: string; apiKey: string }],
        onProgress: progress => updateTurn(id, turn => turn.id === turnId ? { ...turn, progress } : turn),
        onPartial: partial => updateTurn(id, turn => turn.id === turnId ? { ...turn, ...partial } : turn),
      });
      await updateTurn(id, turn => turn.id === turnId ? { ...turn, status: 'complete', progress: undefined, completedAt: Date.now(), opinions: result.opinions, reviews: result.reviews, verdict: result.verdict, usage: result.usage } : turn);
    } catch (error) {
      await updateTurn(id, turn => turn.id === turnId ? { ...turn, status: 'failed', progress: undefined, completedAt: Date.now(), error: error instanceof Error ? error.message : 'The court could not complete this case.' } : turn);
    } finally { setBusy(false); }
  };

  const removeCase = async (id: string) => {
    await db.courtCases.delete(id);
    if (id === caseId) navigate('/ai-court');
  };

  return (
    <main className="h-full overflow-y-auto bg-background px-4 py-6 sm:px-7 lg:px-10">
      <div className="mx-auto grid max-w-[100rem] gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Button className="w-full justify-start" onClick={() => navigate('/ai-court')}><Plus /> New case</Button>
          <Card className="gap-2 border-border/80 bg-surface p-3">
            <p className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Saved docket</p>
            {cases.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No court cases yet.</p>}
            {cases.map(item => <div key={item.id} className={`group flex items-center gap-1 rounded-lg ${item.id === caseId ? 'bg-primary/10' : 'hover:bg-muted/60'}`}><button className="min-w-0 flex-1 px-2.5 py-2 text-left" onClick={() => navigate(`/ai-court/${item.id}`)}><span className="block truncate text-sm font-medium text-foreground">{item.title}</span><span className="text-[0.68rem] text-muted-foreground">{item.turns.length} ruling{item.turns.length === 1 ? '' : 's'}</span></button><Button variant="ghost" size="icon-xs" className="mr-1 opacity-0 group-hover:opacity-100" onClick={() => void removeCase(item.id)} aria-label="Delete case"><Trash2 /></Button></div>)}
          </Card>
        </aside>

        <section className="min-w-0 space-y-6">
          <header className="border-b border-border/70 pb-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-primary uppercase"><Scale className="h-4 w-4" /> Multi-model deliberation</div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">AI Court</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Choose any two supported AI providers—or two models from the same provider—to deliberate, cross-examine, and deliver one saved ruling.</p></div>{latestUsage > 0 && <Badge variant="outline">Case usage · {latestUsage.toLocaleString()} tokens</Badge>}</div>
          </header>

          <Card className="gap-4 border-border/80 bg-surface p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              {participants.map((participant, rawIndex) => {
                const index = rawIndex as 0 | 1;
                return <div key={index} className="grid gap-3 rounded-xl border border-border/70 bg-background/25 p-4"><p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Court model {index + 1}</p><label className="grid gap-1.5 text-xs font-medium">Provider<select value={participant.provider} onChange={event => updateParticipant(index, { provider: event.target.value as CourtProvider })} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary">{PROVIDERS.map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}</select></label><label className="grid gap-1.5 text-xs font-medium">Model<ModelPicker provider={participant.provider} model={participant.model} discovered={availableModels[participant.provider] || []} onChange={model => { updateParticipant(index, { model }); setSavedModel(participant.provider, model); }} /></label></div>;
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-1.5 text-xs font-medium">Final judge<select value={judge} onChange={event => setJudge(Number(event.target.value) as 0 | 1)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary"><option value={0}>Model 1 · {participants[0].provider}</option><option value={1}>Model 2 · {participants[1].provider}</option></select></label>
              <Button variant="outline" className="self-end" onClick={() => void detectModels()} disabled={detecting}>{detecting ? <Loader2 className="animate-spin" /> : <RefreshCw />} Detect available models</Button>
            </div>
            <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${mode === 'god' ? 'border-warning/35 bg-warning/5' : 'border-border/70 bg-background/25'}`}>
              <div className="flex items-start gap-3"><BrainCircuit className={`mt-0.5 h-5 w-5 ${mode === 'god' ? 'text-warning' : 'text-primary'}`} /><div><p className="font-medium text-foreground">God Mode</p><p className="text-xs leading-5 text-muted-foreground">Cross-review plus maximum reasoning and output. Up to 5 paid calls per question; Standard uses 3.</p></div></div>
              <button type="button" role="switch" aria-checked={mode === 'god'} onClick={() => setMode(current => current === 'god' ? 'standard' : 'god')} className={`relative h-7 w-12 rounded-full transition-colors ${mode === 'god' ? 'bg-warning' : 'bg-muted'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${mode === 'god' ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
            {participants.some(item => !keys[item.provider]) && <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> Save API keys for the selected providers in Settings. Keys stay in this browser and are never added to Git.</div>}
          </Card>

          <Card className="min-h-[35rem] gap-0 border-border/80 bg-surface">
            <div className="flex-1 space-y-8 p-5 sm:p-7">{!activeCase?.turns.length ? <div className="flex min-h-72 flex-col items-center justify-center text-center"><Scale className="mb-4 h-10 w-10 text-primary/70" /><h2 className="text-lg font-semibold text-foreground">Bring a question before the court</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Ask for a comparison, plan, technical decision, research synthesis, or critique. AI consensus can still be wrong—verify important claims.</p></div> : activeCase.turns.map(turn => <TurnView key={turn.id} turn={turn} />)}</div>
            <form onSubmit={event => { event.preventDefault(); void submit(); }} className="sticky bottom-0 border-t border-border/80 bg-background/90 p-4 backdrop-blur-xl">
              <div className="flex items-end gap-3"><textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } }} rows={3} placeholder={`Ask ${participants[0].provider} and ${participants[1].provider} to decide…`} disabled={busy} className="min-h-16 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60" /><Button type="submit" size="icon-lg" className="h-12 w-12 rounded-xl" disabled={!canRun} aria-label="Submit to AI Court">{busy ? <Loader2 className="animate-spin" /> : mode === 'god' ? <Sparkles /> : <Send />}</Button></div>
              <p className="mt-2 text-xs text-muted-foreground">This run can make up to {totalCalls} provider calls. Responses, errors, reasoning, models, and token usage are saved automatically.</p>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
