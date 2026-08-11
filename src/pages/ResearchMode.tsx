import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, Plus, Trash2, Bookmark, Download, ExternalLink } from 'lucide-react';

import { db, type ResearchProject, type ResearchFinding, type CustomSource } from '../store/db';

import { AdvancedApiRegistry } from '../core/research/advancedApis';
import { useCustomApiStore } from '../store/customApiStore';
import { searchWikipedia } from '../core/research/wikipedia';
import { generateYouTubeSearchUrl, generateYouTubeDorks } from '../core/research/youtube';
import { generateNewsDorks } from '../core/research/news';
import { searchBooks } from '../core/research/books';
import { searchPapers } from '../core/research/papers';
import { generateDocumentDorks } from '../core/research/documents';
import { generateResearchSummary, generateChatGptSummary } from '../core/research/aiSummary';
import { fetchWeather } from '../core/research/weather';
import { useApiKeysStore } from '../store/apiKeysStore';

const SOURCES = [
  { id: 'ai', name: 'AI Analysis', icon: '🤖' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
  { id: 'wikipedia', name: 'Wikipedia', icon: '📖' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'books', name: 'Books', icon: '📚' },
  { id: 'papers', name: 'Academic Papers', icon: '🎓' },
  { id: 'documents', name: 'PDFs & Docs', icon: '📄' },
  { id: 'web', name: 'Web (Google Dorks)', icon: '🌐' }
];

export default function ResearchMode() {
  const [topic, setTopic] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>(SOURCES.map(s => s.id));
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const customApisStore = useCustomApiStore(state => state.customApis);
  const addCustomApiToStore = useCustomApiStore(state => state.addApi);
  const [showApiModal, setShowApiModal] = useState(false);
  const [newApiName, setNewApiName] = useState('');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [customIcon, setCustomIcon] = useState('🔍');
  
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [findings, setFindings] = useState<ResearchFinding[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('ai');
  const [isResearching, setIsResearching] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});
  
  const apiKeys = useApiKeysStore(state => state.keys);

  useEffect(() => {
    if (project) {
      loadFindings(project.id);
    }
  }, [project]);

  const loadFindings = async (projectId: string) => {
    const data = await db.findings.where({ projectId }).toArray();
    setFindings(data);
  };

  const toggleSource = (id: string) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const addCustomSource = () => {
    if (!customName.trim()) return;
    const newSource: CustomSource = {
      id: `custom-${Date.now()}`,
      name: customName,
      icon: customIcon
    };
    setCustomSources([...customSources, newSource]);
    setSelectedSources([...selectedSources, newSource.id]);
    setCustomName('');
    setShowCustomForm(false);
  };

  const removeCustomSource = (id: string) => {
    setCustomSources(prev => prev.filter(s => s.id !== id));
    setSelectedSources(prev => prev.filter(s => s !== id));
  };

  const runResearch = async () => {
    if (!topic.trim() || selectedSources.length === 0) return;
    setIsResearching(true);
    setResults({});
    
    const projId = `proj-${Date.now()}`;
    const newProject: ResearchProject = {
      id: projId,
      topic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedSources,
      customSources,
      status: 'running'
    };
    await db.researchProjects.add(newProject);
    setProject(newProject);
    
    let aiFindingsText: string[] = [];
    const newResults: Record<string, any> = {};

    if (selectedSources.includes('wikipedia')) {
      const wikiData = await searchWikipedia(topic);
      newResults.wikipedia = wikiData;
      if (wikiData.length > 0) aiFindingsText.push('Wikipedia: ' + wikiData.map(w => w.title + ' - ' + w.snippet).join('\n'));
    }

    if (selectedSources.includes('youtube')) {
      newResults.youtube = {
        searchUrl: generateYouTubeSearchUrl(topic),
        dorks: generateYouTubeDorks(topic)
      };
    }

    if (selectedSources.includes('news')) {
      newResults.news = generateNewsDorks(topic);
    }

    if (selectedSources.includes('books')) {
      const booksData = await searchBooks(topic);
      newResults.books = booksData;
      if (booksData.length > 0) aiFindingsText.push('Books: ' + booksData.map(b => b.title + ' by ' + b.authors.join(', ')).join('\n'));
    }

    if (selectedSources.includes('papers')) {
      const papersData = await searchPapers(topic);
      newResults.papers = papersData;
      if (papersData.length > 0) aiFindingsText.push('Papers: ' + papersData.map(p => p.title).join('\n'));
    }

    if (selectedSources.includes('documents')) {
      newResults.documents = generateDocumentDorks(topic);
    }

    if (selectedSources.includes('web')) {
      newResults.web = [
        { label: 'General Dork', url: `https://www.google.com/search?q=${encodeURIComponent('intitle:"' + topic + '" OR intext:"' + topic + '"')}` }
      ];
    }

    // Advanced APIs from Registry
    for (const sourceId of selectedSources) {
      const apiDef = AdvancedApiRegistry.find(a => a.id === sourceId);
      if (apiDef) {
        // Special case: Weather
        if (sourceId === 'weather') {
          if (apiKeys.weather) {
            const weatherData = await fetchWeather(topic, apiKeys.weather);
            newResults.weather = [
              { label: `Weather: ${weatherData.weather?.[0]?.description || 'Unknown'}, Temp: ${weatherData.main?.temp || 'N/A'}°C`, url: '#' }
            ];
            aiFindingsText.push(`Weather data for ${topic}: ${JSON.stringify(weatherData)}`);
          } else {
            newResults.weather = "Missing Weather API Key in Settings.";
          }
          continue;
        }

        // Special case: ChatGPT
        if (sourceId === 'chatgpt') {
          if (apiKeys.openai) {
            newResults.chatgpt = await generateChatGptSummary(topic, aiFindingsText.length > 0 ? aiFindingsText : [topic], apiKeys.openai);
          } else {
            newResults.chatgpt = "Missing OpenAI API Key in Settings.";
          }
          continue;
        }

        // Standard GET endpoints from Registry
        let url = apiDef.searchEndpoint.replace('{query}', encodeURIComponent(topic));
        
        // Inject keys if needed
        if (sourceId === 'otx') url = url.replace('{API_KEY}', apiKeys.alienvault);
        if (sourceId === 'google_books') url = url.replace('{API_KEY}', apiKeys.google_books);

        try {
          const headers: any = {};
          if (sourceId === 'otx' && apiKeys.alienvault) headers['X-OTX-API-KEY'] = apiKeys.alienvault;

          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await res.json();
          newResults[sourceId] = [
             { label: `Fetched data from ${apiDef.name}`, url: url }
          ];
        } catch(err: any) {
          newResults[sourceId] = `Error fetching ${apiDef.name}: ${err.message}`;
        }
      }
    }

    if (selectedSources.includes('ai')) {
      if (apiKeys.gemini) {
        newResults.ai = await generateResearchSummary(topic, aiFindingsText.length > 0 ? aiFindingsText : [topic], apiKeys.gemini);
      } else {
        newResults.ai = 'No Gemini API key provided. Please set it in Settings to enable AI analysis.';
      }
    }

    setResults(newResults);
    
    await db.researchProjects.update(projId, { status: 'complete', updatedAt: Date.now() });
    
    const firstTab = selectedSources[0];
    if (firstTab) setActiveTab(firstTab);
    setIsResearching(false);
  };

  const saveFinding = async (findingInfo: Omit<ResearchFinding, 'id' | 'projectId' | 'discoveredAt' | 'isBookmarked' | 'tags' | 'notes'>) => {
    if (!project) return;
    const newFinding: ResearchFinding = {
      ...findingInfo,
      id: `find-${Date.now()}`,
      projectId: project.id,
      discoveredAt: Date.now(),
      isBookmarked: false,
      tags: [],
      notes: ''
    };
    await db.findings.add(newFinding);
    loadFindings(project.id);
  };

  const toggleBookmark = async (id: string, current: boolean) => {
    await db.findings.update(id, { isBookmarked: !current });
    if (project) loadFindings(project.id);
  };

  const exportReport = () => {
    if (!project || findings.length === 0) return;
    const reportData = {
      project,
      findings
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${project.topic.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTabContent = () => {
    if (isResearching) return <div className="p-8 text-center text-muted-foreground animate-pulse">Running research...</div>;
    
    const data = results[activeTab];
    if (!data) return <div className="p-8 text-center text-muted-foreground">No results or run research first.</div>;

    if (activeTab === 'ai') {
      return (
        <Card className="p-6 prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: data.replace(/\n/g, '<br/>') }} />
        </Card>
      );
    }
    
    if (activeTab === 'wikipedia' || activeTab === 'books' || activeTab === 'papers') {
      return (
        <div className="grid gap-4">
          {(data as any[]).map((item, idx) => (
            <Card key={idx} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start gap-4">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium text-lg flex-1 break-words">
                  {item.title}
                </a>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => saveFinding({
                  title: item.title,
                  snippet: item.snippet || item.abstract || (item.authors ? 'Authors: ' + item.authors.join(', ') : ''),
                  url: item.url,
                  sourceType: activeTab,
                  sourceName: SOURCES.find(s => s.id === activeTab)?.name || activeTab
                })}>Save</Button>
              </div>
              <p className="text-muted-foreground text-sm line-clamp-3">{item.snippet || item.abstract}</p>
            </Card>
          ))}
        </div>
      );
    }

    if (activeTab === 'youtube' && data.dorks) {
       return (
         <div className="space-y-4">
           <a href={data.searchUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline block font-bold">Open YouTube Search</a>
           <div className="grid gap-2">
             {data.dorks.map((d: any, idx: number) => (
               <Card key={idx} className="p-3">
                 <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{d.label}</a>
               </Card>
             ))}
           </div>
         </div>
       );
    }

    if (Array.isArray(data)) {
      return (
        <div className="grid gap-2">
          {data.map((item: any, idx: number) => (
             <Card key={idx} className="p-3">
               <div className="flex justify-between items-start gap-4">
                 <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-words flex-1">{item.label}</a>
                 <Button className="shrink-0" size="sm" variant="outline" onClick={() => saveFinding({
                   title: item.label,
                   snippet: "Web / API Result",
                   url: item.url !== "#" ? item.url : undefined,
                   sourceType: activeTab,
                   sourceName: SOURCES.find(s => s.id === activeTab)?.name || activeTab
                 })}>Save</Button>
               </div>
             </Card>
          ))}
        </div>
      );
    }
    
    return <div className="p-4">Content for {activeTab}</div>;
  };

    const allSources = [
    ...SOURCES, 
    ...AdvancedApiRegistry.map(api => ({ id: api.id, name: api.name, icon: '🔌' })),
    ...customApisStore.map(api => ({ id: api.id, name: api.name, icon: '🛠️' })),
    ...customSources
  ];

  return (
    <div className="flex h-full w-full gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        <header>
          <h1 className="text-2xl font-bold">Research Mode</h1>
          <p className="text-muted-foreground">Multi-source intelligence gathering</p>
        </header>

        <section className="space-y-4">
          <Input 
            className="text-lg py-6" 
            placeholder="Enter your research topic..." 
            value={topic} 
            onChange={e => setTopic(e.target.value)} 
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {allSources.map(s => (
              <Card 
                key={s.id} 
                className={`p-3 cursor-pointer flex items-center gap-3 transition-colors ${selectedSources.includes(s.id) ? 'border-primary bg-primary/5' : 'hover:border-muted'}`}
                onClick={() => toggleSource(s.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xl">{s.icon}</span>
                  <span className="font-medium text-sm">{s.name}</span>
                </div>
                {s.id.startsWith('custom-') && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-danger" onClick={(e) => { e.stopPropagation(); removeCustomSource(s.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!showCustomForm ? (
              <Button variant="outline" size="sm" onClick={() => setShowCustomForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Custom Source
              </Button>
            ) : (
              <div className="flex gap-2 items-center">
                <Input className="w-16" value={customIcon} onChange={e => setCustomIcon(e.target.value)} placeholder="Emoji" />
                <Input className="w-48" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Source Name" />
                <Button size="sm" onClick={addCustomSource}>Add</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCustomForm(false)}>Cancel</Button>
              </div>
            )}
          </div>

                    <div className="flex items-center gap-2 mt-4 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setShowApiModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Custom API
            </Button>
            {showApiModal && (
              <div className="flex gap-2 items-center">
                <Input className="w-48" value={newApiName} onChange={e => setNewApiName(e.target.value)} placeholder="API Name" />
                <Input className="w-64" value={newApiUrl} onChange={e => setNewApiUrl(e.target.value)} placeholder="URL (use {query} for injection)" />
                <Button size="sm" onClick={() => {
                  if (newApiName && newApiUrl) {
                    addCustomApiToStore({ id: `custom-api-${Date.now()}`, name: newApiName, category: 'Custom', description: '', requiresKey: false, searchEndpoint: newApiUrl });
                    setShowApiModal(false);
                  }
                }}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowApiModal(false)}>Cancel</Button>
              </div>
            )}
          </div>
          <Button 
            className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" 
            onClick={runResearch}
            disabled={!topic.trim() || selectedSources.length === 0 || isResearching}
          >
            <Search className="mr-2 h-5 w-5" /> {isResearching ? 'Gathering Intelligence...' : 'Run Research'}
          </Button>
        </section>

        {Object.keys(results).length > 0 && (
          <section className="flex flex-col flex-1 min-h-0 border rounded-lg bg-surface-elevated/50">
            <div className="flex overflow-x-auto border-b">
              {selectedSources.map(s => {
                const sourceInfo = allSources.find(x => x.id === s);
                if (!sourceInfo) return null;
                return (
                  <button
                    key={s}
                    className={`px-4 py-3 whitespace-nowrap font-medium text-sm transition-colors border-b-2 ${activeTab === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                    onClick={() => setActiveTab(s)}
                  >
                    {sourceInfo.icon} {sourceInfo.name}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderTabContent()}
            </div>
          </section>
        )}
      </div>

      <div className="w-80 flex flex-col gap-4 border-l pl-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Saved Findings</h2>
          <Button variant="outline" size="sm" onClick={exportReport} disabled={findings.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
        
        {findings.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No findings saved yet. Explore results and click "Save" to build your report.
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map(f => (
              <Card key={f.id} className="p-3 text-sm flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                  <span className="font-semibold">{f.title}</span>
                  <button onClick={() => toggleBookmark(f.id, f.isBookmarked)} className={`hover:text-primary ${f.isBookmarked ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Bookmark className="h-4 w-4" />
                  </button>
                </div>
                <Badge variant="secondary" className="w-fit">{SOURCES.find(s=>s.id===f.sourceType)?.icon} {f.sourceName}</Badge>
                {f.snippet && <p className="text-muted-foreground text-xs line-clamp-2">{f.snippet}</p>}
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center">
                    <ExternalLink className="h-3 w-3 mr-1" /> View Source
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}








