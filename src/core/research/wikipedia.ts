import { fetchWithBackoff } from '../fetcher';
import { expandResearchQuery } from './queryExpansion';

export type WikipediaResult = {
  title: string;
  snippet: string;
  url: string;
  pageId: number;
  thumbnail?: string;
};

export async function searchWikipedia(topic: string): Promise<WikipediaResult[]> {
  try {
    const queries = expandResearchQuery(topic).slice(0, 4);
    const batches = await Promise.all(queries.map(async query => {
      const response = await fetchWithBackoff(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=6`);
      const data = await response.json();
      return data.query?.search ?? [];
    }));

    const unique = new Map<number, WikipediaResult>();
    for (const item of batches.flat()) {
      if (!unique.has(item.pageid)) {
        unique.set(item.pageid, {
          title: item.title,
          snippet: item.snippet.replace(/<[^>]+>/g, ''),
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          pageId: item.pageid
        });
      }
    }

    const results = [...unique.values()].slice(0, 12);
    if (results.length === 0) return [];

    const pageIds = results.map(result => result.pageId).join('|');
    const imageResponse = await fetchWithBackoff(`https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}&prop=pageimages&pithumbsize=640&format=json&origin=*`);
    const imageData = await imageResponse.json();
    const pages = imageData.query?.pages ?? {};

    return results.map(result => ({ ...result, thumbnail: pages[result.pageId]?.thumbnail?.source }));
  } catch (error) {
    console.error('Wikipedia search error', error);
    return [];
  }
}
