import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Plus, Clock, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sessions() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('updatedAt').reverse().toArray());
  const navigate = useNavigate();

  const createSession = async () => {
    const id = crypto.randomUUID();
    await db.sessions.add({
      id,
      title: 'New Research Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      queryAst: { id: 'root', type: 'group', booleanOp: 'AND', children: [] },
      compiledQuery: ''
    });
    navigate('/research/' + id);
  };

  return (
    <div className="p-8 h-full w-full bg-background flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Research Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage your active OSINT investigations.</p>
        </div>
        <Button onClick={createSession}><Plus className="w-4 h-4 mr-2" /> New Session</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No active sessions. Start a new research investigation.
          </div>
        )}
        {sessions?.map(session => (
          <Card key={session.id} className="p-6 bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer flex flex-col gap-4" onClick={() => navigate('/research/' + session.id)}>
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg text-foreground">{session.title}</h3>
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              <Clock className="w-3 h-3" />
              <span>Last updated: {new Date(session.updatedAt).toLocaleString()}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
