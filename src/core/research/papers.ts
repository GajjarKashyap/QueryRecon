import { getCache, setCache } from '../cache';
import { fetchWithBackoff } from '../fetcher';
import { expandResearchQuery, getFocusedResearchQuery } from './queryExpansion';
import type { ResearchDepth } from './aiSummary';

export type AcademicProviderName = 'OpenAlex' | 'Crossref' | 'Semantic Scholar';

export type AcademicPaper = {
  title: string;
  authors: string[];
  url: string;
  year?: number;
  citationCount?: number;
  abstract?: string;
  doi?: string;
  venue?: string;
  providers: AcademicProviderName[];
};

export type AcademicProviderStatus = {
  provider: AcademicProviderName;
  status: 'success' | 'partial' | 'error';
  count: number;
  message?: string;
};

export type AcademicSearchResult = {
  items: AcademicPaper[];
  providers: AcademicProviderStatus[];
  queries: string[];
};

type ProviderResult = { provider: AcademicProviderName; items: AcademicPaper[]; errors: string[] };

function stripHtml(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || undefined;
}

function rebuildAbstract(index?: Record<string, number[]>): string | undefined {
  if (!index) return undefined;
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words.push([position, word]);
  }
  return words.sort((a, b) => a[0] - b[0]).map(([, word]) => word).join(' ') || undefined;
}

async function loadJson(url: string, retries = 1): Promise<any> {
  const response = await fetchWithBackoff(url, undefined, retries);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function runProvider(
  provider: AcademicProviderName,
  queries: string[],
  search: (query: string) => Promise<AcademicPaper[]>
): Promise<ProviderResult> {
  const settled = await Promise.allSettled(queries.map(search));
  const items: AcademicPaper[] = [];
  const errors: string[] = [];
  settled.forEach(result => {
    if (result.status === 'fulfilled') items.push(...result.value);
    else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
  });
  return { provider, items, errors };
}

function deduplicatePapers(providerResults: ProviderResult[], limit: number): AcademicPaper[] {
  const merged = new Map<string, AcademicPaper>();
  for (const paper of providerResults.flatMap(result => result.items)) {
    const key = paper.doi?.toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '')
      ?? paper.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, paper);
      continue;
    }
    merged.set(key, {
      ...existing,
      abstract: existing.abstract || paper.abstract,
      citationCount: Math.max(existing.citationCount ?? 0, paper.citationCount ?? 0),
      authors: existing.authors.length >= paper.authors.length ? existing.authors : paper.authors,
      providers: [...new Set([...existing.providers, ...paper.providers])]
    });
  }
  return [...merged.values()]
    .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0) || (b.year ?? 0) - (a.year ?? 0))
    .slice(0, limit);
}

export async function searchPapers(topic: string, depth: ResearchDepth = 'balanced'): Promise<AcademicSearchResult> {
  const cacheKey = `academic-v3:${depth}:${topic.trim().toLowerCase()}`;
  const cached = await getCache<AcademicSearchResult>(cacheKey);
  if (cached) return cached;

  const expanded = expandResearchQuery(topic);
  const queryLimit = depth === 'deep' ? 3 : depth === 'balanced' ? 2 : 1;
  const queries = [...new Set([getFocusedResearchQuery(topic), ...expanded.slice(1), expanded[0]])].slice(0, queryLimit);
  const perProvider = depth === 'deep' ? 25 : depth === 'balanced' ? 15 : 8;

  const openAlex = runProvider('OpenAlex', queries, async query => {
    const data = await loadJson(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perProvider}`);
    return (data.results ?? []).map((item: any): AcademicPaper => ({
      title: item.display_name,
      authors: (item.authorships ?? []).map((entry: any) => entry.author?.display_name).filter(Boolean),
      url: item.primary_location?.landing_page_url || item.doi || item.id,
      year: item.publication_year,
      citationCount: item.cited_by_count,
      abstract: rebuildAbstract(item.abstract_inverted_index),
      doi: item.doi,
      venue: item.primary_location?.source?.display_name,
      providers: ['OpenAlex']
    }));
  });

  const crossref = runProvider('Crossref', queries, async query => {
    const data = await loadJson(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=${perProvider}&select=DOI,title,author,URL,published,is-referenced-by-count,abstract,container-title`);
    return (data.message?.items ?? []).map((item: any): AcademicPaper => ({
      title: item.title?.[0] || 'Untitled work',
      authors: (item.author ?? []).map((author: any) => [author.given, author.family].filter(Boolean).join(' ')),
      url: item.DOI ? `https://doi.org/${item.DOI}` : item.URL,
      year: item.published?.['date-parts']?.[0]?.[0],
      citationCount: item['is-referenced-by-count'],
      abstract: stripHtml(item.abstract),
      doi: item.DOI,
      venue: item['container-title']?.[0],
      providers: ['Crossref']
    }));
  });

  const semanticScholar = runProvider('Semantic Scholar', queries.slice(0, 1), async query => {
    const fields = 'title,authors,url,year,citationCount,abstract,externalIds,venue';
    const data = await loadJson(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query.replace(/-/g, ' '))}&limit=${perProvider}&fields=${fields}`, 0);
    return (data.data ?? []).map((item: any): AcademicPaper => ({
      title: item.title,
      authors: (item.authors ?? []).map((author: any) => author.name),
      url: item.url,
      year: item.year,
      citationCount: item.citationCount,
      abstract: item.abstract,
      doi: item.externalIds?.DOI,
      venue: item.venue,
      providers: ['Semantic Scholar']
    }));
  });

  const providerResults = await Promise.all([openAlex, crossref, semanticScholar]);
  const result: AcademicSearchResult = {
    items: deduplicatePapers(providerResults, depth === 'deep' ? 60 : depth === 'balanced' ? 30 : 15),
    providers: providerResults.map(({ provider, items, errors }) => ({
      provider,
      status: errors.length === 0 ? 'success' : items.length > 0 ? 'partial' : 'error',
      count: items.length,
      message: errors.length > 0 ? [...new Set(errors)].join(', ') : undefined
    })),
    queries
  };
  await setCache(cacheKey, result, 1000 * 60 * 60 * 6);
  return result;
}
