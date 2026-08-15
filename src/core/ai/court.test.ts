import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAICourt } from './court';

describe('runAICourt solo mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses one provider call and returns its answer as the ruling', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Solo analysis' }] } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runAICourt({ question: 'Compare SQL and NoSQL', mode: 'standard', judge: 0, participants: [{ provider: 'gemini', model: 'gemini-test', apiKey: 'test-key' }] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.opinions).toHaveLength(1);
    expect(result.reviews).toHaveLength(0);
    expect(result.verdict.content).toBe('Solo analysis');
  });
});
