import { create } from 'zustand';
import type { QueryNode } from '../core/query';
import { compileForEngine, type SearchEngine } from '../core/engines';

interface QueryState {
  rootNode: QueryNode;
  compiledQuery: string;
  engine: SearchEngine;
  past: QueryNode[];
  future: QueryNode[];
  canUndo: boolean;
  canRedo: boolean;
  setEngine: (engine: SearchEngine) => void;
  setRootNode: (node: QueryNode) => void;
  updateNode: (id: string, updates: Partial<QueryNode>) => void;
  addNode: (parentId: string, node: QueryNode) => void;
  removeNode: (id: string) => void;
  undo: () => void;
  redo: () => void;
  recompile: () => void;
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
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  setEngine: (engine) => { set({ engine }); get().recompile(); },
  
  setRootNode: (node) => { 
    set((state) => ({ 
      past: [...state.past, state.rootNode],
      future: [],
      canUndo: true,
      canRedo: false,
      rootNode: node 
    })); 
    get().recompile(); 
  },
  
  updateNode: (id, updates) => { 
    set((state) => ({ 
      past: [...state.past, state.rootNode],
      future: [],
      canUndo: true,
      canRedo: false,
      rootNode: updateNodeRecursively(state.rootNode, id, updates) 
    })); 
    get().recompile(); 
  },
  
  addNode: (parentId, newNode) => { 
    set((state) => ({ 
      past: [...state.past, state.rootNode],
      future: [],
      canUndo: true,
      canRedo: false,
      rootNode: addNodeRecursively(state.rootNode, parentId, newNode) 
    })); 
    get().recompile(); 
  },
  
  removeNode: (id) => { 
    set((state) => { 
      const newRoot = removeNodeRecursively(state.rootNode, id); 
      return { 
        past: [...state.past, state.rootNode],
        future: [],
        canUndo: true,
        canRedo: false,
        rootNode: newRoot || initialNode 
      }; 
    }); 
    get().recompile(); 
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
        past: newPast,
        future: [state.rootNode, ...state.future],
        rootNode: previous,
        canUndo: newPast.length > 0,
        canRedo: true
      };
    });
    get().recompile();
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.rootNode],
        future: newFuture,
        rootNode: next,
        canUndo: true,
        canRedo: newFuture.length > 0
      };
    });
    get().recompile();
  },

  recompile: () => { set((state) => ({ compiledQuery: compileForEngine(state.rootNode, state.engine) })); }
}));
