import { getFocusedResearchQuery } from './queryExpansion';

export function generateDocumentDorks(topic: string, domain?: string): Array<{label: string, url: string, fileType: string}> {
  const dorks = [];
  const baseQuery = domain ? `site:${domain} ` : '';
  const focusedQuery = getFocusedResearchQuery(topic);
  const types = [
    { ext: 'pdf', label: 'PDF Documents' },
    { ext: 'docx', label: 'Word Documents' },
    { ext: 'xlsx', label: 'Spreadsheets' },
    { ext: 'pptx', label: 'Presentations' }
  ];

  for (const type of types) {
    dorks.push({
      label: type.label,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${baseQuery}filetype:${type.ext} ${focusedQuery}`)}`,
      fileType: type.ext
    });
  }
  dorks.push({
    label: 'Technical & university sources',
    url: `https://www.google.com/search?q=${encodeURIComponent(`${baseQuery}(site:edu OR site:ac.uk OR site:org) filetype:pdf ${focusedQuery}`)}`,
    fileType: 'pdf'
  });
  return dorks;
}
