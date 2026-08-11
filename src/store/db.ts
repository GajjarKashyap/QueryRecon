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

export interface ResearchProject {
  id: string;
  topic: string;
  createdAt: number;
  updatedAt: number;
  selectedSources: string[];
  customSources: CustomSource[];
  status: 'idle' | 'running' | 'complete';
}

export interface CustomSource {
  id: string;
  name: string;
  icon: string;
  url?: string;
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

export const db = new Dexie('QueryReconDB') as Dexie & {
  sessions: EntityTable<ResearchSession, 'id'>;
  savedQueries: EntityTable<SavedQuery, 'id'>;
  history: EntityTable<QueryHistory, 'id'>;
  researchProjects: EntityTable<ResearchProject, 'id'>;
  findings: EntityTable<ResearchFinding, 'id'>;
};

db.version(1).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, title, isFavorite, *tags',
  history: 'id, executedAt'
});

db.version(2).stores({
  sessions: 'id, updatedAt',
  savedQueries: 'id, updatedAt, title, isFavorite, *tags',
  history: 'id, executedAt'
});

db.version(3).stores({
  researchProjects: 'id, updatedAt',
  findings: 'id, projectId, sourceType, discoveredAt, *tags, isBookmarked'
});
