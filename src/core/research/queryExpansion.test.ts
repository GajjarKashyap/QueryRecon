import { describe, expect, it } from 'vitest';
import { expandResearchQuery, getFocusedResearchQuery, getTopicResearchPlan } from './queryExpansion';

describe('research query expansion', () => {
  it('recovers comparison entities from a misspelled natural-language question', () => {
    const topic = 'Whats Diffrecn betwwen the SQL And NoSQL?';
    expect(expandResearchQuery(topic)).toEqual(expect.arrayContaining(['SQL', 'NoSQL', 'SQL NoSQL']));
    expect(getFocusedResearchQuery(topic)).toBe('SQL NoSQL');
  });

  it('keeps the original topic for normal searches', () => {
    expect(expandResearchQuery('supply chain security')[0]).toBe('supply chain security');
  });

  it('selects academic and document sources for technical research', () => {
    const plan = getTopicResearchPlan('Compare SQL and NoSQL database technology');
    expect(plan.kind).toBe('technical');
    expect(plan.sources).toEqual(expect.arrayContaining(['papers', 'documents', 'wikipedia', 'ai']));
  });
});
