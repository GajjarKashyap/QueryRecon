export type Operator = 'intext' | 'intitle' | 'inurl' | 'site' | 'filetype' | 'ext' | 'allintext' | 'allintitle' | 'allinurl' | 'cache' | 'related' | 'define' | 'before' | 'after';
export interface QueryNode {
  id: string;
  type: 'term' | 'operator' | 'group';
  value?: string;
  operator?: Operator;
  children?: QueryNode[];
  booleanOp?: 'AND' | 'OR' | 'NOT';
  negated?: boolean;
}
export interface OperatorDefinition {
  name: Operator;
  description: string;
  examples: string[];
  requiresValue: boolean;
}
export const OperatorRegistry: Record<Operator, OperatorDefinition> = {
  site: { name: 'site', description: 'Search specific domain', examples: ['site:example.com'], requiresValue: true },
  filetype: { name: 'filetype', description: 'Search file types', examples: ['filetype:pdf'], requiresValue: true },
  ext: { name: 'ext', description: 'Search extensions', examples: ['ext:pdf'], requiresValue: true },
  intext: { name: 'intext', description: 'Search in body', examples: ['intext:"password"'], requiresValue: true },
  intitle: { name: 'intitle', description: 'Search in title', examples: ['intitle:"index of"'], requiresValue: true },
  inurl: { name: 'inurl', description: 'Search in URL', examples: ['inurl:admin'], requiresValue: true },
  allintext: { name: 'allintext', description: 'All terms in body', examples: ['allintext:user pass'], requiresValue: true },
  allintitle: { name: 'allintitle', description: 'All terms in title', examples: ['allintitle:index of'], requiresValue: true },
  allinurl: { name: 'allinurl', description: 'All terms in URL', examples: ['allinurl:admin panel'], requiresValue: true },
  cache: { name: 'cache', description: 'View cached version of a page', examples: ['cache:example.com'], requiresValue: true },
  related: { name: 'related', description: 'Find related websites', examples: ['related:example.com'], requiresValue: true },
  define: { name: 'define', description: 'Define a word or phrase', examples: ['define:phishing'], requiresValue: true },
  before: { name: 'before', description: 'Results before a date', examples: ['before:2024-01-01'], requiresValue: true },
  after: { name: 'after', description: 'Results after a date', examples: ['after:2024-01-01'], requiresValue: true },
};
