import { Handle, Position } from '@xyflow/react';
import { Card } from '../ui/card';
import { Link, GripHorizontal, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function LinkNode({ data }: any) {
  const [url, setUrl] = useState(data.url || '');

  return (
    <Card className="w-64 shadow-xl border-blue-500/30 bg-background/95 backdrop-blur">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <div className="p-2 border-b border-blue-500/30 flex items-center gap-2 bg-blue-500/10 rounded-t-xl cursor-move drag-handle">
        <GripHorizontal className="w-4 h-4 text-blue-500" />
        <Link className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-bold text-blue-500 tracking-wider uppercase">External Link</span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <input 
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if(data.onChange) data.onChange({ url: e.target.value });
          }}
          placeholder="https://..."
          className="w-full text-xs p-1.5 bg-surface border border-border rounded text-foreground focus:border-blue-500 outline-none"
        />
        {url && (
          <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
            <ExternalLink className="w-3 h-3" /> Open Link
          </a>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </Card>
  );
}


