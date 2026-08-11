import { create } from 'zustand';
import type { QueryNode } from '../core/query';
import { compileGoogleQuery } from '../core/engines/google';
import { compileBingQuery } from '../core/engines/bing';
import { compileYouTubeQuery } from '../core/engines/youtube';

interface QueryState {
  rootNode: QueryNode;
  compiledQuery: string;
  engine: string;
  setEngine: (engine: string) => void;
  setRootNode: (node: QueryNode) => void;
  updateNode: (id: string, updates: Partial<QueryNode>) => void;
  addNode: (parentId: string, node: QueryNode) => void;
  removeNode: (id: string) => void;
  recompile: () => void;
}

function compileQueryForEngine(node: QueryNode, engine: string): string {
  switch(engine) {
    case 'bing': return compileBingQuery(node);
    case 'youtube': return compileYouTubeQuery(node);
    case 'google':
    default: return compileGoogleQuery(node);
  }
}

function updateNodeRecursively(node: QueryNode, id: string, updates: Partial<QueryNode>): QueryNode {
  if (node.id === id) return { ...node, ...updates };
  if (node.children) return { ...node, children: node.children.map(child => updateNodeRecursively(child, id, updates)) };
  return node;
}
function removeNodeRecursively(node: QueryNode, id: string): QueryNode | null {
  if (node.id === id) return null;
  if (node.children) return { ...node, children: node.children.map(child => removeNodeRecursively(child, id)).filter((c): c is QueryNode => c !== null) };
  return node;
}
function addNodeRecursively(node: QueryNode, parentId: string, newNode: QueryNode): QueryNode {
  if (node.id === parentId) return { ...node, children: [...(node.children || []), newNode] };
  if (node.children) return { ...node, children: node.children.map(child => addNodeRecursively(child, parentId, newNode)) };
  return node;
}
const initialNode: QueryNode = { id: 'root', type: 'group', booleanOp: 'AND', children: [] };

export const useQueryStore = create<QueryState>((set, get) => ({
  rootNode: initialNode,
  compiledQuery: '',
  engine: 'google',
  setEngine: (engine) => { set({ engine }); get().recompile(); },
  setRootNode: (node) => { set({ rootNode: node }); get().recompile(); },
  updateNode: (id, updates) => { set((state) => ({ rootNode: updateNodeRecursively(state.rootNode, id, updates) })); get().recompile(); },
  addNode: (parentId, newNode) => { set((state) => ({ rootNode: addNodeRecursively(state.rootNode, parentId, newNode) })); get().recompile(); },
  removeNode: (id) => { set((state) => { const newRoot = removeNodeRecursively(state.rootNode, id); return { rootNode: newRoot || initialNode }; }); get().recompile(); },
  recompile: () => { set((state) => ({ compiledQuery: compileQueryForEngine(state.rootNode, state.engine) })); }
}));
