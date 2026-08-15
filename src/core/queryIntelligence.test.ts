import { describe, expect, it } from 'vitest';
import { compileForEngine, buildSearchUrl } from './engines';
import { assessQuery, parseNaturalLanguageQuery } from './queryIntelligence';
import type { QueryNode } from './query';

describe('query intelligence', () => {
  it('builds a scoped AST from a natural-language prompt', () => {
    const ast = parseNaturalLanguageQuery('Find PDF reports on example.com after 2025-01-01');

    expect(ast.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ operator: 'site', value: 'example.com' }),
      expect.objectContaining({ operator: 'filetype', value: 'pdf' }),
      expect.objectContaining({ operator: 'after', value: '2025-01-01' }),
    ]));
  });

  it('warns when an exposure query has no target scope', () => {
    const ast: QueryNode = {
      id: 'root', type: 'group', booleanOp: 'AND', children: [
        { id: '1', type: 'operator', operator: 'filetype', value: 'env' },
        { id: '2', type: 'term', value: 'API_KEY' },
      ],
    };

    const result = assessQuery(ast, 'google');
    expect(result.risk).toBe('high');
    expect(result.warnings[0]).toContain('site:');
  });

  it('reports operators that the selected engine may ignore', () => {
    const ast: QueryNode = { id: '1', type: 'operator', operator: 'inurl', value: 'admin' };
    expect(assessQuery(ast, 'bing').unsupportedOperators).toEqual(['inurl']);
  });
});

describe('engine profiles', () => {
  const ast: QueryNode = {
    id: 'root', type: 'group', booleanOp: 'AND', children: [
      { id: '1', type: 'operator', operator: 'site', value: 'example.com' },
      { id: '2', type: 'operator', operator: 'intitle', value: 'launch video' },
    ],
  };

  it('adapts Google-only prefixes for YouTube', () => {
    expect(compileForEngine(ast, 'youtube')).toBe('example.com intitle:"launch video"');
  });

  it('opens the selected engine, not Google unconditionally', () => {
    expect(buildSearchUrl('site:example.com', 'bing')).toBe(
      'https://www.bing.com/search?q=site%3Aexample.com',
    );
  });
});
