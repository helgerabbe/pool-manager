import React from 'react';
import { Presentation, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { KONZEPTION_BEISPIELE } from '@/lib/konzeptionBeispiele';

/** Fachbeispiele zu einem Stundenmodell: ein Klick auf das Fach öffnet die Beispielstunde im Dialog. */
export default function KonzeptionBeispiel({ modellKey, phasen, modellName }) {
  const beispiele = KONZEPTION_BEISPIELE[modellKey];
  const [offen, setOffen] = React.useState(null);
  if (!beispiele) return null;
  const b = beispiele.find((x) => x.fach === offen);
  return (
    <div className="border-t pt-2">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground">Beispiel:</span>
        {beispiele.map((x) => (
          <button key={x.fach} onClick={() => setOffen(x.fach)} className="rounded-full border px-2 py-0.5 hover:bg-muted">{x.fach}</button>
        ))}
      </div>
      <Dialog open={!!b} onOpenChange={(o) => !o && setOffen(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {b && (
            <>
              <DialogHeader>
                <DialogTitle>{b.fach}: {b.thema}</DialogTitle>
                <DialogDescription>{modellName} · <strong>Idee:</strong> {b.idee}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {b.phasen.map((p, i) => (
                  <div key={i}>
                    <p className="font-semibold text-primary">{i + 1}. {phasen[i]}</p>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border-l-4 border-primary bg-primary/10 p-2">
                        <p className="flex items-center gap-1 text-xs font-semibold text-primary"><Presentation className="h-3 w-3" /> Lehrkraft</p>
                        <p>{p.lehrer}</p>
                      </div>
                      <div className="rounded-md border-l-4 border-accent bg-accent/10 p-2">
                        <p className="flex items-center gap-1 text-xs font-semibold text-accent"><Users className="h-3 w-3" /> Schüler</p>
                        <p>{p.schueler}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}