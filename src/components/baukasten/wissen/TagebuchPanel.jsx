import React from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';
import TagebuchEintragen from './TagebuchEintragen';

/** Einheit bisher: was tatsächlich im Unterricht passiert ist. */
export default function TagebuchPanel({ einheit, tagebuch, onNeu }) {
  const loeschen = async (id) => { if (window.confirm('Eintrag löschen?')) { await base44.entities.UnterrichtsTagebuch.delete(id); onNeu(); } };
  return (
    <div className="space-y-4 text-sm">
      <p className="font-semibold">{tagebuch.length} gehaltene Stunde{tagebuch.length === 1 ? '' : 'n'} festgehalten</p>
      <TagebuchEintragen einheit={einheit} onFertig={onNeu} />
      {tagebuch.map((t) => (
        <div key={t.id} className="space-y-1 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{t.datum && new Date(t.datum).toLocaleDateString('de-DE')} · {t.titel}</p>
            <button onClick={() => loeschen(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
          {t.inhalt && <p><span className="font-semibold">Gemacht: </span>{t.inhalt}</p>}
          {t.ergebnis && <p><span className="font-semibold">Verlauf: </span>{t.ergebnis}</p>}
          {t.besonderheiten && <p><span className="font-semibold">Offen: </span>{t.besonderheiten}</p>}
        </div>
      ))}
    </div>
  );
}