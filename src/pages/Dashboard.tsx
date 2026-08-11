import { Search, Clock, ArrowRight } from "lucide-react"
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function Dashboard() {
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();
  const recentSessions = useLiveQuery(() => db.sessions.orderBy('updatedAt').reverse().limit(5).toArray());
  const recentHistory = useLiveQuery(() => db.history.orderBy('executedAt').reverse().limit(5).toArray());
  const savedCount = useLiveQuery(() => db.savedQueries.count());

  const handleBuildQuery = () => {
    if (topic.trim()) {
      navigate('/builder', { state: { aiPrompt: topic } });
    } else {
      navigate('/builder');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">What are you researching?</h1>
        <p className="text-muted-foreground">
          Enter a natural language query or build an advanced search directly.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-3xl">
        <div className="flex flex-col p-4 bg-surface-elevated border border-border rounded-lg gap-4 shadow-sm focus-within:border-primary transition-colors">
          <textarea
            className="w-full bg-transparent border-none outline-none resize-none min-h-[80px] text-foreground font-mono placeholder:text-muted"
            placeholder="Find public PDF reports about ransomware from Indian government websites..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleBuildQuery()}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Ctrl+Enter to build</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/research-mode')}>
                <Search className="w-4 h-4 mr-2" /> Research Mode
              </Button>
              <button onClick={handleBuildQuery} className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 rounded-md font-medium transition-colors">
                <Search className="w-4 h-4" />
                Build Query
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <Card className="p-4 bg-surface border-border">
          <div className="text-2xl font-bold text-primary">{savedCount ?? 0}</div>
          <div className="text-sm text-muted-foreground">Saved Queries</div>
        </Card>
        <Card className="p-4 bg-surface border-border">
          <div className="text-2xl font-bold text-primary">{recentHistory?.length ?? 0}</div>
          <div className="text-sm text-muted-foreground">Recent Searches</div>
        </Card>
        <Card className="p-4 bg-surface border-border">
          <div className="text-2xl font-bold text-primary">{recentSessions?.length ?? 0}</div>
          <div className="text-sm text-muted-foreground">Research Sessions</div>
        </Card>
      </div>

      <div className="mt-4 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Recent Sessions</h2>
        <div className="flex flex-col gap-2">
          {(!recentSessions || recentSessions.length === 0) && (
            <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
              No sessions yet. Start a new research investigation from the Sessions page.
            </div>
          )}
          {recentSessions?.map(session => (
            <div key={session.id} onClick={() => navigate('/research/' + session.id)} className="flex justify-between items-center p-4 bg-surface rounded-md border border-border hover:border-primary/30 cursor-pointer transition-colors">
              <span className="text-foreground font-medium">{session.title}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(session.updatedAt).toLocaleDateString()}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {recentHistory && recentHistory.length > 0 && (
        <div className="mt-4 max-w-3xl">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Recent Searches</h2>
          <div className="flex flex-col gap-2">
            {recentHistory.map(entry => (
              <div key={entry.id} className="flex justify-between items-center p-4 bg-surface rounded-md border border-border">
                <span className="text-primary font-mono text-sm truncate flex-1">{entry.compiledQuery}</span>
                <span className="text-muted-foreground text-xs ml-4 shrink-0">
                  {new Date(entry.executedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
