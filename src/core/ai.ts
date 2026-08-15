import type { QueryNode } from './query';

const SYSTEM_PROMPT = `You are an expert OSINT researcher and Google Dorking specialist.
Your task is to convert natural language queries into a JSON abstract syntax tree (AST) for a query builder.

The AST must follow this TypeScript interface:
interface QueryNode {
  id: string;
  type: 'group' | 'term' | 'operator';
  booleanOp?: 'AND' | 'OR' | 'NOT';
  operator?: string;
  value?: string;
  children?: QueryNode[];
  negated?: boolean;
}

Return ONLY a raw JSON object. No markdown, no explanation, just the JSON.`;

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/interactions';

async function callGeminiInteractions(apiKey: string, prompt: string): Promise<string> {
  const url = `${GEMINI_BASE}`;

  const payload = {
    model: GEMINI_MODEL,
    input: prompt
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errBody = await res.text();
    try {
      const errJson = JSON.parse(errBody);
      const msg = errJson?.error?.message || errBody;
      throw new Error(`Gemini API error (${res.status}): ${msg}`);
    } catch {
      throw new Error(`Gemini API error (${res.status}): ${errBody.slice(0, 200)}`);
    }
  }

  const data = await res.json();
  const text = data?.output_text || data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.steps?.[data.steps.length - 1]?.content?.[0]?.text || data?.steps?.[data.steps.length - 1]?.content?.parts?.[0]?.text || data?.steps?.[data.steps.length - 1]?.modelOutput?.text || (function() { let t = ''; function findText(o: any) { if (t) return; if (!o || typeof o !== 'object') return; if (typeof o.text === 'string' && o.text.trim().length > 0 && !o.modality) { t = o.text; return; } for (const k of Object.keys(o)) findText(o[k]); } findText(data); return t; })();
  if (!text) throw new Error(`Empty response from Gemini. Full response: ${JSON.stringify(data).slice(0, 300)}`);
  return text;
}

export async function parseQueryWithAI(prompt: string, apiKey: string): Promise<QueryNode> {
  if (!apiKey) throw new Error('API Key is missing. Please set your Gemini API key in Settings.');

  const fullPrompt = `${SYSTEM_PROMPT}\n\nUSER QUERY:\n${prompt}\n\nRemember: Return ONLY a raw JSON object. No markdown fences.`;
  let text = await callGeminiInteractions(apiKey, fullPrompt);

  // Strip any accidental markdown fences
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(text) as QueryNode;
  } catch {
    throw new Error(`AI returned invalid JSON. Response was:\n${text.slice(0, 300)}`);
  }
}

export async function generateResearchSummary(topic: string, findings: string[], apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('API Key is missing. Please set your Gemini API key in Settings.');

  const findingsText = findings.length > 0
    ? `\n\nCollected findings:\n${findings.join('\n')}`
    : '';

  const prompt = `You are a research analyst. Given a topic and findings, produce a structured Markdown research brief.

## Sections to include:
- ## Overview
- ## Key Facts  
- ## Major Players
- ## Timeline
- ## Suggested Follow-up

Research topic: "${topic}"${findingsText}

Provide the structured research brief now:`;

  return callGeminiInteractions(apiKey, prompt);
}

