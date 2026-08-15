import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isValidElement, type ReactNode } from 'react';
import { parseChartSpec } from '../../core/ai/chart';

function isSafeHttpsUrl(value?: string): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function ChartBlock({ source }: { source: string }) {
  const chart = parseChartSpec(source);
  if (!chart) return <pre><code>{source}</code></pre>;
  const max = Math.max(...chart.values, 1);
  return (
    <figure className="my-4 rounded-xl border border-border bg-background/45 p-4" aria-label={chart.title}>
      <figcaption className="mb-4 text-sm font-semibold text-foreground">{chart.title}</figcaption>
      <div className="space-y-3">
        {chart.labels.map((label, index) => (
          <div key={`${label}-${index}`} className="grid grid-cols-[minmax(5rem,0.34fr)_1fr_auto] items-center gap-3 text-xs">
            <span className="truncate text-muted-foreground" title={label}>{label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (chart.values[index] / max) * 100)}%` }} />
            </span>
            <span className="min-w-12 text-right font-mono text-foreground">{chart.values[index]}{chart.unit || ''}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function RichPre({ children }: { children?: ReactNode }) {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children) && children.props.className === 'language-chart') {
    return <ChartBlock source={String(children.props.children || '')} />;
  }
  return <pre>{children}</pre>;
}

export function ResearchAnswer({ content }: { content: string }) {
  return (
    <div className="research-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => isSafeHttpsUrl(href) ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>,
          img: ({ src, alt }) => isSafeHttpsUrl(src) ? <img src={src} alt={alt || 'Research source'} loading="lazy" referrerPolicy="no-referrer" /> : null,
          pre: ({ children }) => <RichPre>{children}</RichPre>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
