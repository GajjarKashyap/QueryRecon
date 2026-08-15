import { parseNaturalLanguageQuery } from './queryIntelligence';
import { useQueryStore } from '../store/queryStore';

const APP_ROUTES = {
  dashboard: '/dashboard',
  builder: '/builder',
  research: '/research-mode',
  hermes: '/hermes-agent',
  court: '/ai-court',
  board: '/board',
  templates: '/templates',
  saved: '/saved',
  sessions: '/sessions',
  history: '/history',
  operators: '/operators',
  settings: '/settings',
} as const;

type AssistantPage = keyof typeof APP_ROUTES;
type SafeAction =
  | { type: 'openPage'; page: AssistantPage }
  | { type: 'buildQuery'; description: string }
  | { type: 'undoQuery' };

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.trim().replace(/\/+$/, '');
}

export function calculateBasicExpression(prompt: string): string | null {
  const match = prompt.match(/^\s*(?:(?:please\s+)?(?:calculate|solve)|what(?:'s|\s+is))?\s*(-?\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(-?\d+(?:\.\d+)?)\s*\??\s*$/i);
  if (!match) return null;

  const left = Number(match[1]);
  const right = Number(match[3]);
  const operator = match[2];
  if ((operator === '/' || operator === '÷') && right === 0) return 'Division by zero is undefined.';

  const result = operator === '+' ? left + right
    : operator === '-' ? left - right
      : operator === '*' || operator === '×' ? left * right
        : left / right;
  return `${left} ${operator} ${right} = ${Number(result.toPrecision(12))}`;
}

export interface AssistantContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LocalAssistantResult {
  content: string;
  thinking?: string;
}

export interface HermesRunOptions {
  provider?: string;
  model?: string;
  autoRoute?: boolean;
  cheapModel?: string;
  powerfulModel?: string;
}

export function chooseHermesModel(prompt: string, fallback: string, options: HermesRunOptions): string {
  if (!options.autoRoute || options.provider !== 'bedrock') return fallback;
  const complex = prompt.length > 280 || /\b(analy[sz]e|research|investigate|compare|implement|build|create|debug|fix|refactor|architecture|security|audit|codebase|multi-step|comprehensive|sources?|citations?|files?)\b/i.test(prompt);
  return (complex ? options.powerfulModel : options.cheapModel)?.trim() || fallback;
}

interface HermesProviderOption {
  slug?: unknown;
  models?: unknown;
}

interface GeminiModelOption {
  name?: unknown;
  baseModelId?: unknown;
  supportedGenerationMethods?: unknown;
}

function recentContext(history: AssistantContextMessage[]): AssistantContextMessage[] {
  return history.slice(-6).map(message => ({ ...message, content: message.content.slice(0, 300) }));
}

function inferSafeActions(prompt: string): SafeAction[] {
  const normalized = prompt.toLowerCase();
  if (/\b(undo|revert)\b/.test(normalized)) return [{ type: 'undoQuery' }];
  if (/\b(build|create|make|generate|write)\b[\s\S]{0,80}\b(query|dork)\b|\b(query|dork)\b[\s\S]{0,80}\b(build|create|make|generate|write)\b/.test(normalized)) {
    return [{ type: 'buildQuery', description: prompt }];
  }
  if (!/\b(go|open|navigate|show|visit|take me)\b/.test(normalized)) return [];

  const aliases: Array<[AssistantPage, RegExp]> = [
    ['research', /\bresearch(?: mode| page)?\b/],
    ['hermes', /\bhermes(?: agent| page)?\b/],
    ['court', /\b(?:ai court|court page|multi-model court)\b/],
    ['builder', /\b(?:query )?builder\b/],
    ['board', /\b(?:investigation board|crazy wall|board)\b/],
    ['templates', /\btemplates?\b/],
    ['saved', /\bsaved(?: queries)?\b/],
    ['sessions', /\b(?:sessions?|collections?)\b/],
    ['history', /\bhistory\b/],
    ['operators', /\boperators?\b/],
    ['settings', /\bsettings?\b/],
    ['dashboard', /\b(?:dashboard|home)\b/],
  ];
  const match = aliases.find(([, pattern]) => pattern.test(normalized));
  return match ? [{ type: 'openPage', page: match[0] }] : [];
}

function executeSafeActions(actions: SafeAction[]): string {
  const results: string[] = [];
  for (const action of actions) {
    if (action.type === 'openPage') {
      navigate(APP_ROUTES[action.page]);
      results.push(`Opened ${action.page}.`);
    } else if (action.type === 'buildQuery') {
      useQueryStore.getState().setRootNode(parseNaturalLanguageQuery(action.description));
      navigate(APP_ROUTES.builder);
      results.push(`Built query: ${useQueryStore.getState().compiledQuery}`);
    } else {
      const store = useQueryStore.getState();
      if (!store.canUndo) results.push('Nothing to undo.');
      else {
        store.undo();
        results.push(`Undid the last query change: ${useQueryStore.getState().compiledQuery}`);
      }
    }
  }
  return results.join('\n\n');
}

function hermesHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
  };
}

export async function testHermesAgent(endpoint: string, apiKey: string): Promise<{ models: string[] }> {
  const baseURL = normalizeEndpoint(endpoint);
  const healthResponse = await fetch(`${baseURL}/health`, { headers: hermesHeaders(apiKey) });
  if (!healthResponse.ok) throw new Error(`Hermes Agent returned HTTP ${healthResponse.status}`);

  const modelsResponse = await fetch(`${baseURL}/v1/models`, { headers: hermesHeaders(apiKey) });
  if (!modelsResponse.ok) throw new Error(`Hermes models endpoint returned HTTP ${modelsResponse.status}`);
  const data = await modelsResponse.json();
  return {
    models: Array.isArray(data.data)
      ? data.data.map((item: { id?: unknown }) => item.id).filter((id: unknown): id is string => typeof id === 'string')
      : [],
  };
}

export function extractHermesModels(payload: unknown, provider: string): string[] {
  const providers = payload && typeof payload === 'object' && Array.isArray((payload as { providers?: unknown }).providers)
    ? (payload as { providers: HermesProviderOption[] }).providers
    : [];
  const exact = providers.find(row => row.slug === provider);
  const row = exact ?? (provider === 'custom' ? providers.find(item => typeof item.slug === 'string' && item.slug.startsWith('custom')) : undefined);
  if (!row || !Array.isArray(row.models)) return [];
  return row.models
    .map(model => typeof model === 'string'
      ? model
      : model && typeof model === 'object'
        ? [((model as { id?: unknown }).id), ((model as { model?: unknown }).model), ((model as { name?: unknown }).name)].find(value => typeof value === 'string')
        : undefined)
    .filter((model): model is string => typeof model === 'string' && model.trim().length > 0);
}

export function extractGeminiModels(payload: unknown): string[] {
  const models = payload && typeof payload === 'object' && Array.isArray((payload as { models?: unknown }).models)
    ? (payload as { models: GeminiModelOption[] }).models
    : [];
  return models
    .filter(model => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
    .map(model => typeof model.baseModelId === 'string'
      ? model.baseModelId
      : typeof model.name === 'string'
        ? model.name.replace(/^models\//, '')
        : '')
    .filter((model, index, all) => model.length > 0 && all.indexOf(model) === index);
}

export async function listGeminiModels(apiKey: string): Promise<string[]> {
  if (!apiKey.trim()) throw new Error('Gemini API key is missing from Settings.');
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey.trim() },
  });
  if (!response.ok) throw new Error(`Gemini model discovery returned HTTP ${response.status}`);
  return extractGeminiModels(await response.json());
}

