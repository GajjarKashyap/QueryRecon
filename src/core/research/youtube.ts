export function generateYouTubeSearchUrl(topic: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;
}

export function generateYouTubeDorks(topic: string): Array<{label: string, url: string}> {
  return [
    { label: 'Google YouTube Search', url: `https://www.google.com/search?q=${encodeURIComponent('site:youtube.com intitle:"' + topic + '"')}` },
    { label: 'Older Content (Before 2025)', url: `https://www.google.com/search?q=${encodeURIComponent('site:youtube.com "' + topic + '" before:2025-01-01')}` }
  ];
}
