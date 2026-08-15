export interface AIProvider {
  id: string;
  name: string;
  description: string;
  requiresKey: boolean;
  defaultModel: string;
  call: (prompt: string, apiKey: string, model?: string) => Promise<string>;
}

// ----- Gemini -----
export const geminiProvider: AIProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  description: 'Gemini 2.0 Flash',
  requiresKey: true,
  defaultModel: 'gemini-2.0-flash',
  call: async (prompt: string, apiKey: string, model = 'gemini-2.0-flash') => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error: ${res.status} - ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },
};

// ----- OpenAI -----
export const openaiProvider: AIProvider = {
  id: 'openai',
  name: 'OpenAI GPT-4',
  description: 'GPT-4o mini',
  requiresKey: true,
  defaultModel: 'gpt-4o-mini',
  call: async (prompt: string, apiKey: string, model = 'gpt-4o-mini') => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a professional OSINT analyst.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} - ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },
};

// ----- Anthropic Claude (optional) -----
export const claudeProvider: AIProvider = {
  id: 'claude',
  name: 'Anthropic Claude',
  description: 'Claude 3.5 Sonnet',
  requiresKey: true,
  defaultModel: 'claude-3-5-sonnet-20241022',
  call: async (prompt: string, apiKey: string, model = 'claude-3-5-sonnet-20241022') => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude error: ${res.status} - ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  },
};

// ----- Ollama (local, no key) -----
export const ollamaProvider: AIProvider = {
  id: 'ollama',
  name: 'Ollama (Local)',
  description: 'Local LLM (e.g., llama3, mistral)',
  requiresKey: false,
  defaultModel: 'llama3.2',
  call: async (prompt: string, _apiKey: string, model = 'llama3.2') => {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.3 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status} - ${await res.text()}`);
    const data = await res.json();
    return data.response || '';
  },
};

export const ALL_AI_PROVIDERS: AIProvider[] = [
  geminiProvider,
  openaiProvider,
  claudeProvider,
  ollamaProvider,
];
