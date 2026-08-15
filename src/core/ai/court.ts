export type CourtMode = 'standard' | 'god';
export type CourtProvider = 'gemini' | 'deepseek';
export type CourtStage = 'opinion' | 'review' | 'verdict';

export interface CourtUsage {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
}

export interface CourtResponse {
  provider: CourtProvider;
  model: string;
  stage: CourtStage;
  content: string;
  reasoning?: string;
  usage?: CourtUsage;
  latencyMs: number;
  error?: string;
}

export interface CourtHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface RunCourtInput {
  question: string;
  history?: CourtHistoryItem[];
  mode: CourtMode;
  judge: CourtProvider;
  gemini: { apiKey: string; model: string };
  deepseek: { apiKey: string; model: string };
  onProgress?: (label: string) => void | Promise<void>;
  onPartial?: (partial: { opinions?: CourtResponse[]; reviews?: CourtResponse[] }) => void | Promise<void>;
}

export interface CourtResult {
  opinions: CourtResponse[];
  reviews: CourtResponse[];
  verdict: CourtResponse;
  usage: CourtUsage;
}

const OUTPUT_RULES = `Return a useful, direct answer in Markdown. Use a comparison table when it improves understanding. You may embed a real, relevant HTTPS image with Markdown image syntax, but never invent an image URL. For numeric comparisons you may add a fenced chart block containing only JSON in this exact shape: {"title":"...","labels":["A","B"],"values":[10,20],"unit":"%"}. Clearly distinguish facts, uncertainty, and recommendations.`;

function historyText(history: CourtHistoryItem[] = []): string {
  if (!history.length) return 'No earlier discussion in this case.';
  return history.slice(-10).map(item => `${item.role === 'user' ? 'User' : 'Court'}: ${item.content}`).join('\n\n');
}

function asError(error: unknown): string {
  return error instanceof Error ? error.message : 'The provider returned an unknown error.';
}

