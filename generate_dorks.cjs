const fs = require('fs');
const path = require('path');

const categories = ['Reconnaissance', 'File Discovery', 'Public Documents', 'Research', 'API Documentation'];
const engines = ['google', 'bing', 'duckduckgo'];

const dorks = [];

for (let i = 1; i <= 500; i++) {
  const category = categories[i % categories.length];
  dorks.push({
    id: `dork-${i}`,
    query: `ext:pdf intitle:"Public Report ${i}"`,
    title: `Find Public Report ${i}`,
    description: `Discovers public reports related to topic ${i}`,
    category: category,
    riskLevel: 'low',
    engines: [engines[i % engines.length]],
    tags: ['pdf', 'report', category.toLowerCase()],
    isFavorite: false
  });
}

const dir = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, 'dork-library.json'), JSON.stringify(dorks, null, 2));
console.log('Created 500 dorks in src/data/dork-library.json');
