import type { QueryNode } from '../query';
import { compileQuery } from '../compiler';

export type SearchEngine = 'google' | 'bing' | 'youtube';

export interface EngineProfile {
  id: SearchEngine;
  label: string;
  searchUrl: string;
  supportedOperators: ReadonlySet<string>;
}

const googleOperators = new Set([
  'intext', 'intitle', 'inurl', 'site', 'filetype', 'ext', 'allintext',
  'allintitle', 'allinurl', 'cache', 'related', 'define', 'before', 'after',
]);

export const EngineProfiles: Record<SearchEngine, EngineProfile> = {
  google: {
    id: 'google',
    label: 'Google',
    searchUrl: 'https://www.google.com/search?q=',
    supportedOperators: googleOperators,
  },
  bing: {
    id: 'bing',
    label: 'Bing',
    searchUrl: 'https://www.bing.com/search?q=',
    supportedOperators: new Set(['intitle', 'site', 'filetype', 'ext']),
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    searchUrl: 'https://www.youtube.com/results?search_query=',
    supportedOperators: new Set(['intitle', 'before', 'after']),
  },
};

export function isSearchEngine(value: string): value is SearchEngine {
  return value in EngineProfiles;
}

export function compileForEngine(node: QueryNode, engine: SearchEngine = 'google'): string {
  const raw = compileQuery(node);
  if (engine !== 'youtube') return raw;

  // YouTube treats Google-only field operators as plain text. Remove the
  // operator prefix while preserving its value so the search stays useful.
  return raw.replace(/(?:allintext|allinurl|intext|inurl|site|filetype|ext|cache|related|define):/gi, '');
}

export function buildSearchUrl(query: string, engine: SearchEngine): string {
  return EngineProfiles[engine].searchUrl + encodeURIComponent(query.trim());
}
