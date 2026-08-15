const COMPARISON_PATTERN = /(?:difference\s+between|compare)\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+?)(?:\?|$)/i;

function normalizeQuestion(topic: string): string {
  return topic
    .replace(/\b(?:diff\w*|comparison)\b/gi, 'difference')
    .replace(/\bbetw\w*\b/gi, 'between')
    .replace(/\b(?:what(?:'s|\s+is)?|explain|tell\s+me|show\s+me)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEntity(value: string): string {
  return value.replace(/^(?:the|a|an)\s+/i, '').replace(/[?.!,]+$/g, '').trim();
}

export function expandResearchQuery(topic: string): string[] {
  const original = topic.trim();
  const normalized = normalizeQuestion(original);
  const comparison = normalized.match(COMPARISON_PATTERN);
  const candidates = [original];

  if (comparison) {
    const left = cleanEntity(comparison[1]);
    const right = cleanEntity(comparison[2]);
    if (left && right) candidates.push(left, right, `${left} ${right}`, `${left} versus ${right}`);
  } else if (normalized && normalized.toLowerCase() !== original.toLowerCase()) {
    candidates.push(normalized);
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function getFocusedResearchQuery(topic: string): string {
  const expanded = expandResearchQuery(topic);
  return expanded.length >= 4 ? expanded[3] : expanded[1] ?? expanded[0] ?? topic;
}

export type ResearchTopicKind = 'technical' | 'current-events' | 'people-organizations' | 'location' | 'general';

export function getTopicResearchPlan(topic: string): { kind: ResearchTopicKind; sources: string[]; label: string } {
  const value = topic.toLowerCase();
  if (/\b(?:software|database|sql|nosql|security|cyber|science|research|technology|compare|difference|medical|health|engineering|algorithm)\b/.test(value)) {
    return { kind: 'technical', sources: ['ai', 'wikipedia', 'papers', 'documents', 'books', 'web', 'youtube'], label: 'Technical evidence plan' };
  }
  if (/\b(?:latest|today|current|recent|news|event|election|war|market|trend)\b/.test(value)) {
    return { kind: 'current-events', sources: ['ai', 'news', 'web', 'youtube', 'wikipedia', 'documents'], label: 'Current-events plan' };
  }
  if (/\b(?:person|people|company|organization|organisation|founder|ceo|profile|username)\b/.test(value)) {
    return { kind: 'people-organizations', sources: ['ai', 'news', 'web', 'wikipedia', 'documents', 'youtube'], label: 'Entity research plan' };
  }
  if (/\b(?:weather|city|country|location|place|climate|geography)\b/.test(value)) {
    return { kind: 'location', sources: ['ai', 'wikipedia', 'web', 'news', 'weather'], label: 'Location intelligence plan' };
  }
  return { kind: 'general', sources: ['ai', 'wikipedia', 'news', 'books', 'papers', 'documents', 'web', 'youtube'], label: 'Broad research plan' };
}
