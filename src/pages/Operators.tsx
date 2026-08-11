import { Code2, Terminal } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { OperatorRegistry } from '../core/query';

export default function Operators() {
  const operators = Object.values(OperatorRegistry);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <header className="p-6 border-b border-border bg-surface">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" />
          Operator Dictionary
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          A comprehensive reference of all supported search engine operators available in the Query Builder.
        </p>
      </header>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operators.map((op) => (
            <Card key={op.name} className="p-5 bg-surface-elevated border-border hover:border-primary/40 transition-colors flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg font-mono text-foreground">{op.name}:</h3>
                </div>
                {op.requiresValue && (
                  <Badge variant="outline" className="text-xs bg-surface border-border">Requires Value</Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground flex-1">
                {op.description}
              </p>

              <div className="mt-2 bg-background border border-border p-3 rounded-md">
                <span className="text-xs text-muted-foreground font-semibold uppercase mb-1 block">Example Usage</span>
                <code className="text-sm text-primary font-mono block overflow-x-auto whitespace-nowrap">
                  {op.examples[0]}
                </code>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
