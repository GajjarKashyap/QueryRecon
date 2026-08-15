export type ResearchDepth = 'quick' | 'balanced' | 'deep';

const DEPTH_CONFIG: Record<ResearchDepth, { thinking: 'low' | 'medium' | 'high'; maxTokens: number; instruction: string }> = {
  quick: { thinking: 'low', maxTokens: 1200, instruction: 'Give a concise answer with key facts, one compact comparison table when relevant, and practical guidance.' },
  balanced: { thinking: 'medium', maxTokens: 2600, instruction: 'Give a thorough answer with definitions, a comparison table when relevant, examples, trade-offs, and practical recommendations.' },
  deep: { thinking: 'high', maxTokens: 5000, instruction: 'Give a detailed research report with nuanced comparisons, multiple examples, limitations, decision criteria, and a clear conclusion.' }
};

function buildResearchPrompt(topic: string, findings: string[], depth: ResearchDepth): string {
  const evidence = findings.filter(item => item.trim() && item.trim() !== topic.trim());
  const evidenceBlock = evidence.length > 0
    ? evidence.join('\n\n')
    : 'No supporting source excerpts were returned. Answer from established general knowledge and clearly disclose that source verification was unavailable.';

  return `You are QueryRecon's research analyst. Directly answer the user's research question.

RESEARCH QUESTION:
${topic}

SUPPORTING SOURCE MATERIAL:
${evidenceBlock}

RESPONSE DEPTH:
${DEPTH_CONFIG[depth].instruction}

RULES:
- The research question is the task, not source material to summarize.
- Never refuse to answer merely because supporting results are empty or sparse.
- Use established general knowledge to fill gaps, but distinguish it from claims verified by supplied sources.
- Correct obvious spelling errors silently and infer the user's intended question.
- Start with a direct answer; do not use an intelligence-classification memo or discuss the prompt as a document.
- For comparisons, include a useful GitHub-flavored Markdown table.
- Explain how the user can apply the answer and give concrete examples.
- Add a short "Sources and confidence" section. Cite only URLs present above; never invent citations.
- Include up to two relevant Markdown images only when direct HTTPS image URLs are present above. Never invent an image URL.
- Return clean Markdown only.`;
}

function findResponseText(data: any): string {
  const direct = data?.output_text || data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (direct) return direct;

  let text = '';
  const visit = (value: any) => {
    if (text || !value || typeof value !== 'object') return;
    if (typeof value.text === 'string' && value.text.trim() && !value.modality) {
      text = value.text;
      return;
    }
    for (const key of Object.keys(value)) visit(value[key]);
  };
  visit(data);
  return text;
}

export async function generateResearchSummary(topic: string, findings: string[], apiKey: string, depth: ResearchDepth = 'balanced'): Promise<string> {
  if (!apiKey) return 'API key is missing';
  try {
    const config = DEPTH_CONFIG[depth];
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: 'gemini-3.6-flash',
        input: buildResearchPrompt(topic, findings, depth),
        generation_config: { thinking_level: config.thinking, max_output_tokens: config.maxTokens }
      })
    });
    if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
    return findResponseText(await response.json()) || 'No answer was generated.';
  } catch (error) {
    return `Error generating answer: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export async function generateChatGptSummary(topic: string, findings: string[], apiKey: string, depth: ResearchDepth = 'balanced'): Promise<string> {
  if (!apiKey) return 'OpenAI API key is missing';
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: "You are QueryRecon's precise, practical research analyst." },
          { role: 'user', content: buildResearchPrompt(topic, findings, depth) }
        ],
        max_tokens: DEPTH_CONFIG[depth].maxTokens
      })
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No answer was generated.';
  } catch (error) {
    return `Error generating answer: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export async function listDeepSeekModels(apiKey: string): Promise<string[]> {
  if (!apiKey) throw new Error('DeepSeek API key is missing');
  const response = await fetch('https://api.deepseek.com/models', {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (!response.ok) throw new Error(`DeepSeek model discovery failed (${response.status})`);
  const data = await response.json();
  return Array.isArray(data.data)
    ? data.data.map((model: { id?: unknown }) => model.id).filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];
}

function rankDeepSeekModels(models: string[], depth: ResearchDepth): string[] {
  const uniqueModels = [...new Set(models)];
  const score = (model: string) => {
    const id = model.toLowerCase();
    if (depth === 'deep') {
      if (id.includes('pro')) return 0;
      if (id.includes('reason')) return 1;
      if (id.includes('flash')) return 2;
    } else {
      if (id.includes('flash')) return 0;
      if (id.includes('chat')) return 1;
      if (id.includes('pro')) return 2;
    }
    return 3;
  };
  return uniqueModels.sort((a, b) => score(a) - score(b) || a.localeCompare(b));
}

export async function generateDeepSeekSummary(
  topic: string,
  findings: string[],
  apiKey: string,
  depth: ResearchDepth = 'balanced',
  selectedModel = 'auto'
): Promise<string> {
  if (!apiKey) return 'DeepSeek API key is missing';
  try {
    const isDeep = depth === 'deep';
    let discoveredModels: string[] = [];
    try {
      discoveredModels = await listDeepSeekModels(apiKey);
    } catch {
      // Model discovery can be temporarily unavailable; known IDs remain as a last-resort fallback.
    }

    const preferredFallbacks = isDeep
      ? ['deepseek-v4-pro', 'deepseek-v4-flash']
      : ['deepseek-v4-flash', 'deepseek-v4-pro'];
    const candidates = rankDeepSeekModels([
      ...(selectedModel !== 'auto' ? [selectedModel] : []),
      ...discoveredModels,
      ...(discoveredModels.length === 0 ? preferredFallbacks : [])
    ], depth);
    if (selectedModel !== 'auto') {
      candidates.splice(candidates.indexOf(selectedModel), 1);
      candidates.unshift(selectedModel);
    }

    let lastError = 'No compatible model was available.';
    for (const model of candidates) {
      const supportsThinkingControl = /deepseek-v4-(flash|pro)/i.test(model);
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: "You are QueryRecon's precise, practical research analyst." },
            { role: 'user', content: buildResearchPrompt(topic, findings, depth) }
          ],
          ...(supportsThinkingControl ? { thinking: { type: isDeep ? 'enabled' : 'disabled' } } : {}),
          ...(supportsThinkingControl && isDeep ? { reasoning_effort: 'high' } : {}),
          max_tokens: DEPTH_CONFIG[depth].maxTokens,
          stream: false
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No answer was generated.';
      }

      const errorBody = await response.text();
      lastError = `Model ${model} failed (${response.status})${errorBody ? `: ${errorBody.slice(0, 240)}` : ''}`;
      if (![400, 404, 422].includes(response.status)) break;
    }
    throw new Error(lastError);
  } catch (error) {
    return `Error generating answer: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
