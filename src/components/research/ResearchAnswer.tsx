import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function isSafeHttpsUrl(value?: string): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function ResearchAnswer({ content }: { content: string }) {
  return (
    <div className="research-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => isSafeHttpsUrl(href) ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>,
          img: ({ src, alt }) => isSafeHttpsUrl(src) ? <img src={src} alt={alt || 'Research source'} loading="lazy" referrerPolicy="no-referrer" /> : null
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
