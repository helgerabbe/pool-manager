import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileSearch } from 'lucide-react';

/**
 * Die allgemeinen Aufgaben einer Einheit im Lesezugang — bei Sequenzaufgaben mit
 * ihrer Schrittfolge samt Schritt-IDs. Genau diese IDs braucht ein schrittgenauer
 * Auftrag; die Nutzdaten eines Schritts werden bewusst einzeln angefordert.
 */
export default function AllgemeineAufgabenLeser({ aufgaben = [], onSchrittDetail, IdChip }) {
  if (aufgaben.length === 0) {
    return <p className="text-sm text-muted-foreground">Diese Einheit hat noch keine allgemeinen Aufgaben.</p>;
  }

  return (
    <div className="space-y-3">
      {aufgaben.map((a) => (
        <div key={a.aufgabe_id} className="rounded-lg border border-border p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{a.modus === 'sequenz' ? 'Sequenz' : 'Einzelaufgabe'}</Badge>
            <span className="font-semibold text-foreground">{a.titel}</span>
            {a.themenfeld && (
              <span className="text-xs text-muted-foreground">Themenfeld: {a.themenfeld}</span>
            )}
            <Badge variant="outline" className="text-[11px]">
              {a.vollstaendig ? 'vollständig' : 'unvollständig'}
            </Badge>
            <IdChip id={a.aufgabe_id} />
          </div>

          {a.modus !== 'sequenz' ? (
            <p className="pl-2 text-xs text-muted-foreground">
              Nicht als Sequenz angelegt — das Import-Center bearbeitet in v1 nur Sequenzaufgaben.
            </p>
          ) : a.schritte.length === 0 ? (
            <p className="pl-2 text-xs text-muted-foreground">Noch keine Schritte.</p>
          ) : (
            <ul className="space-y-1 pl-2">
              {a.schritte.map((s) => (
                <li key={s.schritt_id || s.position} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{s.position + 1}.</span>
                  <Badge variant="outline" className="text-[11px]">{s.typ}</Badge>
                  <span className="text-foreground">{s.titel || s.aufgabenart || '—'}</span>
                  {s.schritt_id && <IdChip id={s.schritt_id} />}
                  {s.schritt_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs"
                      onClick={() => onSchrittDetail(s.schritt_id)}
                    >
                      <FileSearch className="h-3 w-3" /> Inhalte holen
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}