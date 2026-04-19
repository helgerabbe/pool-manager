import React from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDocContent, DOC_NAV } from '@/lib/docsContent';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function DocViewer() {
  const { slug } = useParams();
  const content = getDocContent(slug);

  const currentIndex = DOC_NAV.findIndex(n => n.slug === slug);
  const prev = currentIndex > 0 ? DOC_NAV[currentIndex - 1] : null;
  const next = currentIndex < DOC_NAV.length - 1 ? DOC_NAV[currentIndex + 1] : null;

  return (
    <div>
      <article className="prose prose-slate max-w-none
        prose-headings:font-semibold prose-headings:text-foreground
        prose-p:text-muted-foreground prose-p:leading-relaxed
        prose-li:text-muted-foreground
        prose-strong:text-foreground
        prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
        prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground
        prose-table:text-sm prose-th:text-foreground prose-td:text-muted-foreground
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>

      {/* Prev / Next Navigation */}
      <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
        {prev ? (
          <Link to={`/docs/${prev.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <div>
              <p className="text-xs text-muted-foreground/60">Zurück</p>
              <p className="font-medium">{prev.label}</p>
            </div>
          </Link>
        ) : <div />}

        {next ? (
          <Link to={`/docs/${next.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group text-right">
            <div>
              <p className="text-xs text-muted-foreground/60">Weiter</p>
              <p className="font-medium">{next.label}</p>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}