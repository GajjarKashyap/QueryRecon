export async function searchPapers(topic: string): Promise<Array<{title: string, authors: string[], url: string, year?: number, citationCount?: number, abstract?: string}>> {
  try {
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=10&fields=title,authors,url,year,citationCount,abstract`);
    const data = await response.json();
    if (!data.data) return [];
    return data.data.map((item: any) => ({
      title: item.title,
      authors: item.authors?.map((a: any) => a.name) || [],
      url: item.url,
      year: item.year,
      citationCount: item.citationCount,
      abstract: item.abstract
    }));
  } catch (e) {
    console.error('Papers search error', e);
    return [];
  }
}
