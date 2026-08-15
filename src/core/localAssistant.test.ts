import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateBasicExpression, runLocalAssistant } from './localAssistant';

describe('calculateBasicExpression', () => {
  it('answers a basic calculation without relying on the model', () => {
    expect(calculateBasicExpression('calculate 7 + 8')).toBe('7 + 8 = 15');
  });

  it('handles division by zero safely', () => {
    expect(calculateBasicExpression('what is 9 / 0?')).toBe('Division by zero is undefined.');
  });

  it('ignores non-mathematical prompts', () => {
    expect(calculateBasicExpression('open research mode')).toBeNull();
  });
});

describe('runLocalAssistant', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests and returns thinking while including recent chat context', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { thinking: 'The previous answer provides the context.', content: 'It refers to SQL.' },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await runLocalAssistant('What does that refer to?', 'http://localhost:11434', 'minicpm5-1b', '/builder', [
      { role: 'user', content: 'Tell me about SQL.' },
      { role: 'assistant', content: 'SQL is used for relational databases.' },
    ]);

    expect(result).toEqual({ content: 'It refers to SQL.', thinking: 'The previous answer provides the context.' });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.think).toBe(true);
    expect(request.messages).toContainEqual({ role: 'assistant', content: 'SQL is used for relational databases.' });
  });
});
