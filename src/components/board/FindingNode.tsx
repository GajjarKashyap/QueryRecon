import { Handle, Position } from '@xyflow/react';
import { Card } from '../ui/card';
import { ExternalLink, Database } from 'lucide-react';
import { Badge } from '../ui/badge';

interface FindingNodeProps {
  data: {
    label: string;
    snippet?: string;
    url?: string;
    sourceName?: string;
  };
}

export function FindingNode({ data }: FindingNodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      <Handle type="target" position={Position.Left} id="left-t" className="w-3 h-3 bg-primary" />
      <Card className="w-72 bg-surface/90 backdrop-blur border-border/50 shadow-xl overflow-hidden group">
        <div className="p-3 border-b border-border/50 flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm leading-tight text-foreground">{data.label}</h3>
          {data.url && (
            <a href={data.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary shrink-0 transition-colors">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        
        {data.snippet && (
          <div className="p-3 text-xs text-muted-foreground bg-black/20">
            <p className="line-clamp-4">{data.snippet}</p>
          </div>
        )}
        
        {data.sourceName && (
          <div className="p-2 border-t border-border/50 bg-surface/50">
            <Badge variant="secondary" className="text-[10px] opacity-80 flex gap-1 w-fit">
              <Database className="w-3 h-3" /> {data.sourceName}
            </Badge>
          </div>
        )}
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
      <Handle type="source" position={Position.Right} id="right-s" className="w-3 h-3 bg-primary" />
    </>
  );
}

