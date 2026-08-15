import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Card } from '../ui/card';
import { Image as ImageIcon, GripHorizontal } from 'lucide-react';
import { useState } from 'react';

export function ImageNode({ data, selected }: any) {
  const [url, setUrl] = useState(data.url || '');

  return (
    <Card className="w-full h-full shadow-xl border-pink-500/30 bg-background/95 backdrop-blur">
      <NodeResizer color="#ec4899" isVisible={selected} minWidth={200} minHeight={150} />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-pink-500" />
      <div className="p-2 border-b border-pink-500/30 flex items-center gap-2 bg-pink-500/10 rounded-t-xl cursor-move drag-handle">
        <GripHorizontal className="w-4 h-4 text-pink-500" />
        <ImageIcon className="w-4 h-4 text-pink-500" />
        <span className="text-xs font-bold text-pink-500 tracking-wider uppercase">Photo</span>
      </div>
      <div className="p-3 flex flex-col gap-2 h-[calc(100%-36px)]">
        <input 
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if(data.onChange) data.onChange({ url: e.target.value });
          }}
          placeholder="Image URL..."
          className="w-full text-xs p-1.5 bg-surface border border-border rounded text-foreground focus:border-pink-500 outline-none"
        />
        {url && (
          <div className="mt-2 rounded overflow-hidden border border-border/50 bg-black/50 flex items-center justify-center flex-1">
            <img src={url} alt="User added" className="max-w-full h-auto object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-pink-500" />
    </Card>
  );
}



