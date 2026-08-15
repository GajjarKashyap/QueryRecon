import { useState, useCallback, useRef, useEffect } from 'react';
import { MousePointer2 } from 'lucide-react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { db, type ResearchFinding, type InvestigationBoard as IBoard } from '../store/db';
import { FindingNode } from '../components/board/FindingNode';
import { NoteNode } from '../components/board/NoteNode';
import { TableNode } from '../components/board/TableNode';
import { LinkNode } from '../components/board/LinkNode';
import { ImageNode } from '../components/board/ImageNode';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Plus, Save, Network, FolderOpen, Table, Link, Image as ImageIcon } from 'lucide-react';
import { toast } from '../components/ui/toast';

const nodeTypes = {
  finding: FindingNode,
  note: NoteNode,
  table: TableNode,
  link: LinkNode,
  image: ImageNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

function BoardLayout() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [findings, setFindings] = useState<ResearchFinding[]>([]);
  const [boards, setBoards] = useState<IBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('New Investigation');

  useEffect(() => {
    let cancelled = false;
    const initializeBoard = async () => {
      const [allFindings, allBoards] = await Promise.all([
        db.findings.toArray(),
        db.boards.toArray(),
      ]);
      if (cancelled) return;
      setFindings(allFindings);
      setBoards(allBoards);

      const firstBoard = allBoards[0];
      if (!firstBoard) return;
      setActiveBoardId(firstBoard.id);
      setBoardName(firstBoard.name);
      setNodes((firstBoard.nodes as Node[] || []).map(node => ({
        ...node,
        data: {
          ...node.data,
          onChange: (value: unknown) => {
            const updates = typeof value === 'string' ? { label: value } : value as Record<string, unknown>;
            setNodes(current => current.map(item => item.id === node.id
              ? { ...item, data: { ...item.data, ...updates } }
              : item));
          },
        },
      })));
      setEdges(firstBoard.edges as Edge[] || []);
    };

    void initializeBoard();
    return () => { cancelled = true; };
  }, [setEdges, setNodes]);

  const loadBoards = async () => {
    const allBoards = await db.boards.toArray();
    setBoards(allBoards);
    if (allBoards.length > 0 && !activeBoardId) {
      loadBoard(allBoards[0].id);
    }
  };

  const bindNodeData = (node: any) => ({
    ...node,
    data: {
      ...node.data,
      onChange: (val: any) => {
        const updates = typeof val === 'string' ? { label: val } : val;
        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, ...updates } } : n));
      }
    }
  });

  const loadBoard = async (id: string) => {
    const b = await db.boards.get(id);
    if (b) {
      setActiveBoardId(b.id);
      setBoardName(b.name);
      setNodes((b.nodes as any || []).map(bindNodeData));
      setEdges(b.edges as any || []);
      setTimeout(() => reactFlowInstance?.setViewport(b.viewport), 50);
    }
  };

  const createNewBoard = async () => {
    const newBoard: IBoard = {
      id: `board-${Date.now()}`,
      name: 'Untitled Investigation',
      projectIds: [],
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.boards.add(newBoard);
    await loadBoards();
    loadBoard(newBoard.id);
  };

  const saveBoard = async () => {
    if (!activeBoardId || !reactFlowInstance) return;
    const viewport = reactFlowInstance.getViewport();
    
    // We update db directly
    await db.boards.update(activeBoardId, {
      name: boardName,
      nodes: nodes as any,
      edges: edges as any,
      viewport: viewport,
      updatedAt: Date.now()
    });
    toast('Board saved!', 'success');
    loadBoards();
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode: any = {
        id: getId(),
        type,
        position,
        data: {},
      };

      if (type === 'finding') {
        const findingData = JSON.parse(event.dataTransfer.getData('application/finding-data'));
        newNode.data = {
          label: findingData.title,
          snippet: findingData.snippet,
          url: findingData.url,
          sourceName: findingData.sourceName
        };
      } else if (type === 'note') {
        newNode.data = {
          label: 'Double click to edit',
          onChange: (val: string) => {
            // Update logic can be tricky inside a ref without a state update, 
            // but we can rely on ReactFlow's internal state or save on button click
            newNode.data.label = val;
          }
        };
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const addBoardNode = (type: string) => {
    const position = reactFlowInstance?.screenToFlowPosition({ x: window.innerWidth / 2 + (Math.random() * 50), y: window.innerHeight / 2 + (Math.random() * 50) }) || { x: 100, y: 100 };
    const newNode = bindNodeData({
      id: getId(),
      type,
      position,
      data: { label: type === 'note' ? 'Double click to edit' : '' }
    });
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden text-foreground">
      {/* LEFT SIDEBAR: Boards & Findings */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-surface/50 backdrop-blur-md z-10 shadow-2xl overflow-y-auto">
        <div className="p-4 border-b border-border/50 bg-background/50 sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><Network className="w-5 h-5 text-primary" /> Investigations</h2>
            <Button size="sm" variant="outline" onClick={createNewBoard}><Plus className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 border-b border-border/50 pb-4">
            {boards.map(b => (
              <div 
                key={b.id} 
                onClick={() => loadBoard(b.id)}
                className={`p-2 rounded cursor-pointer text-sm font-medium transition-colors ${activeBoardId === b.id ? 'bg-primary/20 text-primary border border-primary/50' : 'hover:bg-white/5 border border-transparent text-muted-foreground'}`}
              >
                <FolderOpen className="inline w-4 h-4 mr-2" />
                {b.name}
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Drag Findings to Canvas</h3>
        </div>
        
        <div className="flex-1 p-4 space-y-3">
          {findings.map(f => (
            <Card 
              key={f.id}
              className="p-3 cursor-grab hover:border-primary/50 transition-colors shadow-lg active:cursor-grabbing bg-surface"
              draggable
              onDragStart={(e: any) => {
                e.dataTransfer.setData('application/reactflow', 'finding');
                e.dataTransfer.setData('application/finding-data', JSON.stringify(f));
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              <div className="font-semibold text-sm line-clamp-2 leading-tight mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{f.sourceName}</div>
            </Card>
          ))}
          {findings.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No saved findings. Go to Research Mode to gather intel first.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CANVAS */}
      <div className="flex-1 flex flex-col relative" ref={reactFlowWrapper}>
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Input 
            value={boardName} 
            onChange={e => setBoardName(e.target.value)} 
            className="w-64 bg-surface/80 backdrop-blur border-border/50 font-bold" 
          />
          <Button onClick={saveBoard} variant="default" className="shadow-lg"><Save className="w-4 h-4 mr-2"/> Save</Button>
          <Button onClick={() => addBoardNode('note')} variant="secondary" className="shadow-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50"><Plus className="w-4 h-4 mr-2"/> Note</Button>
          <Button onClick={() => addBoardNode('table')} variant="secondary" className="shadow-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-emerald-500/50"><Table className="w-4 h-4 mr-2"/> Table</Button>
          <Button onClick={() => addBoardNode('link')} variant="secondary" className="shadow-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-blue-500/50"><Link className="w-4 h-4 mr-2"/> Link</Button>
          <Button onClick={() => addBoardNode('image')} variant="secondary" className="shadow-lg bg-pink-500/20 text-pink-500 hover:bg-pink-500/30 border-pink-500/50"><ImageIcon className="w-4 h-4 mr-2"/> Photo</Button>
        </div>

        {/* Properties Panel */}
        {nodes.some(n => n.selected) || edges.some(e => e.selected) ? (
          <div className="absolute top-4 right-4 z-10 w-72 bg-surface/90 backdrop-blur-md border border-border/50 rounded-lg shadow-2xl p-4 flex flex-col gap-4">
            <h3 className="font-bold flex items-center gap-2 border-b border-border/50 pb-2"><MousePointer2 className="w-4 h-4 text-primary" /> Properties</h3>
            
            {nodes.filter(n => n.selected).map(node => (
              <div key={node.id} className="space-y-3">
                <div className="text-sm font-semibold text-muted-foreground">Selected Box</div>
                <div>
                  <label className="text-xs mb-1 block">Background Color</label>
                  <div className="flex gap-2">
                    {['#171717', '#eab30820', '#ec489920', '#0ea5e920', '#10b98120'].map(c => (
                      <div key={c} onClick={() => {
                        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, style: { ...n.style, backgroundColor: c, border: `1px solid ${c.replace('20', '80')}` } } : n));
                      }} className="w-6 h-6 rounded cursor-pointer border border-border/50" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {edges.filter(e => e.selected).map(edge => (
              <div key={edge.id} className="space-y-3 border-t border-border/50 pt-3">
                <div className="text-sm font-semibold text-muted-foreground">Selected Line</div>
                <div>
                  <label className="text-xs mb-1 block">Label Text</label>
                  <Input 
                    value={edge.label as string || ''}
                    onChange={e => setEdges(eds => eds.map(ed => ed.id === edge.id ? { ...ed, label: e.target.value, labelStyle: { fill: '#fff', fontWeight: 700 }, labelBgStyle: { fill: '#171717', color: '#fff', fillOpacity: 0.8 } } : ed))}
                    placeholder="e.g. Owned By"
                    className="h-8 text-xs bg-black/50"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block">Line Color</label>
                  <div className="flex gap-2">
                    {['#ffffff', '#eab308', '#ec4899', '#0ea5e9', '#10b981', '#ef4444'].map(c => (
                      <div key={c} onClick={() => {
                        setEdges(eds => eds.map(ed => ed.id === edge.id ? { ...ed, style: { ...ed.style, stroke: c } } : ed));
                      }} className="w-6 h-6 rounded cursor-pointer" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block">Line Thickness</label>
                  <input 
                    type="range" min="1" max="10" 
                    value={(edge.style?.strokeWidth as number) || 2}
                    onChange={e => setEdges(eds => eds.map(ed => ed.id === edge.id ? { ...ed, style: { ...ed.style, strokeWidth: parseInt(e.target.value) } } : ed))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#0a0a0a]"
        >
          <Controls className="bg-surface/80 backdrop-blur border-border/50 !rounded-lg overflow-hidden shadow-2xl" />
          <MiniMap className="!bg-surface/80 !backdrop-blur !border-border/50 rounded-lg shadow-2xl" maskColor="rgba(0, 0, 0, 0.5)" />
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#333" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function InvestigationBoard() {
  return (
    <ReactFlowProvider>
      <BoardLayout />
    </ReactFlowProvider>
  );
}






