import { describe, expect, it } from 'vitest';
import { safeOnboardingNext } from './onboarding';

describe('safeOnboardingNext', () => {
  it('keeps local routes and rejects external or recursive destinations', () => {
    expect(safeOnboardingNext('/ai-court?case=new')).toBe('/ai-court?case=new');
    expect(safeOnboardingNext('//example.com')).toBe('/dashboard');
    expect(safeOnboardingNext('https://example.com')).toBe('/dashboard');
    expect(safeOnboardingNext('/welcome')).toBe('/dashboard');
  });
});
