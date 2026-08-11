import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import { Card } from '../components/ui/card';
import { History as HistoryIcon, Clock } from 'lucide-react';

export default function History() {
  const history = useLiveQuery(() => db.history.orderBy('executedAt').reverse().toArray());

  return (
    <div className="p-8 h-full w-full bg-background flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Query History</h1>
        <p className="text-muted-foreground mt-1">A timeline of your executed searches.</p>
      </div>

      <div className="flex flex-col gap-4">
        {history?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No history recorded.
          </div>
        )}
        {history?.map(entry => (
          <Card key={entry.id} className="p-4 bg-surface border-border flex flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1"><HistoryIcon className="w-3 h-3" /> {entry.engine}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(entry.executedAt).toLocaleString()}</span>
            </div>
            <div className="font-mono text-sm text-primary break-all">
              {entry.compiledQuery}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
