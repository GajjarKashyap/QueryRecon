import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Download, Upload, AlertTriangle, Trash2, Key, CheckCircle2 } from 'lucide-react';
import { db } from '../store/db';
import { useApiKeysStore } from '../store/apiKeysStore';
import { AdvancedApiRegistry } from '../core/research/advancedApis';

export default function Settings() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  const keys = useApiKeysStore(state => state.keys);
  const setKey = useApiKeysStore(state => state.setKey);
  const [localKeys, setLocalKeys] = useState<Record<string, string>>(keys);
  
  // Sync if global state changes
  useEffect(() => {
    setLocalKeys(keys);
  }, [keys]);

  const handleKeyChange = (providerId: string, val: string) => {
    setLocalKeys(prev => ({ ...prev, [providerId]: val }));
  };

  const saveKey = (providerId: string) => {
    setKey(providerId, localKeys[providerId] || '');
    alert(`API Key saved successfully!`);
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
      alert('Failed to export workspace');
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
      alert('Workspace imported successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to import workspace. Invalid JSON format.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const clearWorkspace = async () => {
    if (!confirm('Are you absolutely sure? This will delete all local sessions, saved queries, and history. This action cannot be undone.')) return;
    
    setClearing(true);
    try {
      await Promise.all([
        db.sessions.clear(),
        db.savedQueries.clear(),
        db.history.clear()
      ]);
      alert('Workspace cleared successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to clear workspace');
    } finally {
      setClearing(false);
    }
  };

  // Find all APIs that require a key
  const apiIntegrations = [
    { id: 'gemini', name: 'Google Gemini', desc: 'Core Natural Language parsing' },
    { id: 'openai', name: 'OpenAI (ChatGPT)', desc: 'Advanced OSINT summarization' },
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
                    {keys[api.id] && <CheckCircle2 className="w-3 h-3 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{api.desc}</div>
                </div>
                <Input 
                  type="password" 
                  value={localKeys[api.id] || ''} 
                  onChange={e => handleKeyChange(api.id, e.target.value)} 
                  placeholder="Enter API Key..." 
                  className="flex-1 bg-background" 
                />
                <Button onClick={() => saveKey(api.id)} variant="secondary" className="w-20">
                  {keys[api.id] === localKeys[api.id] && keys[api.id] ? 'Saved' : 'Save'}
                </Button>
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
