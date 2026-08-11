import type { QueryNode } from './query';

const SYSTEM_PROMPT = "You are an expert OSINT researcher and Google Dorking specialist. \nYour task is to convert natural language queries into a JSON abstract syntax tree (AST) for a query builder.\n\nThe AST must follow this TypeScript interface:\ninterface QueryNode {\n  id: string; // generate a random UUID\n  type: 'group' | 'term' | 'operator';\n  booleanOp?: 'AND' | 'OR' | 'NOT'; // required if type is 'group'\n  operator?: string; // required if type is 'operator'. Use valid google operators (site, intitle, inurl, ext, filetype, etc)\n  value?: string; // required if type is 'term' or 'operator'\n  children?: QueryNode[]; // required if type is 'group'\n  negated?: boolean; // optional, true if the node is excluded (-)\n}\n\nReturn ONLY a raw JSON object representing the root node (a 'group' node). Do not include markdown code blocks (like ```json), just the raw JSON object.";

export async function parseQueryWithAI(prompt: string, apiKey: string): Promise<QueryNode> {
  if (!apiKey) throw new Error('API Key is missing');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('AI parsing failed: ' + err);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Invalid response from AI');

  try {
    return JSON.parse(text) as QueryNode;
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON: ' + text);
  }
}

export async function generateResearchSummary(topic: string, findings: string[], apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('API Key is missing');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const findingsText = findings.length > 0 ? `\n\nCollected findings:\n${findings.join('\n')}` : '';

  const payload = {
    contents: [{ parts: [{ text: `Research topic: "${topic}"${findingsText}\n\nProvide a structured research brief.` }] }],
    systemInstruction: { parts: [{ text: "You are a research analyst. Given a topic and any collected findings, produce a structured research brief with these sections:\n\n## Overview\nBrief summary of the topic.\n\n## Key Facts\nBulleted list of important facts and statistics.\n\n## Major Players\nOrganizations, people, or entities involved.\n\n## Timeline\nChronological sequence of important events.\n\n## Suggested Follow-up\nRecommended research directions.\n\nFormat in clean Markdown." }] },
    generationConfig: {
      temperature: 0.3,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('AI summary failed: ' + err);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Invalid response from AI');
  return text;
}
