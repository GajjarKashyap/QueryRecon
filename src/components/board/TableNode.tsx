import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Card } from '../ui/card';
import { useState } from 'react';
import { Table, GripHorizontal, Plus } from 'lucide-react';
import { Button } from '../ui/button';

export function TableNode({ data, selected }: any) {
  const [rows, setRows] = useState<string[][]>(data.metadata?.rows || [['Header 1', 'Header 2'], ['Row 1', 'Row 2']]);

  const addRow = () => {
    const newRows = [...rows, Array(rows[0].length).fill('')];
    setRows(newRows);
    if(data.onChange) data.onChange({ rows: newRows });
  };
  
  const addCol = () => {
    const newRows = rows.map(r => [...r, '']);
    setRows(newRows);
    if(data.onChange) data.onChange({ rows: newRows });
  };
  
  const updateCell = (rIdx: number, cIdx: number, val: string) => {
    const newRows = [...rows];
    newRows[rIdx] = [...newRows[rIdx]];
    newRows[rIdx][cIdx] = val;
    setRows(newRows);
    if(data.onChange) data.onChange({ rows: newRows });
  };

  return (
    <Card className="w-full h-full shadow-2xl border-primary/20 bg-background/95 backdrop-blur">
      <NodeResizer color="#0ea5e9" isVisible={selected} minWidth={250} minHeight={150} />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary" />
      <div className="p-2 border-b border-primary/20 flex items-center gap-2 bg-primary/10 rounded-t-xl cursor-move drag-handle">
        <GripHorizontal className="w-4 h-4 text-primary" />
        <Table className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary tracking-wider uppercase">{data.label || 'Data Table'}</span>
      </div>
      <div className="p-2 flex flex-col gap-1 overflow-auto h-[calc(100%-36px)]">
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1">
            {row.map((cell, cIdx) => (
              <input
                key={cIdx}
                value={cell}
                onChange={e => updateCell(rIdx, cIdx, e.target.value)}
                className={`w-full min-w-[80px] p-1 text-xs bg-surface border border-border text-foreground rounded focus:border-primary outline-none ${rIdx === 0 ? 'font-bold bg-primary/10 border-primary/20' : ''}`}
                placeholder={`Cell`}
              />
            ))}
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="ghost" className="h-6 text-xs flex-1" onClick={addRow}><Plus className="w-3 h-3 mr-1"/> Row</Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs flex-1" onClick={addCol}><Plus className="w-3 h-3 mr-1"/> Col</Button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary" />
    </Card>
  );
}



