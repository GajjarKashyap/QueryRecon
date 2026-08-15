export interface NormalizedResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export function normalizeWikipedia(data: any[]): NormalizedResult[] {
  return data.map(item => ({
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    source: 'wikipedia'
  }));
}

export function normalizeBooks(data: any[]): NormalizedResult[] {
  return data.map(item => ({
    title: item.title,
    url: item.url,
    snippet: `Authors: ${item.authors ? item.authors.join(', ') : 'Unknown'}`,
    source: 'books',
    metadata: {
      authors: item.authors,
      publishedDate: item.publishedDate
    }
  }));
}

export function normalizePapers(data: any[]): NormalizedResult[] {
  return data.map(item => ({
    title: item.title,
    url: item.url,
    snippet: item.abstract || 'No abstract available',
    source: 'papers',
    metadata: {
      authors: item.authors,
      year: item.year
    }
  }));
}

export function normalizeWeb(data: any[]): NormalizedResult[] {
  return data.map(item => ({
    title: item.label,
    url: item.url !== '#' ? item.url : '',
    snippet: 'Web search / Google Dork link',
    source: 'web'
  }));
}
