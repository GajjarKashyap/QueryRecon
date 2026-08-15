import { useEffect, useRef } from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';
import type { LocalAssistantMessage } from '../../store/localAssistantStore';
import { ResearchAnswer } from '../research/ResearchAnswer';
import { AIThinkingIndicator } from './AIThinkingIndicator';

interface AssistantMessagesProps {
  messages: LocalAssistantMessage[];
  busy: boolean;
  busyLabel: string;
  quickActions?: string[];
  onQuickAction?: (action: string) => void;
}

export function AssistantMessages({ messages, busy, busyLabel, quickActions = [], onQuickAction }: AssistantMessagesProps) {
  const scrollAnchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, busy]);

  return (
    <div className="space-y-4" aria-live="polite">
      {messages.map(message => (
        <article key={message.id} className={`flex max-w-[92%] gap-2.5 ${message.role === 'user' ? 'ml-auto flex-row-reverse' : 'ai-message-enter'}`}>
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[0.6rem] font-bold ${message.role === 'user' ? 'bg-foreground/10 text-foreground' : 'bg-primary/10 text-primary'}`}>
            {message.role === 'user' ? 'YOU' : <Sparkles className="h-3 w-3" />}
          </span>
          <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-tr-md bg-primary text-primary-foreground' : 'rounded-tl-md border border-border/70 bg-background/80 text-foreground'}`}>
            {message.thinking && (
              <details className="group mb-2 rounded-xl border border-primary/15 bg-primary/5 text-xs text-muted-foreground">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-foreground marker:content-none">
                  <BrainCircuit className="ai-thinking-icon h-3.5 w-3.5 text-primary" />
                  Thinking
                  <span className="ml-auto text-[0.6rem] uppercase tracking-wider group-open:hidden">Show</span>
                  <span className="ml-auto hidden text-[0.6rem] uppercase tracking-wider group-open:inline">Hide</span>
                </summary>
                <div className="max-h-52 overflow-y-auto whitespace-pre-wrap border-t border-primary/10 px-3 py-2 font-mono text-[0.7rem] leading-5">{message.thinking}</div>
              </details>
            )}
            {message.role === 'assistant' ? <ResearchAnswer content={message.content} /> : <p className="whitespace-pre-wrap text-pretty">{message.content}</p>}
            <time className={`mt-1 block text-[0.6rem] tabular-nums ${message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
        </article>
      ))}
      {messages.length === 1 && quickActions.length > 0 && (
        <div className="grid gap-2 pt-1">
          {quickActions.map(action => (
            <button key={action} type="button" onClick={() => onQuickAction?.(action)} className="rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              {action}
            </button>
          ))}
        </div>
      )}
      {busy && (
        <AIThinkingIndicator label={busyLabel} />
      )}
      <div ref={scrollAnchor} />
    </div>
  );
}
