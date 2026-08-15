import type { Operator, QueryNode } from './query';
import { EngineProfiles, type SearchEngine } from './engines';

export type QueryRisk = 'low' | 'medium' | 'high';

export interface QueryAssessment {
  risk: QueryRisk;
  score: number;
  operatorCount: number;
  warnings: string[];
  unsupportedOperators: Operator[];
}

const sensitiveTerms = /password|credential|secret|api[_ -]?key|private key|database|\benv\b|confidential/i;
const exposureOperators = new Set<Operator>(['filetype', 'ext', 'inurl', 'intitle', 'intext']);

function visit(node: QueryNode, visitor: (node: QueryNode) => void) {
  visitor(node);
  node.children?.forEach(child => visit(child, visitor));
}

export function assessQuery(node: QueryNode, engine: SearchEngine): QueryAssessment {
  let score = 0;
  let operatorCount = 0;
  let hasScope = false;
  const operators = new Set<Operator>();

  visit(node, current => {
    if (current.type === 'operator' && current.operator) {
      operatorCount += 1;
      operators.add(current.operator);
      if (current.operator === 'site' && current.value?.trim()) hasScope = true;
      if (exposureOperators.has(current.operator)) score += 1;
    }
    if (sensitiveTerms.test(current.value ?? '')) score += 2;
    if (current.negated) score += 1;
  });

  if (!hasScope && operatorCount > 0) score += 2;
  const unsupportedOperators = [...operators].filter(
    operator => !EngineProfiles[engine].supportedOperators.has(operator),
  );
  const warnings: string[] = [];
  if (!hasScope && operatorCount > 0) warnings.push('Add a site: operator to keep the search within an authorized target.');
  if (unsupportedOperators.length > 0) {
    warnings.push(`${EngineProfiles[engine].label} may ignore: ${unsupportedOperators.join(', ')}.`);
  }

  return {
    risk: score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low',
    score,
    operatorCount,
    warnings,
    unsupportedOperators,
  };
}

const domainPattern = /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+)\b/i;
const extensionPattern = /\b(?:pdf|docx?|xlsx?|csv|pptx?|txt|log|sql|json|ya?ml|env|pem|key|zip|tar|gz|mp4|mov)\b/gi;

export function parseNaturalLanguageQuery(input: string): QueryNode {
  const prompt = input.trim();
  const children: QueryNode[] = [];
  const used = new Set<string>();
  const pushOperator = (operator: Operator, value: string) => {
    const normalized = value.trim().replace(/^['"]|['"]$/g, '');
    const key = `${operator}:${normalized.toLowerCase()}`;
    if (!normalized || used.has(key)) return;
    used.add(key);
    children.push({ id: crypto.randomUUID(), type: 'operator', operator, value: normalized });
  };

  const domain = prompt.match(domainPattern)?.[1];
  if (domain) pushOperator('site', domain);

  const extensions = [...prompt.matchAll(extensionPattern)].map(match => match[0].toLowerCase());
  const uniqueExtensions = [...new Set(extensions)];
  if (/\b(file|document|report|spreadsheet|presentation|log|dump|backup)s?\b/i.test(prompt) && uniqueExtensions.length) {
    pushOperator('filetype', uniqueExtensions.join(' OR '));
  }

  const titleMatch = prompt.match(/(?:title|page title)(?:\s+(?:contains?|with|including))?\s+["']?([^,"']{2,60})["']?/i);
  if (titleMatch) pushOperator('intitle', titleMatch[1].replace(/\b(?:on|at|from)\s+\S+.*$/i, ''));

  const urlMatch = prompt.match(/(?:url|path)(?:\s+(?:contains?|with|including))?\s+["']?([^,"']{2,60})["']?/i);
  if (urlMatch) pushOperator('inurl', urlMatch[1].replace(/\b(?:on|at|from)\s+\S+.*$/i, ''));

  const before = prompt.match(/\bbefore\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1];
  const after = prompt.match(/\bafter\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1];
  if (before) pushOperator('before', before);
  if (after) pushOperator('after', after);

  const quotedTerms = [...prompt.matchAll(/["']([^"']{2,80})["']/g)].map(match => match[1]);
  quotedTerms.forEach(value => {
    if (!children.some(child => child.value?.toLowerCase() === value.toLowerCase())) {
      children.push({ id: crypto.randomUUID(), type: 'term', value });
    }
  });

  if (children.length === 0) {
    children.push({ id: crypto.randomUUID(), type: 'term', value: prompt });
  }

  return { id: 'root', type: 'group', booleanOp: 'AND', children };
}
