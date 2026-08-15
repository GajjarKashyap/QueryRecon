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
      {turn.opinions.length > 0 && <div className="grid gap-4 xl:grid-cols-2"><ProviderOpinion response={turn.opinions.find(item => item.provider === 'gemini')} title="Gemini opinion" /><ProviderOpinion response={turn.opinions.find(item => item.provider === 'deepseek')} title="DeepSeek opinion" /></div>}
      {turn.reviews.length > 0 && (
        <details className="rounded-xl border border-border bg-background/25 p-4" open>
          <summary className="cursor-pointer font-medium text-foreground">Cross-examination</summary>
          <div className="mt-4 grid gap-4 xl:grid-cols-2"><ProviderOpinion response={turn.reviews.find(item => item.provider === 'gemini')} title="Gemini reviews DeepSeek" /><ProviderOpinion response={turn.reviews.find(item => item.provider === 'deepseek')} title="DeepSeek reviews Gemini" /></div>
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
  const [judge, setJudge] = useState<CourtProvider>('gemini');
  const [geminiModel, setGeminiModel] = useState(savedModels.gemini || '');
  const [deepseekModel, setDeepseekModel] = useState(savedModels.deepseek === 'auto' ? '' : savedModels.deepseek || '');
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [deepseekModels, setDeepseekModels] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!caseId) { setActiveCase(null); return; }
    let active = true;
    void db.courtCases.get(caseId).then(value => { if (active) setActiveCase(value || null); });
    return () => { active = false; };
  }, [caseId, cases]);

  const canRun = Boolean(question.trim() && keys.gemini && keys.deepseek && geminiModel && deepseekModel && !busy);
  const totalCalls = mode === 'god' ? 5 : 3;
  const latestUsage = useMemo(() => activeCase?.turns.reduce((sum, turn) => sum + (turn.usage?.totalTokens || 0), 0) || 0, [activeCase]);

  const detectModels = async () => {
    if (!keys.gemini || !keys.deepseek) { toast('Save both Gemini and DeepSeek API keys in Settings first.', 'error'); return; }
    setDetecting(true);
    const [{ listGeminiModels }, { listDeepSeekModels }] = await Promise.all([import('../core/localAssistant'), import('../core/research/aiSummary')]);
    const [geminiResult, deepseekResult] = await Promise.allSettled([listGeminiModels(keys.gemini), listDeepSeekModels(keys.deepseek)]);
    if (geminiResult.status === 'fulfilled') {
      setGeminiModels(geminiResult.value);
      const selected = geminiResult.value.includes(geminiModel) ? geminiModel : geminiResult.value[0] || '';
      setGeminiModel(selected); if (selected) setSavedModel('gemini', selected);
    }
    if (deepseekResult.status === 'fulfilled') {
      setDeepseekModels(deepseekResult.value);
      const selected = deepseekResult.value.includes(deepseekModel) ? deepseekModel : deepseekResult.value[0] || '';
      setDeepseekModel(selected); if (selected) setSavedModel('deepseek', selected);
    }
    if (geminiResult.status === 'rejected' || deepseekResult.status === 'rejected') toast('Some models could not be detected. You can enter an exact model ID.', 'error');
    else toast('Gemini and DeepSeek models detected.', 'success');
    setDetecting(false);
  };

  useEffect(() => {
    if (keys.gemini && keys.deepseek && (!geminiModel || !deepseekModel)) void detectModels();
    // Model discovery is intentionally triggered only when keys become available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.gemini, keys.deepseek]);

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
    const pending: AICourtTurn = { id: turnId, question: question.trim(), mode, judge, geminiModel, deepseekModel, status: 'running', progress: 'Opening the case', createdAt: now, opinions: [], reviews: [] };
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
        gemini: { apiKey: keys.gemini, model: geminiModel },
        deepseek: { apiKey: keys.deepseek, model: deepseekModel },
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">AI Court</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Gemini and DeepSeek examine the same question in parallel, challenge each other in God Mode, and deliver one persistent ruling.</p></div>{latestUsage > 0 && <Badge variant="outline">Case usage · {latestUsage.toLocaleString()} tokens</Badge>}</div>
          </header>

          <Card className="gap-4 border-border/80 bg-surface p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.65fr_auto]">
              <label className="grid gap-1.5 text-xs font-medium">Gemini model<Input list="court-gemini-models" value={geminiModel} onChange={event => { setGeminiModel(event.target.value); setSavedModel('gemini', event.target.value); }} placeholder="Detect or enter model ID" /><datalist id="court-gemini-models">{geminiModels.map(model => <option key={model} value={model} />)}</datalist></label>
              <label className="grid gap-1.5 text-xs font-medium">DeepSeek model<Input list="court-deepseek-models" value={deepseekModel} onChange={event => { setDeepseekModel(event.target.value); setSavedModel('deepseek', event.target.value); }} placeholder="Detect or enter model ID" /><datalist id="court-deepseek-models">{deepseekModels.map(model => <option key={model} value={model} />)}</datalist></label>
              <label className="grid gap-1.5 text-xs font-medium">Final judge<select value={judge} onChange={event => setJudge(event.target.value as CourtProvider)} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary"><option value="gemini">Gemini</option><option value="deepseek">DeepSeek</option></select></label>
              <Button variant="outline" className="self-end" onClick={() => void detectModels()} disabled={detecting}>{detecting ? <Loader2 className="animate-spin" /> : <RefreshCw />} Detect</Button>
            </div>
            <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${mode === 'god' ? 'border-warning/35 bg-warning/5' : 'border-border/70 bg-background/25'}`}>
              <div className="flex items-start gap-3"><BrainCircuit className={`mt-0.5 h-5 w-5 ${mode === 'god' ? 'text-warning' : 'text-primary'}`} /><div><p className="font-medium text-foreground">God Mode</p><p className="text-xs leading-5 text-muted-foreground">Cross-review plus maximum reasoning and output. Up to 5 paid calls per question; Standard uses 3.</p></div></div>
              <button type="button" role="switch" aria-checked={mode === 'god'} onClick={() => setMode(current => current === 'god' ? 'standard' : 'god')} className={`relative h-7 w-12 rounded-full transition-colors ${mode === 'god' ? 'bg-warning' : 'bg-muted'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${mode === 'god' ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
            {(!keys.gemini || !keys.deepseek) && <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> Save both API keys in Settings. Keys stay in this browser and are never added to Git.</div>}
          </Card>

          <Card className="min-h-[35rem] gap-0 border-border/80 bg-surface">
            <div className="flex-1 space-y-8 p-5 sm:p-7">{!activeCase?.turns.length ? <div className="flex min-h-72 flex-col items-center justify-center text-center"><Scale className="mb-4 h-10 w-10 text-primary/70" /><h2 className="text-lg font-semibold text-foreground">Bring a question before the court</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Ask for a comparison, plan, technical decision, research synthesis, or critique. AI consensus can still be wrong—verify important claims.</p></div> : activeCase.turns.map(turn => <TurnView key={turn.id} turn={turn} />)}</div>
            <form onSubmit={event => { event.preventDefault(); void submit(); }} className="sticky bottom-0 border-t border-border/80 bg-background/90 p-4 backdrop-blur-xl">
              <div className="flex items-end gap-3"><textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } }} rows={3} placeholder="Ask Gemini and DeepSeek to decide…" disabled={busy} className="min-h-16 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-60" /><Button type="submit" size="icon-lg" className="h-12 w-12 rounded-xl" disabled={!canRun} aria-label="Submit to AI Court">{busy ? <Loader2 className="animate-spin" /> : mode === 'god' ? <Sparkles /> : <Send />}</Button></div>
              <p className="mt-2 text-xs text-muted-foreground">This run can make up to {totalCalls} provider calls. Responses, errors, reasoning, models, and token usage are saved automatically.</p>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
