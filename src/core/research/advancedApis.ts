export interface ApiSource {
  id: string;
  name: string;
  category: string;
  description: string;
  requiresKey: boolean;
  searchEndpoint: string;
}

export const AdvancedApiRegistry: ApiSource[] = [
  {
    id: 'otx',
    name: 'AlienVault OTX',
    category: 'Security',
    description: 'Threat intelligence and IoC lookup',
    requiresKey: true,
    searchEndpoint: 'https://otx.alienvault.com/api/v1/indicators/domain/{query}/general'
  },
  {
    id: 'urlhaus',
    name: 'URLhaus',
    category: 'Security',
    description: 'Malware URL lookup',
    requiresKey: false,
    searchEndpoint: 'https://urlhaus-api.abuse.ch/v1/host/{query}/'
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    category: 'Cryptocurrency',
    description: 'Crypto token and market data lookup',
    requiresKey: false,
    searchEndpoint: 'https://api.coingecko.com/api/v3/search?query={query}'
  },
  {
    id: 'openfec',
    name: 'OpenFEC',
    category: 'Government',
    description: 'US Federal Election Commission data',
    requiresKey: true,
    searchEndpoint: 'https://api.open.fec.gov/v1/candidates/search/?q={query}'
  },
  {
    id: 'domainsdb',
    name: 'Domainsdb.info',
    category: 'Reconnaissance',
    description: 'Registered domain search',
    requiresKey: false,
    searchEndpoint: 'https://api.domainsdb.info/v1/domains/search?domain={query}'
  },
  {
    id: 'weather',
    name: 'OpenWeatherMap',
    category: 'Environment',
    description: 'Current weather and forecast data (requires API key in settings)',
    requiresKey: true,
    searchEndpoint: 'https://api.openweathermap.org/data/2.5/weather?q={query}&appid={API_KEY}'
  },
  {
    id: 'google_books',
    name: 'Google Books',
    category: 'Literature',
    description: 'Search for books and authors',
    requiresKey: false,
    searchEndpoint: 'https://www.googleapis.com/books/v1/volumes?q={query}'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT Analysis',
    category: 'AI',
    description: 'Analyze the target using OpenAI GPT models (requires key in settings)',
    requiresKey: true,
    searchEndpoint: 'https://api.openai.com/v1/chat/completions'
  }
];

export const getSourcesByCategory = (category: string) => {
  return AdvancedApiRegistry.filter(api => api.category === category);
};

export const getCategories = () => {
  return Array.from(new Set(AdvancedApiRegistry.map(api => api.category)));
};

