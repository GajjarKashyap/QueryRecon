import Dexie, { type EntityTable } from 'dexie';
import type { QueryNode } from '../core/query';

export interface ResearchSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  queryAst: QueryNode;
  compiledQuery: string;
}

export interface SavedQuery {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  queryAst: QueryNode;
  compiledQuery: string;
  isFavorite: boolean;
}

export interface QueryHistory {
  id: string;
  executedAt: number;
  compiledQuery: string;
  engine: string;
}

export interface CustomSource {
  id: string;
  name: string;
  icon: string;
  url?: string;
}

export interface ResearchProject {
  id: string;
  topic: string;
  createdAt: number;
  updatedAt: number;
  selectedSources: string[];
  customSources: CustomSource[];
  status: 'idle' | 'running' | 'complete';
  results?: Record<string, any>;
  activeTab?: string;
  researchDepth?: 'quick' | 'balanced' | 'deep';
}

export interface ResearchFinding {
  id: string;
  projectId: string;
  title: string;
  url?: string;
  snippet: string;
  sourceType: string;
  sourceName: string;
  sourceIcon?: string;
  tags: string[];
  notes: string;
  isBookmarked: boolean;
  discoveredAt: number;
  metadata?: Record<string, any>;
}

export interface BoardNode {
  id: string;
  type: 'text-note' | 'finding' | 'media' | 'domain' | 'ip' | 'person' | 'table' | 'link' | 'image';
  position: { x: number; y: number };
  data: {
    label: string;
    url?: string;
    thumbnail?: string;
    snippet?: string;
    color?: string;
    metadata?: Record<string, any>;
  };
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: { stroke?: string };
}

export interface InvestigationBoard {
  id: string;
  name: string;
  projectIds: string[];
  nodes: BoardNode[];
  edges: BoardEdge[];
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}

export interface CacheEntry {
  id: string; // usually URL or a hash
  data: any;
  timestamp: number;
  ttl: number;
}

export interface AICourtTurn {
  id: string;
  question: string;
  mode: 'standard' | 'god';
  judge: 'gemini' | 'deepseek';
  geminiModel: string;
  deepseekModel: string;
  status: 'running' | 'complete' | 'failed';
  progress?: string;
  createdAt: number;
  completedAt?: number;
  opinions: import('../core/ai/court').CourtResponse[];
  reviews: import('../core/ai/court').CourtResponse[];
  verdict?: import('../core/ai/court').CourtResponse;
  usage?: import('../core/ai/court').CourtUsage;
  error?: string;
}

export interface AICourtCase {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: AICourtTurn[];
}

export const db = new Dexie('QueryReconDB') as Dexie & {
  sessions: EntityTable<ResearchSession, 'id'>;
  savedQueries: EntityTable<SavedQuery, 'id'>;
  history: EntityTable<QueryHistory, 'id'>;
  researchProjects: EntityTable<ResearchProject, 'id'>;
  findings: EntityTable<ResearchFinding, 'id'>;
  boards: EntityTable<InvestigationBoard, 'id'>;
  cache: EntityTable<CacheEntry, 'id'>;
  courtCases: EntityTable<AICourtCase, 'id'>;
};

db.version(1).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, title, isFavorite, *tags',
  history: 'id, executedAt',
});

db.version(2).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, updatedAt, title, isFavorite, *tags',
  history: 'id, executedAt',
}).upgrade(async () => {});

db.version(3).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, updatedAt, title, isFavorite, *tags',
  history: 'id, executedAt',
  researchProjects: 'id, updatedAt',
  findings: 'id, projectId, sourceType, discoveredAt, *tags, isBookmarked',
});

db.version(4).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, updatedAt, title, isFavorite, *tags',
  history: 'id, executedAt',
  researchProjects: 'id, updatedAt',
  findings: 'id, projectId, sourceType, discoveredAt, *tags, isBookmarked',
  boards: 'id, updatedAt, *projectIds',
}).upgrade(async () => {});



db.version(5).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, updatedAt, title, isFavorite, *tags',
  history: 'id, executedAt',
  researchProjects: 'id, updatedAt',
  findings: 'id, projectId, sourceType, discoveredAt, *tags, isBookmarked',
  boards: 'id, updatedAt, *projectIds',
  cache: 'id, timestamp'
}).upgrade(async () => {});

db.version(6).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, updatedAt, title, isFavorite, *tags',
  history: 'id, executedAt',
  researchProjects: 'id, updatedAt',
  findings: 'id, projectId, sourceType, discoveredAt, *tags, isBookmarked',
  boards: 'id, updatedAt, *projectIds',
  cache: 'id, timestamp',
  courtCases: 'id, updatedAt, createdAt'
}).upgrade(async () => {});

