import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

type WorkActivityProps = {
  title: string;
  messages: string[];
  compact?: boolean;
};

export function WorkActivity({ title, messages, compact = false }: WorkActivityProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
    if (messages.length < 2) return;

    const timer = window.setInterval(() => {
      setMessageIndex(current => (current + 1) % messages.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [messages]);

  const currentMessage = messages[messageIndex] ?? messages[0] ?? 'Working…';

  return (
    <div
      className={`work-activity ${compact ? 'work-activity--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${title}: ${currentMessage}`}
    >
      <div className="work-activity__topline">
        <span className="work-activity__beacon" aria-hidden="true">
          <Activity className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="work-activity__title">{title}</p>
          <p key={currentMessage} className="work-activity__message">{currentMessage}</p>
        </div>
        <span className="work-activity__live">Live</span>
      </div>
      <div className="work-activity__track" aria-hidden="true">
        <span />
      </div>
      {messages.length > 1 && !compact && (
        <div className="work-activity__steps" aria-hidden="true">
          {messages.map((message, index) => (
            <span key={message} className={index === messageIndex ? 'is-active' : ''}>
              <i /> {message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