export async function listHermesModels(endpoint: string, apiKey: string, provider: string): Promise<string[]> {
  const baseURL = normalizeEndpoint(endpoint);
  const response = await fetch(`${baseURL}/api/model/options`, { headers: hermesHeaders(apiKey) });
  if (!response.ok) throw new Error(`Hermes model discovery returned HTTP ${response.status}`);
  return extractHermesModels(await response.json(), provider);
}

export async function runHermesAgent(prompt: string, endpoint: string, apiKey: string, currentPath: string, history: AssistantContextMessage[] = [], options: HermesRunOptions = {}): Promise<LocalAssistantResult> {
  const baseURL = normalizeEndpoint(endpoint);
  const provider = options.provider?.trim();
  const model = chooseHermesModel(prompt, options.model?.trim() || 'hermes-agent', options);
  const response = await fetch(`${baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: hermesHeaders(apiKey),
    body: JSON.stringify({
      model,
      ...(provider ? { provider } : {}),
      stream: false,
      messages: [
        {
          role: 'system',
          content: `You are the local Hermes Agent connected to QueryRecon. The visible app route is ${currentPath}. Help with research planning, query design, and the tools enabled in your Hermes installation. Be explicit about actions you actually completed. You cannot directly click QueryRecon UI controls through this API.`,
        },
        ...recentContext(history),
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Hermes Agent returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const data = await response.json();
  const message = data.choices?.[0]?.message || {};
  let content = typeof message.content === 'string' ? message.content.trim() : '';
  let thinking = typeof message.reasoning_content === 'string' ? message.reasoning_content.trim() : typeof message.thinking === 'string' ? message.thinking.trim() : '';
  const tagged = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (!thinking && tagged) thinking = tagged[1].trim();
  if (tagged) content = content.replace(tagged[0], '').trim();
  if (!thinking && content.includes('</think>')) {
    const [trace, answer] = content.split('</think>', 2);
    thinking = trace.trim();
    content = answer.trim();
  }
  if (!content) throw new Error('Hermes Agent returned no assistant message.');
  return { content, thinking: thinking || undefined };
}

export async function testLocalAssistant(endpoint: string, model: string): Promise<{ models: string[]; modelAvailable: boolean }> {
  const baseURL = normalizeEndpoint(endpoint);
  const response = await fetch(`${baseURL}/api/tags`);
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const data = await response.json();
  const models: string[] = Array.isArray(data.models)
    ? data.models.map((item: { name?: unknown }) => item.name).filter((name: unknown): name is string => typeof name === 'string')
    : [];
  const requested = model.trim().toLowerCase();
  return {
    models,
    modelAvailable: models.some(name => name.toLowerCase() === requested || name.toLowerCase().startsWith(`${requested}:`)),
  };
}

export async function runLocalAssistant(prompt: string, endpoint: string, model: string, currentPath: string, history: AssistantContextMessage[] = []): Promise<LocalAssistantResult> {
  const calculation = calculateBasicExpression(prompt);
  if (calculation) return { content: calculation };

  const actions = inferSafeActions(prompt);
  if (actions.length) return { content: executeSafeActions(actions) };

  const baseURL = normalizeEndpoint(endpoint);
  const instructions = `You are QueryRecon's private local guide running as MiniCPM5-1B.
Help the user operate the application and answer simple direct questions. Keep replies concise and give the final answer immediately; never merely promise to calculate or explain it.
Current route: ${currentPath}
Available pages: dashboard, builder, research, Hermes Agent, board, templates, saved, sessions, history, operators, settings.
QueryRecon, not you, will decide whether an app action is permitted.
Never invent completed actions, access files, delete data, or execute web searches. Phrase action replies as an intention; QueryRecon will append verified results.`;

  const response = await fetch(`${baseURL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model.trim(),
      messages: [{ role: 'system', content: instructions }, ...recentContext(history), { role: 'user', content: prompt }],
      think: true,
      stream: false,
      options: { temperature: 0.1, num_predict: 256 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const data = await response.json();
  const reply = typeof data.message?.content === 'string' ? data.message.content.trim() : '';
  const thinking = typeof data.message?.thinking === 'string' ? data.message.thinking.trim() : '';
  if (!reply) throw new Error('Ollama returned no assistant message.');
  return { content: reply, thinking: thinking || undefined };
}
