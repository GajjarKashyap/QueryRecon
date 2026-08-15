import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, Plus, Trash2, Bookmark, Download, ExternalLink, SlidersHorizontal, PanelRightClose, PanelRightOpen, X, CheckCircle2 } from 'lucide-react';

import { db, type ResearchProject, type ResearchFinding, type CustomSource } from '../store/db';

import { AdvancedApiRegistry } from '../core/research/advancedApis';
import { useCustomApiStore } from '../store/customApiStore';
import { searchWikipedia } from '../core/research/wikipedia';
import { generateYouTubeSearchUrl, generateYouTubeDorks } from '../core/research/youtube';
import { generateNewsDorks } from '../core/research/news';
import { searchBooks } from '../core/research/books';
import { searchPapers } from '../core/research/papers';
import { generateDocumentDorks } from '../core/research/documents';
import { generateResearchSummary, generateChatGptSummary, generateDeepSeekSummary, type ResearchDepth } from '../core/research/aiSummary';
import { fetchWeather } from '../core/research/weather';
import { useApiKeysStore } from '../store/apiKeysStore';
import { WorkActivity } from '../components/ui/work-activity';
import { ResearchAnswer } from '../components/research/ResearchAnswer';
import { getTopicResearchPlan } from '../core/research/queryExpansion';
import { normalizeApiResponse } from '../core/research/genericApi';

