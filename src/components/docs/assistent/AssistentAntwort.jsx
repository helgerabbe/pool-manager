/**
 * AssistentAntwort.jsx
 * Darstellung EINER Assistenten-Antwort: Text, konkrete Schritte,
 * optionale Rückfrage und die Kapitel zum Nachlesen.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Sparkles, BookOpen, HelpCircle } from 'lucide-react';

export default function AssistentAntwort({ nachricht }) {
  const { antwort, schritte = [], rueckfrage, quellen = [] } = nachricht;

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="rounded-xl bg-card border border-border px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1">
          <ReactMarkdown>{antwort}</ReactMarkdown>
        </div>

        {schritte.length > 0 && (
          <ol className="rounded-xl bg-muted/50 border border-border px-4 py-3 space-y-1.5 text-sm">
            {schritte.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="flex-1">{s}</span>
              </li>
            ))}
          </ol>
        )}

        {rueckfrage && (
          <div className="flex gap-2 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
            <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span className="font-medium">{rueckfrage}</span>
          </div>
        )}

        {quellen.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Genauer nachlesen:
            </span>
            {quellen.map((q) => (
              <Link
                key={q.slug}
                to={`/docs/${q.slug}`}
                className="text-xs font-medium px-2 py-1 rounded-md border border-border bg-card hover:bg-muted hover:border-primary/40 transition-colors"
              >
                {q.label || q.slug}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}