import { BrainCircuit } from 'lucide-react';

export function AIThinkingIndicator({ label, detail = 'Reading context · reasoning · drafting' }: { label: string; detail?: string }) {
  return (
    <div className="ai-thinking" role="status" aria-live="polite">
      <span className="ai-thinking__orb" aria-hidden="true"><BrainCircuit className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{label}</span><span className="mt-0.5 block truncate text-[0.68rem] text-muted-foreground">{detail}</span></span>
      <span className="ai-thinking__signal" aria-hidden="true"><i /><i /><i /><i /></span>
    </div>
  );
}
