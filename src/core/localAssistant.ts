import { parseNaturalLanguageQuery } from './queryIntelligence';
import { useQueryStore } from '../store/queryStore';

const APP_ROUTES = {
  dashboard: '/dashboard',
  builder: '/builder',
  research: '/research-mode',
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

function inferSafeActions(prompt: string): SafeAction[] {
  const normalized = prompt.toLowerCase();
  if (/\b(undo|revert)\b/.test(normalized)) return [{ type: 'undoQuery' }];
  if (/\b(build|create|make|generate|write)\b[\s\S]{0,80}\b(query|dork)\b|\b(query|dork)\b[\s\S]{0,80}\b(build|create|make|generate|write)\b/.test(normalized)) {
    return [{ type: 'buildQuery', description: prompt }];
  }
  if (!/\b(go|open|navigate|show|visit|take me)\b/.test(normalized)) return [];

  const aliases: Array<[AssistantPage, RegExp]> = [
    ['research', /\bresearch(?: mode| page)?\b/],
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

export async function runHermesAgent(prompt: string, endpoint: string, apiKey: string, currentPath: string): Promise<string> {
  const baseURL = normalizeEndpoint(endpoint);
  const response = await fetch(`${baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: hermesHeaders(apiKey),
    body: JSON.stringify({
      model: 'hermes-agent',
      stream: false,
      messages: [
        {
          role: 'system',
          content: `You are the local Hermes Agent connected to QueryRecon. The visible app route is ${currentPath}. Help with research planning, query design, and the tools enabled in your Hermes installation. Be explicit about actions you actually completed. You cannot directly click QueryRecon UI controls through this API.`,
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Hermes Agent returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Hermes Agent returned no assistant message.');
  return content.trim();
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

export async function runLocalAssistant(prompt: string, endpoint: string, model: string, currentPath: string): Promise<string> {
  const actions = inferSafeActions(prompt);
  if (actions.length) return executeSafeActions(actions);

  const baseURL = normalizeEndpoint(endpoint);
  const instructions = `You are QueryRecon's private local guide running as MiniCPM5-1B.
Help the user operate the application. Keep replies concise.
Current route: ${currentPath}
Available pages: dashboard, builder, research, board, templates, saved, sessions, history, operators, settings.
QueryRecon, not you, will decide whether an app action is permitted.
Never invent completed actions, access files, delete data, or execute web searches. Phrase action replies as an intention; QueryRecon will append verified results.`;

  const response = await fetch(`${baseURL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model.trim(),
      messages: [{ role: 'system', content: instructions }, { role: 'user', content: prompt }],
      think: false,
      stream: false,
      options: { temperature: 0.1, num_predict: 256 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const data = await response.json();
  const reply = typeof data.message?.content === 'string' ? data.message.content.trim() : '';
  if (!reply) throw new Error('Ollama returned no assistant message.');
  return reply;
}
