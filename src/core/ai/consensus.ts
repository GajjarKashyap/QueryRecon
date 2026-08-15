import type { AIProvider } from './providers';

export async function generateConsensus(
  topic: string,
  responses: { providerName: string; response: string }[],
  leadProvider: AIProvider,
  leadApiKey: string,
  leadModel?: string
): Promise<string> {
  // Build a prompt that includes all individual responses
  const responsesText = responses
    .map((r, i) => `### Analysis from AI ${i+1} (${r.providerName})\n${r.response}\n`)
    .join('\n---\n');

  const prompt = `
You are a senior OSINT coordinator. Your task is to synthesize the following multiple AI analyses on the topic: "${topic}".

Below are the individual analyses from different AI models. They may agree, disagree, or have different angles.

${responsesText}

Please produce a **unified, fact-checked final report** that:
- Combines the strongest points from each analysis.
- Highlights any contradictions and resolves them logically.
- Provides a clear summary with sections:
  - **Executive Summary**
  - **Key Findings** (with bullet points)
  - **Discrepancies Resolved** (explain how conflicts were settled)
  - **Recommended Next Steps**
- Maintain a neutral, professional tone.

Final Report:
`;

  return await leadProvider.call(prompt, leadApiKey, leadModel || leadProvider.defaultModel);
}
