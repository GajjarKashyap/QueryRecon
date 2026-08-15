import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Download, Upload, AlertTriangle, Trash2, Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { db } from '../store/db';
import { useApiKeysStore } from '../store/apiKeysStore';
import { toast } from '../components/ui/toast';
import { AdvancedApiRegistry } from '../core/research/advancedApis';
import { listDeepSeekModels } from '../core/research/aiSummary';
import { useLocalAssistantStore } from '../store/localAssistantStore';

export default function Settings() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  const keys = useApiKeysStore(state => state.keys);
  const models = useApiKeysStore(state => state.models);
  const setKey = useApiKeysStore(state => state.setKey);
  const setModel = useApiKeysStore(state => state.setModel);
  const [localKeys, setLocalKeys] = useState<Record<string, string>>(keys);
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});
  const [keyStatus, setKeyStatus] = useState<Record<string, 'valid' | 'invalid' | null>>({});
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const localEndpoint = useLocalAssistantStore(state => state.endpoint);
  const localModel = useLocalAssistantStore(state => state.model);
  const localRuntime = useLocalAssistantStore(state => state.runtime);
  const hermesEndpoint = useLocalAssistantStore(state => state.hermesEndpoint);
  const hermesApiKey = useLocalAssistantStore(state => state.hermesApiKey);
  const setLocalEndpoint = useLocalAssistantStore(state => state.setEndpoint);
  const setLocalModel = useLocalAssistantStore(state => state.setModel);
  const setLocalRuntime = useLocalAssistantStore(state => state.setRuntime);
  const setHermesEndpoint = useLocalAssistantStore(state => state.setHermesEndpoint);
  const setHermesApiKey = useLocalAssistantStore(state => state.setHermesApiKey);
  const [testingLocal, setTestingLocal] = useState(false);
  const [localStatus, setLocalStatus] = useState<'valid' | 'missing' | null>(null);
  
  // Sync if global state changes
  useEffect(() => {
    setLocalKeys(keys);
  }, [keys]);

  const handleKeyChange = (providerId: string, val: string) => {
    setLocalKeys(prev => ({ ...prev, [providerId]: val }));
    setKeyStatus(prev => ({ ...prev, [providerId]: null }));
  };

  const saveKey = (providerId: string) => {
    setKey(providerId, localKeys[providerId] || '');
    toast(`API Key saved!`, 'success');
  };

  const testKey = async (providerId: string) => {
    const key = localKeys[providerId];
    if (!key) return toast('Please enter a key first', 'error');

    setTestingKeys(prev => ({ ...prev, [providerId]: true }));
    let isValid = false;

    try {
      if (providerId === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        isValid = res.ok;
      } else if (providerId === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` }
        });
        isValid = res.ok;
      } else if (providerId === 'deepseek') {
        const discovered = await listDeepSeekModels(key);
        setAvailableModels(prev => ({ ...prev, deepseek: discovered }));
        isValid = discovered.length > 0;
      } else if (providerId === 'weather') {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${key}`);
        isValid = res.ok;
      } else {
        // Just mark valid if we don't have a specific test endpoint
        isValid = true;
      }
    } catch {
      isValid = false;
    }

    setKeyStatus(prev => ({ ...prev, [providerId]: isValid ? 'valid' : 'invalid' }));
    setTestingKeys(prev => ({ ...prev, [providerId]: false }));

    if (isValid) {
      toast(`${providerId} key is valid!`, 'success');
    } else {
      toast(`${providerId} key failed verification.`, 'error');
    }
  };

  const exportWorkspace = async () => {
    setExporting(true);
    try {
      const data = {
        sessions: await db.sessions.toArray(),
        savedQueries: await db.savedQueries.toArray(),
        history: await db.history.toArray(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "queryrecon-workspace-" + new Date().toISOString().split('T')[0] + ".json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast('Failed to export workspace', 'error');
    } finally {
      setExporting(false);
    }
  };

  const importWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await db.transaction('rw', db.sessions, db.savedQueries, db.history, async () => {
        if (data.sessions) await db.sessions.bulkAdd(data.sessions);
        if (data.savedQueries) await db.savedQueries.bulkAdd(data.savedQueries);
        if (data.history) await db.history.bulkAdd(data.history);
      });
      toast('Workspace imported successfully!', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to import workspace. Invalid JSON format.', 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const clearWorkspace = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete all local sessions, saved queries, and history. This action cannot be undone.')) return;
    
    setClearing(true);
    try {
      await Promise.all([
        db.sessions.clear(),
        db.savedQueries.clear(),
        db.history.clear()
      ]);
      toast('Workspace cleared successfully.', 'success');
    } catch (e) {
      console.error(e);
      toast('Failed to clear workspace', 'error');
    } finally {
      setClearing(false);
    }
  };

  const testMiniCpm = async () => {
    setTestingLocal(true);
    setLocalStatus(null);
    try {
      const { testLocalAssistant } = await import('../core/localAssistant');
      const result = await testLocalAssistant(localEndpoint, localModel);
      setLocalStatus(result.modelAvailable ? 'valid' : 'missing');
      toast(result.modelAvailable
        ? 'MiniCPM5 is available locally.'
        : `Ollama is running, but ${localModel} is not installed.`, result.modelAvailable ? 'success' : 'error');
    } catch (error) {
      setLocalStatus('missing');
      toast(error instanceof Error ? error.message : 'Could not connect to Ollama.', 'error');
    } finally {
      setTestingLocal(false);
    }
  };

  const testHermes = async () => {
    setTestingLocal(true);
    setLocalStatus(null);
    try {
      const { testHermesAgent } = await import('../core/localAssistant');
      const result = await testHermesAgent(hermesEndpoint, hermesApiKey);
      setLocalStatus('valid');
      toast(`Hermes Agent is available${result.models.length ? ` (${result.models.join(', ')})` : ''}.`, 'success');
    } catch (error) {
      setLocalStatus('missing');
      toast(error instanceof Error ? error.message : 'Could not connect to Hermes Agent.', 'error');
    } finally {
      setTestingLocal(false);
    }
  };

  // Find all APIs that require a key
  const apiIntegrations = [
    { id: 'gemini', name: 'Google Gemini', desc: 'Core Natural Language parsing' },
    { id: 'openai', name: 'OpenAI (ChatGPT)', desc: 'Advanced OSINT summarization' },
    { id: 'claude', name: 'Anthropic Claude', desc: 'AI analysis and consensus' },
    { id: 'weather', name: 'OpenWeather', desc: 'Real-time weather data for research' },
    ...AdvancedApiRegistry.filter(a => a.requiresKey).map(a => ({
      id: a.id,
      name: a.name,
      desc: a.description
    }))
  ];

  return (
    <div className="p-8 h-full w-full bg-background flex flex-col overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace data and application preferences.</p>
      </div>

      <div className="flex flex-col gap-6 max-w-3xl">

        <Card className="p-6 bg-surface border-border flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Local AI Assistant
              {localStatus === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {localStatus === 'missing' && <XCircle className="h-4 w-4 text-red-500" />}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Choose direct QueryRecon controls through Ollama, or connect the full Hermes Agent gateway.</p>
          </div>
          <select
            value={localRuntime}
            onChange={event => { setLocalRuntime(event.target.value as 'ollama' | 'hermes'); setLocalStatus(null); }}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            aria-label="Local assistant runtime"
          >
            <option value="ollama">QueryRecon controls — direct Ollama</option>
            <option value="hermes">Hermes Agent — local gateway</option>
          </select>
          {localRuntime === 'ollama' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                <Input value={localEndpoint} onChange={event => { setLocalEndpoint(event.target.value); setLocalStatus(null); }} placeholder="http://localhost:11434" aria-label="Ollama endpoint" />
                <Input value={localModel} onChange={event => { setLocalModel(event.target.value); setLocalStatus(null); }} placeholder="minicpm5-1b" aria-label="Ollama model name" />
                <Button variant="outline" onClick={testMiniCpm} disabled={testingLocal}>{testingLocal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Ollama'}</Button>
              </div>
              <p className="text-xs text-muted-foreground">Private in-app navigation and reversible Query Builder actions. Recommended model: <code>minicpm5-1b</code>.</p>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                <Input value={hermesEndpoint} onChange={event => { setHermesEndpoint(event.target.value); setLocalStatus(null); }} placeholder="http://localhost:8642" aria-label="Hermes Agent endpoint" />
                <Input type="password" value={hermesApiKey} onChange={event => { setHermesApiKey(event.target.value); setLocalStatus(null); }} placeholder="Gateway API key" aria-label="Hermes Agent API key" />
                <Button variant="outline" onClick={testHermes} disabled={testingLocal}>{testingLocal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test Hermes'}</Button>
              </div>
              <p className="text-xs text-warning">Hermes can run terminal, file, browser, and other tools enabled in its own configuration. Keep the gateway on localhost, use an API key, restrict CORS to this app, and disable toolsets you do not want.</p>
              <p className="text-xs text-muted-foreground">Hermes API mode supplies Hermes tools and memory. Its API cannot currently receive QueryRecon's in-browser navigation tools, so use direct Ollama mode when you want the assistant to control QueryRecon pages.</p>
            </>
          )}
        </Card>

        {/* Dynamic API Keys Section */}
        <Card className="p-6 bg-surface border-border flex flex-col gap-4">
          <div className="mb-2">
            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> API Integrations
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect external services to power advanced Research Mode capabilities.
            </p>
          </div>

          <div className="space-y-4">
            {apiIntegrations.map(api => (
              <div key={api.id} className="flex items-center gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="w-56">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    {api.name}
                    {keyStatus[api.id] === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {keyStatus[api.id] === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{api.desc}</div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    type="password"
                    value={localKeys[api.id] || ''}
                    onChange={e => handleKeyChange(api.id, e.target.value)}
                    placeholder="Enter API Key..."
                    className="bg-background"
                  />
                  {api.id === 'deepseek' && (
                    <select
                      value={models.deepseek || 'auto'}
                      onChange={event => setModel('deepseek', event.target.value)}
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      aria-label="DeepSeek model"
                    >
                      <option value="auto">Auto — choose an available model</option>
                      {models.deepseek && models.deepseek !== 'auto' && !availableModels.deepseek?.includes(models.deepseek) && (
                        <option value={models.deepseek}>{models.deepseek} (saved)</option>
                      )}
                      {(availableModels.deepseek ?? []).map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex gap-2 w-44">
                  <Button onClick={() => testKey(api.id)} variant="outline" className="flex-1" disabled={testingKeys[api.id]}>
                    {testingKeys[api.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                  </Button>
                  <Button onClick={() => saveKey(api.id)} variant="secondary" className="flex-1">
                    {keys[api.id] === localKeys[api.id] && keys[api.id] ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Workspace Management */}
        <Card className="p-6 bg-surface border-border flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" /> Export Workspace
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Download all your sessions, saved queries, and history as a JSON file.
              </p>
            </div>
            <Button onClick={exportWorkspace} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export JSON'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-border flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Import Workspace
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Restore a previously exported JSON workspace. This will merge with existing data.
              </p>
            </div>
            <div className="relative">
              <Button disabled={importing} variant="outline">
                {importing ? 'Importing...' : 'Import JSON'}
              </Button>
              <input 
                type="file" 
                accept=".json" 
                onChange={importWorkspace}
                className="absolute inset-0 opacity-0 cursor-pointer" 
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-surface border-danger/20 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg text-danger flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanently delete all local data. Be sure to export first.
              </p>
            </div>
            <Button variant="destructive" onClick={clearWorkspace} disabled={clearing}>
              <Trash2 className="w-4 h-4 mr-2" /> {clearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
