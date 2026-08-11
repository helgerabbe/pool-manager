import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Darstellung des Kompaktwissen-Textes. Der Text wird als Markdown
 * geschrieben (Überschriften, Listen, fett) und hier strukturiert
 * ausgegeben – damit ein echter Wissensspeicher lesbar ist.
 */
export default function KompaktwissenText({ text = '', className = '' }) {
  return (
    <div className={`text-sm leading-relaxed text-foreground space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="text-base font-bold mt-4 first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-bold mt-4 first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-bold mt-3 first:mt-0">{children}</h4>,
          h4: ({ children }) => <h4 className="text-sm font-semibold mt-3 first:mt-0">{children}</h4>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-amber-300 bg-amber-50/60 rounded-r-lg px-3 py-2">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto"><table className="w-full text-xs border-collapse">{children}</table></div>
          ),
          th: ({ children }) => <th className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
          hr: () => <hr className="border-border" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}