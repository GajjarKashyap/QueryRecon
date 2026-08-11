export function generateNewsDorks(topic: string): Array<{label: string, url: string}> {
  return [
    { label: 'Google News Search', url: `https://news.google.com/search?q=${encodeURIComponent(topic)}` },
    { label: 'Reuters Search', url: `https://www.google.com/search?q=${encodeURIComponent('site:reuters.com "' + topic + '"')}` },
    { label: 'BBC Search', url: `https://www.google.com/search?q=${encodeURIComponent('site:bbc.com "' + topic + '"')}` },
    { label: 'Recent News (Last 7 Days)', url: `https://www.google.com/search?q=${encodeURIComponent('"' + topic + '" when:7d')}` }
  ];
}