async function readJson(response: Response): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.error || body?.message || `HTTP ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return body;
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  stage: CourtStage,
  mode: CourtMode,
): Promise<CourtResponse> {
  const started = performance.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const baseConfig: Record<string, unknown> = {
    temperature: stage === 'verdict' ? 0.25 : 0.45,
    maxOutputTokens: mode === 'god' ? 16384 : 4096,
  };
  const request = async (includeThinking: boolean) => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: includeThinking
        ? { ...baseConfig, thinkingConfig: { includeThoughts: true, thinkingLevel: 'HIGH' } }
        : baseConfig,
    }),
  });

  let response = await request(mode === 'god');
  if (!response.ok && mode === 'god' && response.status === 400) response = await request(false);
  const data = await readJson(response);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts.filter((part: any) => !part?.thought).map((part: any) => part?.text || '').join('\n').trim();
  const reasoning = parts.filter((part: any) => part?.thought).map((part: any) => part?.text || '').join('\n').trim();
  if (!content) throw new Error('Gemini returned no visible answer.');
  const rawUsage = data?.usageMetadata || {};
  return {
    provider: 'gemini', model, stage, content, reasoning: reasoning || undefined,
    latencyMs: Math.round(performance.now() - started),
    usage: {
      promptTokens: rawUsage.promptTokenCount,
      completionTokens: rawUsage.candidatesTokenCount,
      reasoningTokens: rawUsage.thoughtsTokenCount,
      totalTokens: rawUsage.totalTokenCount,
    },
  };
}

async function callDeepSeek(
  apiKey: string,
  model: string,
  prompt: string,
  stage: CourtStage,
  mode: CourtMode,
): Promise<CourtResponse> {
  const started = performance.now();
  const request = (advanced: boolean) => fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a careful expert participating in a multi-model deliberation. Follow the output rules and never claim consensus when evidence conflicts.' },
        { role: 'user', content: prompt },
      ],
      temperature: stage === 'verdict' ? 0.25 : 0.45,
      max_tokens: mode === 'god' ? 16384 : 4096,
      ...(advanced ? { thinking: { type: 'enabled' }, reasoning_effort: 'max' } : {}),
      }),
    });
  let response = await request(mode === 'god');
  if (!response.ok && mode === 'god' && response.status === 400) response = await request(false);
  const data = await readJson(response);
  const message = data?.choices?.[0]?.message || {};
  const content = String(message.content || '').trim();
  if (!content) throw new Error('DeepSeek returned no visible answer.');
  const rawUsage = data?.usage || {};
  return {
    provider: 'deepseek', model, stage, content,
    reasoning: String(message.reasoning_content || '').trim() || undefined,
    latencyMs: Math.round(performance.now() - started),
    usage: {
      promptTokens: rawUsage.prompt_tokens,
      completionTokens: rawUsage.completion_tokens,
      reasoningTokens: rawUsage.completion_tokens_details?.reasoning_tokens,
      totalTokens: rawUsage.total_tokens,
    },
  };
}

async function callProvider(provider: CourtProvider, input: RunCourtInput, prompt: string, stage: CourtStage) {
  const config = input[provider];
  return provider === 'gemini'
    ? callGemini(config.apiKey, config.model, prompt, stage, input.mode)
    : callDeepSeek(config.apiKey, config.model, prompt, stage, input.mode);
}

async function safeCall(provider: CourtProvider, input: RunCourtInput, prompt: string, stage: CourtStage): Promise<CourtResponse> {
  try {
    return await callProvider(provider, input, prompt, stage);
  } catch (error) {
    return { provider, model: input[provider].model, stage, content: '', latencyMs: 0, error: asError(error) };
  }
}

function totalUsage(responses: CourtResponse[]): CourtUsage {
  const total = (key: keyof CourtUsage) => responses.reduce((sum, response) => sum + (response.usage?.[key] || 0), 0) || undefined;
  return { promptTokens: total('promptTokens'), completionTokens: total('completionTokens'), reasoningTokens: total('reasoningTokens'), totalTokens: total('totalTokens') };
}

export async function runAICourt(input: RunCourtInput): Promise<CourtResult> {
  const context = historyText(input.history);
  const opinionPrompt = `CASE QUESTION\n${input.question}\n\nSHARED CASE HISTORY\n${context}\n\nGive your independent expert opinion before seeing the other model's answer. ${OUTPUT_RULES}`;
  await input.onProgress?.('Gemini and DeepSeek are forming independent opinions');
  const opinions = await Promise.all([
    safeCall('gemini', input, opinionPrompt, 'opinion'),
    safeCall('deepseek', input, opinionPrompt, 'opinion'),
  ]);
  await input.onPartial?.({ opinions });
  const successful = opinions.filter(item => !item.error);
  if (!successful.length) throw new Error(`Both providers failed. Gemini: ${opinions[0].error} DeepSeek: ${opinions[1].error}`);

  const reviews: CourtResponse[] = [];
  if (input.mode === 'god' && successful.length === 2) {
    await input.onProgress?.('The models are cross-examining each other');
    const [gemini, deepseek] = opinions;
    reviews.push(...await Promise.all([
      safeCall('gemini', input, `Review DeepSeek's opinion below. Identify correct points, errors, unsupported claims, and missing evidence. Propose precise corrections.\n\nDEEPSEEK OPINION\n${deepseek.content}\n\nORIGINAL QUESTION\n${input.question}\n\n${OUTPUT_RULES}`, 'review'),
      safeCall('deepseek', input, `Review Gemini's opinion below. Identify correct points, errors, unsupported claims, and missing evidence. Propose precise corrections.\n\nGEMINI OPINION\n${gemini.content}\n\nORIGINAL QUESTION\n${input.question}\n\n${OUTPUT_RULES}`, 'review'),
    ]));
    await input.onPartial?.({ reviews });
  }

  await input.onProgress?.(`${input.judge === 'gemini' ? 'Gemini' : 'DeepSeek'} is writing the final ruling`);
  const record = [...opinions, ...reviews]
    .map(item => `${item.provider.toUpperCase()} ${item.stage.toUpperCase()}${item.error ? ' (FAILED)' : ''}:\n${item.error || item.content}`)
    .join('\n\n---\n\n');
  const verdictPrompt = `Act as the final judge. Resolve the case using the complete record from both models. Produce ONE authoritative answer with: a short ruling, the full answer, a disagreements/uncertainties section only when needed, and practical next steps. Do not mention hidden chain-of-thought. If one provider failed, clearly label the ruling as partial consensus.\n\nQUESTION\n${input.question}\n\nCOURT RECORD\n${record}\n\n${OUTPUT_RULES}`;
  const verdict = await safeCall(input.judge, input, verdictPrompt, 'verdict');
  if (verdict.error) {
    const fallback = successful[0];
    verdict.content = `## Partial ruling\n\nThe selected judge failed to synthesize the case: ${verdict.error}\n\n${fallback.content}`;
  }
  const all = [...opinions, ...reviews, verdict];
  return { opinions, reviews, verdict, usage: totalUsage(all) };
}
