export const ONBOARDING_COMPLETE_KEY = 'queryrecon-onboarding-complete';

export function safeOnboardingNext(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') && value !== '/welcome' ? value : '/dashboard';
}
