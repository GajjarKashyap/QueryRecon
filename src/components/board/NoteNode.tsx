import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Card } from '../ui/card';



export function NoteNode({ data, selected }: any) {
  return (
    <>
      <NodeResizer color="#eab308" isVisible={selected} minWidth={150} minHeight={100} />
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
      <Handle type="target" position={Position.Left} id="left-t" className="w-3 h-3 bg-yellow-500" />
      <Card className="w-full h-full shadow-lg overflow-hidden bg-yellow-500/20 border-yellow-500/50 backdrop-blur-md">
        <textarea
          className="w-full h-full min-h-[100px] bg-transparent resize-none p-3 text-sm text-foreground placeholder:text-yellow-500/50 focus:outline-none"
          defaultValue={data.label}
          placeholder="Type a note..."
          onChange={(e) => data.onChange?.(e.target.value)}
        />
      </Card>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
      <Handle type="source" position={Position.Right} id="right-s" className="w-3 h-3 bg-yellow-500" />
    </>
  );
}


