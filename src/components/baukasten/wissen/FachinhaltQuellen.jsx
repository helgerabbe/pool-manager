import React from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Link2, FileText, Check } from 'lucide-react';

/** Rohmaterial des Fachinhalts, unverändert aufbewahrt. */
export default function FachinhaltQuellen({ quellen, onNeu }) {
  const loeschen = async (id) => { if (window.confirm('Quelle löschen? Bereits eingeordneter Fachinhalt bleibt erhalten.')) { await base44.entities.FachinhaltQuelle.delete(id); onNeu(); } };
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
      <p className="font-semibold">Rohmaterial ({quellen.length})</p>
      {!quellen.length && <p className="text-muted-foreground">Noch nichts abgelegt.</p>}
      {quellen.map((q) => (
        <div key={q.id} className="flex items-start gap-2 rounded-md border p-2">
          {q.art === 'link' ? <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          <div className="min-w-0 flex-1">
            {q.url && <a href={q.url} target="_blank" rel="noreferrer" className="block break-all text-primary hover:underline">{q.url}</a>}
            {q.inhalt && <p className="line-clamp-3 text-muted-foreground" title={q.inhalt}>{q.inhalt}</p>}
            {q.eingeordnet && <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-chart-3"><Check className="h-3 w-3" /> eingeordnet</span>}
          </div>
          <button onClick={() => loeschen(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}