export async function searchWikipedia(topic: string): Promise<Array<{title: string, snippet: string, url: string, pageId: number}>> {
  try {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*&srlimit=10`);
    const data = await response.json();
    if (!data.query || !data.query.search) return [];
    return data.query.search.map((item: any) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]+>/g, ''),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
      pageId: item.pageid
    }));
  } catch (e) {
    console.error('Wikipedia search error', e);
    return [];
  }
}
