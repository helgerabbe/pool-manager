import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Pencil, Link2, FileText, Check } from 'lucide-react';

/** Eine eingegebene Information: anzeigen, bearbeiten, löschen. */
export default function QuelleZeile({ q, onNeu }) {
  const [edit, setEdit] = React.useState(null);
  const speichern = async () => { await base44.entities.FachinhaltQuelle.update(q.id, { inhalt: edit, eingeordnet: false }); setEdit(null); onNeu(); };
  const loeschen = async () => { if (window.confirm('Eintrag löschen? Bereits eingeordneter Fachinhalt bleibt erhalten.')) { await base44.entities.FachinhaltQuelle.delete(q.id); onNeu(); } };
  return (
    <div className="flex items-start gap-2 rounded-md border p-3">
      {q.art === 'link' ? <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[11px] text-muted-foreground">{new Date(q.created_date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
          {q.eingeordnet && <span className="ml-2 inline-flex items-center gap-1 text-chart-3"><Check className="h-3 w-3" /> eingeordnet</span>}</p>
        {q.url && <a href={q.url} target="_blank" rel="noreferrer" className="block break-all text-primary hover:underline">{q.url}</a>}
        {edit != null ? (
          <div className="space-y-2">
            <Textarea rows={5} value={edit} onChange={(e) => setEdit(e.target.value)} />
            <div className="flex gap-2"><Button size="sm" onClick={speichern}>Speichern</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Abbrechen</Button></div>
          </div>
        ) : q.inhalt && <p className="whitespace-pre-line">{q.inhalt}</p>}
      </div>
      {edit == null && <button onClick={() => setEdit(q.inhalt || '')} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>}
      <button onClick={loeschen} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}