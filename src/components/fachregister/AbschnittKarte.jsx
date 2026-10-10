import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pencil, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

/** Ein Abschnitt des Arbeitsplans: Anzeige als Markdown, Bearbeiten per Klick. */
export default function AbschnittKarte({ abschnitt, wert, onChange, bearbeitbar = true }) {
  const [bearbeiten, setBearbeiten] = React.useState(false);
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold">{abschnitt.titel}</h3>
          <p className="text-xs text-muted-foreground">{abschnitt.hinweis}</p>
        </div>
        {bearbeitbar && (
          <button onClick={() => setBearbeiten(!bearbeiten)} className="text-muted-foreground hover:text-primary" aria-label="Bearbeiten">
            {bearbeiten ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        )}
      </div>
      {bearbeiten ? (
        <Textarea value={wert || ''} onChange={(e) => onChange(e.target.value)} rows={14} className="font-mono text-sm" />
      ) : wert ? (
        <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{wert}</ReactMarkdown></div>
      ) : (
        <p className="text-sm italic text-muted-foreground">Noch leer.</p>
      )}
    </section>
  );
}