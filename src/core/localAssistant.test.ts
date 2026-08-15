import { describe, expect, it } from 'vitest';
import { calculateBasicExpression } from './localAssistant';

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
