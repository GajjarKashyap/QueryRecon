import { useRouteError } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function ErrorBoundary() {
  const error = useRouteError() as any;
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-8">
      <AlertTriangle className="w-16 h-16 text-danger mb-4" />
      <h1 className="text-3xl font-bold mb-2">Something went wrong!</h1>
      <p className="text-muted-foreground mb-6">An unexpected application error occurred.</p>
      <div className="bg-surface border border-border p-4 rounded-md font-mono text-sm text-danger break-all max-w-2xl overflow-auto">
        {error?.message || error?.statusText || String(error)}
      </div>
      <button onClick={() => window.location.href = '/'} className="mt-8 px-4 py-2 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90">
        Return to Dashboard
      </button>
    </div>
  );
}