const RESEARCH_DEPTHS: Array<{ id: ResearchDepth; label: string; cost: string; description: string }> = [
  { id: 'quick', label: 'Quick', cost: '$', description: 'Key facts and a short comparison' },
  { id: 'balanced', label: 'Balanced', cost: '$$', description: 'Evidence, examples, and trade-offs' },
  { id: 'deep', label: 'Deep', cost: '$$$', description: 'Maximum reasoning and a detailed report' }
];

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
  const [researchStatus, setResearchStatus] = useState('Preparing selected sources');
  const [researchDepth, setResearchDepth] = useState<ResearchDepth>('balanced');
  const [results, setResults] = useState<Record<string, any>>({});
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [resultFilter, setResultFilter] = useState('');
  
  const apiKeys = useApiKeysStore(state => state.keys);
  const apiModels = useApiKeysStore(state => state.models);

  useEffect(() => {
    if (project) {
      loadFindings(project.id);
    }
  }, [project]);

  useEffect(() => {
    let cancelled = false;

    const restoreLatestResearch = async () => {
      const savedProject = await db.researchProjects.orderBy('updatedAt').last();
      if (!savedProject || cancelled) return;

      const savedResults = savedProject.results ?? {};
      const firstSavedTab = Object.keys(savedResults)[0];
      setProject(savedProject);
      setTopic(savedProject.topic);
      setSelectedSources(savedProject.selectedSources);
      setCustomSources(savedProject.customSources);
      setResearchDepth(savedProject.researchDepth ?? 'balanced');
      setResults(savedResults);
      setActiveTab(savedProject.activeTab && savedResults[savedProject.activeTab]
        ? savedProject.activeTab
        : firstSavedTab ?? 'ai');
    };

    restoreLatestResearch();
    return () => { cancelled = true; };
  }, []);

  const loadFindings = async (projectId: string) => {
    const data = await db.findings.where({ projectId }).toArray();
    setFindings(data);
  };

  const toggleSource = (id: string) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const openResultTab = async (id: string) => {
    setActiveTab(id);
    setResultFilter('');
    if (project) {
      await db.researchProjects.update(project.id, { activeTab: id, updatedAt: Date.now() });
    }
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
    if (!topic.trim() || (selectedSources.length === 0 && researchDepth !== 'deep')) return;
    const topicPlan = getTopicResearchPlan(topic);
    const effectiveSources = researchDepth === 'deep'
      ? [...new Set([...selectedSources, ...topicPlan.sources])]
      : selectedSources;
    if (researchDepth === 'deep') setSelectedSources(effectiveSources);
    setIsResearching(true);
    setResearchStatus('Preparing selected sources');
    setResults({});
    
    const projId = `proj-${Date.now()}`;
    const newProject: ResearchProject = {
      id: projId,
      topic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      selectedSources: effectiveSources,
      customSources,
      status: 'running',
      results: {},
      activeTab: 'ai',
      researchDepth
    };
    await db.researchProjects.add(newProject);
    setProject(newProject);
    
    let aiFindingsText: string[] = [];
    const newResults: Record<string, any> = {};
    let checkpointQueue = Promise.resolve();
    const saveCheckpoint = () => {
      const snapshot = { ...newResults };
      const checkpointTab = Object.keys(snapshot)[0] ?? 'ai';
      setResults(snapshot);
      checkpointQueue = checkpointQueue.then(() => db.researchProjects.update(projId, {
          results: snapshot,
          activeTab: checkpointTab,
          researchDepth,
          updatedAt: Date.now()
        }).then(() => undefined));
      return checkpointQueue;
    };

    setResearchStatus(`Gathering ${effectiveSources.length} sources in parallel`);
    const sourceTasks: Promise<void>[] = [];

    if (effectiveSources.includes('wikipedia')) sourceTasks.push((async () => {
      const wikiData = await searchWikipedia(topic);
      newResults.wikipedia = wikiData;
      if (wikiData.length > 0) aiFindingsText.push('Wikipedia: ' + wikiData.map(w => `${w.title} - ${w.snippet}\nSource: ${w.url}${w.thumbnail ? `\nImage: ${w.thumbnail}` : ''}`).join('\n'));
      await saveCheckpoint();
    })());

    if (effectiveSources.includes('youtube')) sourceTasks.push((async () => {
      newResults.youtube = { searchUrl: generateYouTubeSearchUrl(topic), dorks: generateYouTubeDorks(topic) };
      await saveCheckpoint();
    })());

    if (effectiveSources.includes('news')) sourceTasks.push((async () => {
      newResults.news = generateNewsDorks(topic);
      await saveCheckpoint();
    })());

    if (effectiveSources.includes('books')) sourceTasks.push((async () => {
      const booksData = await searchBooks(topic);
      newResults.books = booksData;
      if (booksData.length > 0) aiFindingsText.push('Books: ' + booksData.map(book => `${book.title} by ${book.authors.join(', ')}\nSource: ${book.url}`).join('\n'));
      await saveCheckpoint();
    })());

    if (effectiveSources.includes('papers')) sourceTasks.push((async () => {
      const papersData = await searchPapers(topic, researchDepth);
      newResults.papers = papersData;
      const evidenceLimit = researchDepth === 'deep' ? 30 : researchDepth === 'balanced' ? 15 : 8;
      if (papersData.items.length > 0) aiFindingsText.push('Academic papers: ' + papersData.items.slice(0, evidenceLimit).map(paper => `${paper.title} (${paper.year ?? 'n.d.'}) - ${paper.abstract ?? 'No abstract'}\nSource: ${paper.url}`).join('\n'));
      await saveCheckpoint();
    })());

    if (effectiveSources.includes('documents')) sourceTasks.push((async () => {
      newResults.documents = generateDocumentDorks(topic);
      await saveCheckpoint();
    })());

    if (effectiveSources.includes('web')) sourceTasks.push((async () => {
      newResults.web = [{ label: 'Focused web search', url: `https://www.google.com/search?q=${encodeURIComponent(topic)}` }];
      await saveCheckpoint();
    })());

    await Promise.allSettled(sourceTasks);
    await checkpointQueue;

    const advancedSources = effectiveSources
      .map(sourceId => AdvancedApiRegistry.find(api => api.id === sourceId))
      .filter((api): api is (typeof AdvancedApiRegistry)[number] => Boolean(api) && api?.id !== 'chatgpt' && api?.id !== 'deepseek');
    if (advancedSources.length > 0) setResearchStatus(`Querying ${advancedSources.length} external APIs in parallel`);

    await Promise.allSettled(advancedSources.map(async apiDef => {
      if (apiDef.id === 'weather') {
        if (apiKeys.weather) {
          const weatherData = await fetchWeather(topic, apiKeys.weather);
          newResults.weather = [{ label: `Weather: ${weatherData.weather?.[0]?.description || 'Unknown'}, Temp: ${weatherData.main?.temp || 'N/A'}°C`, url: '#', snippet: JSON.stringify(weatherData) }];
          aiFindingsText.push(`Weather data for ${topic}: ${JSON.stringify(weatherData)}`);
        } else {
          newResults.weather = [{ label: 'Weather API key required', url: '#', snippet: 'Add an OpenWeather key in Settings to query this source.' }];
        }
        await saveCheckpoint();
        return;
      }

      let url = apiDef.searchEndpoint.replace('{query}', encodeURIComponent(topic));
      if (apiDef.id === 'otx') url = url.replace('{API_KEY}', apiKeys.alienvault);
      if (apiDef.id === 'google_books') url = url.replace('{API_KEY}', apiKeys.google_books);

      try {
        const headers: Record<string, string> = {};
        if (apiDef.id === 'otx' && apiKeys.alienvault) headers['X-OTX-API-KEY'] = apiKeys.alienvault;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const normalized = normalizeApiResponse(payload, apiDef.name, url, researchDepth === 'deep' ? 50 : researchDepth === 'balanced' ? 20 : 10);
        newResults[apiDef.id] = normalized;
        if (normalized.length > 0) aiFindingsText.push(`${apiDef.name}: ${normalized.slice(0, 12).map(item => `${item.label} - ${item.snippet ?? ''}\nSource: ${item.url}`).join('\n')}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        newResults[apiDef.id] = [{ label: `${apiDef.name} unavailable`, url: '#', snippet: message }];
      }
      await saveCheckpoint();
    }));
    await checkpointQueue;

    if (effectiveSources.includes('chatgpt')) {
      setResearchStatus('Generating an OpenAI analysis');
      newResults.chatgpt = apiKeys.openai
        ? await generateChatGptSummary(topic, aiFindingsText, apiKeys.openai, researchDepth)
        : 'Missing OpenAI API Key in Settings.';
      await saveCheckpoint();
    }

    if (effectiveSources.includes('deepseek')) {
      setResearchStatus('Generating a DeepSeek analysis');
      newResults.deepseek = apiKeys.deepseek
        ? await generateDeepSeekSummary(topic, aiFindingsText, apiKeys.deepseek, researchDepth, apiModels.deepseek)
        : 'Missing DeepSeek API Key in Settings.';
      await saveCheckpoint();
    }

    if (effectiveSources.includes('ai')) {
      setResearchStatus('Synthesizing the collected evidence');
      if (apiKeys.gemini) {
        newResults.ai = await generateResearchSummary(topic, aiFindingsText, apiKeys.gemini, researchDepth);
      } else {
        newResults.ai = 'No Gemini API key provided. Please set it in Settings to enable AI analysis.';
      }
      await saveCheckpoint();
    }

    setResearchStatus('Organizing results for review');
    setResults(newResults);
    
    const firstTab = newResults.ai ? 'ai' : newResults.papers ? 'papers' : Object.keys(newResults)[0];
    if (firstTab) setActiveTab(firstTab);
    await db.researchProjects.update(projId, {
      status: 'complete',
      results: { ...newResults },
      activeTab: firstTab ?? 'ai',
      researchDepth,
      updatedAt: Date.now()
    });
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
    const normalizedFilter = resultFilter.trim().toLowerCase();
    const collection = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : data;
    const visibleItems = Array.isArray(collection)
      ? collection.filter(item => !normalizedFilter || JSON.stringify(item).toLowerCase().includes(normalizedFilter))
      : collection;

    if (activeTab === 'ai' || activeTab === 'chatgpt' || activeTab === 'deepseek') {
      return (
        <Card className="p-5 md:p-7">
          <ResearchAnswer content={data} />
        </Card>
      );
    }
    
    if (activeTab === 'wikipedia' || activeTab === 'books' || activeTab === 'papers') {
      return (
        <div>
          {activeTab === 'papers' && Array.isArray(data.providers) && (
            <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-border bg-background/60 p-3">
              {data.providers.map((provider: any) => (
                <Badge key={provider.provider} variant="outline" className={provider.status === 'error' ? 'border-danger/40 text-danger' : provider.status === 'partial' ? 'border-amber-400/40 text-amber-400' : 'border-emerald-400/40 text-emerald-400'}>
                  {provider.provider}: {provider.status === 'error' ? provider.message : `${provider.count} found`}
                </Badge>
              ))}
              {Array.isArray(data.queries) && <span className="w-full text-xs text-muted-foreground">Queries: {data.queries.join(' · ')}</span>}
            </div>
          )}
          <div className="divide-y divide-border/70">
          {(visibleItems as any[]).map((item, idx) => (
            <article key={idx} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row">
              {item.thumbnail && <img src={item.thumbnail} alt="" loading="lazy" className="h-24 w-full rounded-md object-cover sm:w-36" referrerPolicy="no-referrer" />}
              <div className="min-w-0 flex-1">
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
              {(item.authors?.length > 0 || item.year || item.citationCount || item.providers) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.authors?.slice(0, 4).join(', ')}{item.authors?.length > 4 ? ' et al.' : ''}
                  {item.year ? ` · ${item.year}` : ''}{typeof item.citationCount === 'number' ? ` · ${item.citationCount} citations` : ''}
                  {item.providers ? ` · ${item.providers.join(' + ')}` : ''}
                </p>
              )}
              <p className="text-muted-foreground text-sm line-clamp-3">{item.snippet || item.abstract}</p>
              </div>
            </article>
          ))}
          {visibleItems.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No results match this filter.</div>}
          </div>
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

    if (Array.isArray(collection)) {
      return (
        <div className="divide-y divide-border/70">
          {visibleItems.map((item: any, idx: number) => (
             <article key={idx} className="py-3 first:pt-0">
               <div className="flex justify-between items-start gap-4">
                 <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-words flex-1">{item.label}</a>
                 <Button className="shrink-0" size="sm" variant="outline" onClick={() => saveFinding({
                   title: item.label,
                   snippet: item.snippet || "Web / API Result",
                   url: item.url !== "#" ? item.url : undefined,
                   sourceType: activeTab,
                   sourceName: SOURCES.find(s => s.id === activeTab)?.name || activeTab
                 })}>Save</Button>
               </div>
               {item.snippet && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.snippet}</p>}
             </article>
          ))}
          {visibleItems.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No results match this filter.</div>}
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
  const resultSourceIds = Object.keys(results).filter(id => allSources.some(source => source.id === id));
  const activeResult = results[activeTab];
  const activeResultCount = Array.isArray(activeResult)
    ? activeResult.length
    : activeResult?.items && Array.isArray(activeResult.items)
      ? activeResult.items.length
    : activeResult?.dorks && Array.isArray(activeResult.dorks)
      ? activeResult.dorks.length
      : activeResult ? 1 : 0;
  const currentTopicPlan = getTopicResearchPlan(topic);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Research mode</h1>
          <p className="text-sm text-muted-foreground">Search broadly, then narrow the evidence worth keeping.</p>
        </div>
        <div className="flex items-center gap-2">
          {project && !isResearching && (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Saved automatically
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowFindings(value => !value)}>
            {showFindings ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}
            Findings <Badge variant="secondary" className="ml-2">{findings.length}</Badge>
          </Button>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 ${showFindings ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1'}`}>
        <main className="min-h-0 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            <Card className="p-4 md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row">
                <Input
                  className="h-12 flex-1 text-base"
                  placeholder="What are you investigating?"
                  value={topic}
                  onChange={event => setTopic(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && runResearch()}
                />
                <Button
                  className="h-12 px-6 font-semibold"
                  onClick={runResearch}
                  disabled={!topic.trim() || (selectedSources.length === 0 && researchDepth !== 'deep') || isResearching}
                >
                  <Search className="mr-2 h-4 w-4" /> {isResearching ? 'Researching…' : 'Run research'}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                <Button variant="ghost" size="sm" onClick={() => setShowSourcePicker(value => !value)}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" /> Sources
                  <Badge variant="secondary" className="ml-2">{selectedSources.length}</Badge>
                </Button>
                <div className="h-5 w-px bg-border" />
                {selectedSources.slice(0, 5).map(id => {
                  const source = allSources.find(item => item.id === id);
                  if (!source) return null;
                  return (
                    <button key={id} onClick={() => toggleSource(id)} className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                      <span>{source.icon}</span> {source.name} <X className="h-3 w-3" />
                    </button>
                  );
                })}
                {selectedSources.length > 5 && <span className="text-xs text-muted-foreground">+{selectedSources.length - 5} more</span>}
              </div>

              <div className="mt-4 grid gap-3 border-t border-border/70 pt-4 md:grid-cols-[12rem_minmax(0,1fr)_9rem] md:items-center">
                <div>
                  <p className="text-sm font-semibold">Answer depth</p>
                  <p className="text-xs text-muted-foreground">{researchDepth === 'deep' ? `${currentTopicPlan.label}: relevant sources are added automatically.` : 'More depth uses more AI tokens.'}</p>
                </div>
                <div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={RESEARCH_DEPTHS.findIndex(option => option.id === researchDepth)}
                    onChange={event => setResearchDepth(RESEARCH_DEPTHS[Number(event.target.value)].id)}
                    disabled={isResearching}
                    className="research-depth-slider w-full"
                    aria-label="AI answer depth"
                    aria-valuetext={RESEARCH_DEPTHS.find(option => option.id === researchDepth)?.label}
                  />
                  <div className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
                    {RESEARCH_DEPTHS.map(option => <span key={option.id}>{option.label}</span>)}
                  </div>
                </div>
                <div className="md:text-right">
                  <Badge variant="outline">{RESEARCH_DEPTHS.find(option => option.id === researchDepth)?.cost} cost</Badge>
                  <p className="mt-1 text-[0.65rem] leading-tight text-muted-foreground">{RESEARCH_DEPTHS.find(option => option.id === researchDepth)?.description}</p>
                </div>
              </div>

              {showSourcePicker && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">Choose sources</h2>
                      <p className="text-xs text-muted-foreground">Use fewer sources for a faster, easier-to-review result set.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSources([])}>Clear all</Button>
                  </div>
                  <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {allSources.map(source => (
                      <div key={source.id} className={`flex items-center rounded-md border transition-colors ${selectedSources.includes(source.id) ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-surface'}`}>
                        <button className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => toggleSource(source.id)}>
                          <span>{source.icon}</span>
                          <span className="truncate font-medium">{source.name}</span>
                        </button>
                        {source.id.startsWith('custom-') && (
                          <Button variant="ghost" size="sm" className="mr-1 h-7 w-7 p-0 text-muted-foreground hover:text-danger" onClick={() => removeCustomSource(source.id)} aria-label={`Remove ${source.name}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                    {!showCustomForm ? (
                      <Button variant="outline" size="sm" onClick={() => setShowCustomForm(true)}><Plus className="mr-2 h-4 w-4" />Custom source</Button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Input className="w-16" value={customIcon} onChange={event => setCustomIcon(event.target.value)} aria-label="Source icon" />
                        <Input className="w-48" value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Source name" />
                        <Button size="sm" onClick={addCustomSource}>Add</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowCustomForm(false)}>Cancel</Button>
                      </div>
                    )}
                    {!showApiModal ? (
                      <Button variant="outline" size="sm" onClick={() => setShowApiModal(true)}><Plus className="mr-2 h-4 w-4" />Custom API</Button>
                    ) : (
                      <div className="flex flex-1 flex-wrap gap-2">
                        <Input className="min-w-40 flex-1" value={newApiName} onChange={event => setNewApiName(event.target.value)} placeholder="API name" />
                        <Input className="min-w-64 flex-[2]" value={newApiUrl} onChange={event => setNewApiUrl(event.target.value)} placeholder="URL with {query}" />
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
                </div>
              )}
            </Card>

            {isResearching && (
              <WorkActivity
                title={`Researching “${topic}”`}
                messages={[researchStatus]}
              />
            )}

            {Object.keys(results).length > 0 && (
              <section className="min-h-[28rem] overflow-hidden rounded-lg border border-border bg-surface/40">
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2">
                  {resultSourceIds.map(id => {
                    const source = allSources.find(item => item.id === id);
                    if (!source) return null;
                    const sourceResult = results[id];
                    const count = Array.isArray(sourceResult) ? sourceResult.length : sourceResult?.items?.length ?? sourceResult?.dorks?.length ?? 1;
                    return (
                      <button key={id} onClick={() => openResultTab(id)} className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        <span>{source.icon}</span> {source.name} <span className="font-mono text-xs opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{allSources.find(source => source.id === activeTab)?.name ?? activeTab}</p>
                    <p className="text-xs text-muted-foreground">{activeResultCount} result{activeResultCount === 1 ? '' : 's'}</p>
                  </div>
                  {((Array.isArray(activeResult) && activeResult.length > 4) || (Array.isArray(activeResult?.items) && activeResult.items.length > 4)) && (
                    <div className="relative w-full max-w-xs">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-9 pl-9" value={resultFilter} onChange={event => setResultFilter(event.target.value)} placeholder="Filter these results" />
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-5">{renderTabContent()}</div>
              </section>
            )}

            {!isResearching && Object.keys(results).length === 0 && (
              <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
                <Search className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-medium">Your evidence will appear here</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Enter a topic, choose only the sources you need, and run the investigation.</p>
              </div>
            )}
          </div>
        </main>

        {showFindings && (
          <aside className="min-h-0 overflow-y-auto border-l border-border bg-sidebar p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Saved findings</h2>
                <p className="text-xs text-muted-foreground">Evidence selected for the report</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportReport} disabled={findings.length === 0}><Download className="mr-1 h-4 w-4" /> Export</Button>
            </div>
            {findings.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Save a result to add it here.</div>
            ) : (
              <div className="space-y-2">
                {findings.map(finding => (
                  <article key={finding.id} className="rounded-md bg-surface p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold leading-snug">{finding.title}</span>
                      <button onClick={() => toggleBookmark(finding.id, finding.isBookmarked)} className={finding.isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'} aria-label="Toggle bookmark"><Bookmark className="h-4 w-4" /></button>
                    </div>
                    <Badge variant="secondary" className="mt-2 w-fit">{SOURCES.find(source => source.id === finding.sourceType)?.icon} {finding.sourceName}</Badge>
                    {finding.snippet && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{finding.snippet}</p>}
                    {finding.url && <a href={finding.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center text-xs text-primary hover:underline"><ExternalLink className="mr-1 h-3 w-3" /> View source</a>}
                  </article>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}








