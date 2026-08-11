import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import { Card } from '../components/ui/card';
import { Bookmark, Star } from 'lucide-react';

export default function SavedQueries() {
  const saved = useLiveQuery(() => db.savedQueries.orderBy('updatedAt').reverse().toArray());

  return (
    <div className="p-8 h-full w-full bg-background flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Saved Queries</h1>
          <p className="text-muted-foreground mt-1">Your library of powerful OSINT searches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {saved?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
            No saved queries yet. Save a query from the Builder to see it here.
          </div>
        )}
        {saved?.map(query => (
          <Card key={query.id} className="p-6 bg-surface border-border hover:border-primary/50 transition-colors flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg text-foreground">{query.title}</h3>
              {query.isFavorite ? <Star className="w-5 h-5 text-warning fill-warning" /> : <Bookmark className="w-5 h-5 text-muted-foreground" />}
            </div>
            
            <div className="p-3 bg-background border border-border rounded-md font-mono text-sm text-primary break-all">
              {query.compiledQuery}
            </div>
            
            <p className="text-sm text-muted-foreground">{query.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
