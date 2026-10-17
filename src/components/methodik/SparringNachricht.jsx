import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Eine Nachricht im Gesprächsfenster; Assistenten-Vorschläge mit Übernehmen-Knopf. */
export default function SparringNachricht({ m, onUebernehmen }) {
  if (m.role === 'user') return <div className="ml-8 rounded-xl bg-primary/10 p-2 text-sm">{m.content}</div>;
  return (
    <div className="mr-4 space-y-2 rounded-xl bg-muted/50 p-2 text-sm">
      <div className="prose prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div>
      {m.vorschlag && (m.uebernommen
        ? <p className="flex items-center gap-1 text-xs font-medium text-chart-3"><Check className="h-3.5 w-3.5" /> Übernommen</p>
        : <Button size="sm" onClick={onUebernehmen}><Check /> Ja, so ändern</Button>)}
    </div>
  );
}