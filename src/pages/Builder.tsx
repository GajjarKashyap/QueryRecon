import { explainQuery } from '../core/explain';
import { useQueryStore } from '../store/queryStore';
import { OperatorRegistry } from '../core/query';
import type { QueryNode, Operator } from '../core/query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Trash2, Code, FileText, Search, Sparkles, Copy, ExternalLink, Undo2, Redo2, ShieldAlert } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseQueryWithAI } from '../core/ai';
import { db } from '../store/db';
import { useApiKeysStore } from '../store/apiKeysStore';
import { toast } from '../components/ui/toast';
import { buildSearchUrl, EngineProfiles, type SearchEngine } from '../core/engines';
import { assessQuery, parseNaturalLanguageQuery } from '../core/queryIntelligence';
import { WorkActivity } from '../components/ui/work-activity';

const QUERY_BUILD_STEPS = [
  'Reading your intent',
  'Mapping search operators',
  'Validating the query structure'
];

const NodeView = ({ node }: { node: QueryNode }) => {
  const { updateNode, addNode, removeNode } = useQueryStore();

  if (node.type === 'group') {
    return (
      <div className="border border-border rounded-lg p-4 bg-surface/50 mb-2">
        <div className="flex items-center gap-2 mb-4">
          <Select
            value={node.booleanOp}
            onValueChange={(val: string | null) => val && updateNode(node.id, { booleanOp: val as 'AND' | 'OR' | 'NOT' })}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground uppercase font-semibold">Group</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => {
            addNode(node.id, { id: crypto.randomUUID(), type: 'term' });
          }} className="h-8 text-xs">
            <Plus className="w-4 h-4 mr-1" /> Term
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            addNode(node.id, { id: crypto.randomUUID(), type: 'operator', operator: 'site' });
          }} className="h-8 text-xs">
            <Plus className="w-4 h-4 mr-1" /> Operator
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            addNode(node.id, { id: crypto.randomUUID(), type: 'group', booleanOp: 'AND', children: [] });
          }} className="h-8 text-xs">
            <Plus className="w-4 h-4 mr-1" /> Group
          </Button>
          {node.id !== 'root' && (
            <Button variant="ghost" size="sm" onClick={() => removeNode(node.id)} className="h-8 text-danger hover:text-danger hover:bg-danger/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="pl-4 border-l-2 border-border-strong flex flex-col gap-2">
          {node.children?.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
              Empty Group. Add a term or operator.
            </div>
          )}
          {node.children?.map(child => (
            <NodeView key={child.id} node={child} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={node.negated ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => updateNode(node.id, { negated: !node.negated })}
        className="h-10 text-xs font-mono font-bold w-12"
      >
        NOT
      </Button>
      {node.type === 'operator' && (
        <Select
          value={node.operator}
          onValueChange={(val: string | null) => val && updateNode(node.id, { operator: val as Operator })}
        >
          <SelectTrigger className="w-[140px] font-mono text-sm bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(OperatorRegistry).map(op => (
              <SelectItem key={op} value={op} className="font-mono">
                {op}:
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Input
        value={node.value || ''}
        onChange={(e) => updateNode(node.id, { value: e.target.value })}
        placeholder={node.type === 'operator' ? OperatorRegistry[node.operator as Operator]?.examples[0] : 'Search term...'}
        className="flex-1 font-mono bg-surface"
      />
      <Button variant="ghost" size="sm" onClick={() => removeNode(node.id)} className="text-danger hover:text-danger hover:bg-danger/10">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default function Builder() {
  const { rootNode, compiledQuery, setRootNode, engine, setEngine, undo, redo, canUndo, canRedo } = useQueryStore();
  const initialNode: QueryNode = { id: 'root', type: 'group', booleanOp: 'AND', children: [] };
  const handleClear = () => { setRootNode(initialNode); toast('Query cleared.', 'info'); };
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const apiKeys = useApiKeysStore(state => state.keys);
  const assessment = useMemo(() => assessQuery(rootNode, engine), [rootNode, engine]);
  const engineProfile = EngineProfiles[engine];

  const executeSearch = useCallback(async () => {
    if (!compiledQuery) return;
    window.open(buildSearchUrl(compiledQuery, engine), '_blank', 'noopener,noreferrer');
    await db.history.add({
      id: crypto.randomUUID(),
      executedAt: Date.now(),
      compiledQuery,
      engine
    });
  }, [compiledQuery, engine]);

  const handleSave = async () => {
    if (!compiledQuery) return;
    const title = window.prompt('Give this query a name:', 'Untitled Query');
    if (!title) return;
    await db.savedQueries.add({
      id: crypto.randomUUID(),
      title,
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      queryAst: rootNode,
      compiledQuery,
      isFavorite: false
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = async () => {
    if (!compiledQuery) return;
    try {
      await navigator.clipboard.writeText(compiledQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Clipboard access was blocked. Select the query and copy it manually.', 'error');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        executeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeSearch]);

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    const key = apiKeys.gemini;
    setAiLoading(true);
    try {
      const ast = key
        ? await parseQueryWithAI(aiPrompt, key)
        : parseNaturalLanguageQuery(aiPrompt);
      ast.id = 'root';
      setRootNode(ast);
      if (!key) toast('Built locally. Add a Gemini key for more nuanced prompts.', 'info');
      setAiPrompt('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not build this query.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full">
      <div className="flex-1 flex flex-col overflow-y-auto bg-background">
        <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Query Builder</h1>
            <p className="text-sm text-muted-foreground">Construct advanced OSINT searches visually</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} aria-label="Undo query edit">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} aria-label="Redo query edit">
              <Redo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <Trash2 className="w-4 h-4 mr-2" /> Clear
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={!compiledQuery}>
              <FileText className="w-4 h-4 mr-2" /> {saved ? 'Saved!' : 'Save'}
            </Button>
            <Button onClick={() => executeSearch()} disabled={!compiledQuery}>
              <Search className="w-4 h-4 mr-2" /> Execute
            </Button>
          </div>
        </div>

        <div className="px-6 pt-4 border-b border-border bg-surface flex gap-4" role="tablist" aria-label="Search engine">
          {Object.values(EngineProfiles).map(profile => (
            <button
              key={profile.id}
              role="tab"
              aria-selected={engine === profile.id}
              onClick={() => setEngine(profile.id as SearchEngine)}
              className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${engine === profile.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {profile.label}
            </button>
          ))}
        </div>

        <div className="px-6 pt-6">
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Try: Find PDF reports on example.com after 2025-01-01"
              className="flex-1 bg-surface"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}
              disabled={aiLoading}
            />
            <Button onClick={handleGenerateAI} disabled={aiLoading || !aiPrompt.trim()}>
              <Sparkles className={`w-4 h-4 mr-2 ${aiLoading ? 'work-activity__spark' : ''}`} /> {aiLoading ? 'Building…' : 'Build query'}
            </Button>
          </div>
          {aiLoading && (
            <div className="mt-3">
              <WorkActivity title="Building your query" messages={QUERY_BUILD_STEPS} compact />
            </div>
          )}
        </div>

        <div className="p-6">
          <NodeView node={rootNode} />
        </div>
      </div>

      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-sidebar flex flex-col h-1/2 lg:h-auto shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Code className="w-4 h-4" /> Live Preview
          </h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground font-semibold uppercase">Human Readable Explanation</span>
            </div>
            <Card className="p-4 bg-surface border-border mb-4">
              <ul className="list-disc pl-4 text-sm text-muted-foreground">
                {explainQuery(rootNode).map((point, i) => (
                  <li key={i} className="mb-1">{point}</li>
                ))}
                {explainQuery(rootNode).length === 0 && <li>No query specified</li>}
              </ul>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Compiled Query</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{engine.charAt(0).toUpperCase() + engine.slice(1)}</Badge>
            </div>
            <div className="p-3 bg-background border border-border rounded-md font-mono text-sm text-primary break-all min-h-[100px]">
              {compiledQuery || <span className="text-muted">Empty query...</span>}
            </div>
            <div className="flex gap-2 mt-2">
              <Button className="flex-1" variant="outline" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" /> {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => executeSearch()}>
                <ExternalLink className="w-4 h-4 mr-2" /> Search {engineProfile.label}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Query assessment</span>
              <Badge variant="outline" className={assessment.risk === 'high' ? 'text-danger border-danger/40' : assessment.risk === 'medium' ? 'text-amber-400 border-amber-400/40' : 'text-emerald-400 border-emerald-400/40'}>
                {assessment.risk} risk
              </Badge>
            </div>
            <Card className="p-4 bg-surface border-border">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>{assessment.operatorCount} operator{assessment.operatorCount === 1 ? '' : 's'} detected.</p>
                  {assessment.warnings.map(warning => <p key={warning}>{warning}</p>)}
                  {assessment.warnings.length === 0 && <p>This query is scoped and compatible with {engineProfile.label}.</p>}
                </div>
              </div>
            </Card>
          </div>

          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase mb-2 block">Keyboard Shortcuts</span>
            <Card className="p-4 bg-surface border-border">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Execute query</span>
                  <kbd className="px-2 py-0.5 bg-background rounded text-xs font-mono border border-border">Ctrl+Enter</kbd>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}










