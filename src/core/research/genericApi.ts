export type GenericApiItem = { label: string; url: string; snippet?: string; metadata?: Record<string, unknown> };

function firstText(record: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function normalizeApiResponse(data: any, sourceName: string, requestUrl: string, limit = 20): GenericApiItem[] {
  const candidate = Array.isArray(data)
    ? data
    : ['results', 'data', 'items', 'entries', 'records', 'hits'].map(key => data?.[key]).find(Array.isArray);
  const rows = Array.isArray(candidate) ? candidate.slice(0, limit) : [data];

  return rows.filter(Boolean).map((value, index) => {
    if (typeof value !== 'object') return { label: `${sourceName} result ${index + 1}`, url: requestUrl, snippet: String(value) };
    const label = firstText(value, ['title', 'name', 'label', 'headline', 'domain', 'id']) || `${sourceName} result ${index + 1}`;
    const url = firstText(value, ['url', 'link', 'html_url', 'permalink']) || requestUrl;
    const snippet = firstText(value, ['description', 'summary', 'snippet', 'abstract', 'body', 'content'])
      || JSON.stringify(value).slice(0, 600);
    return { label, url, snippet, metadata: value };
  });
}
