export function generateDocumentDorks(topic: string, domain?: string): Array<{label: string, url: string, fileType: string}> {
  const dorks = [];
  const baseQuery = domain ? `site:${domain} ` : '';
  
  const types = [
    { ext: 'pdf', label: 'PDF Documents' },
    { ext: 'docx', label: 'Word Documents' },
    { ext: 'xlsx', label: 'Spreadsheets' },
    { ext: 'pptx', label: 'Presentations' }
  ];

  for (const t of types) {
    dorks.push({
      label: t.label,
      url: `https://www.google.com/search?q=${encodeURIComponent(baseQuery + 'filetype:' + t.ext + ' "' + topic + '"')}`,
      fileType: t.ext
    });
  }
  return dorks;
}
