import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, HardHat, CheckCircle2 } from 'lucide-react';
import { useBaumeister } from '@/hooks/useBaumeister';
import BaumeisterKandidaten from './BaumeisterKandidaten';
import BaumeisterVergleich from './BaumeisterVergleich';
import BaumeisterEntscheidung from './BaumeisterEntscheidung';

const LADE_TEXT = {
  suchen: 'Warte kurz, ich schaue mir die Einheit an und suche die Stelle …',
  bauen: 'Ich baue die Änderung — das dauert einen Moment …',
  ausfuehren: 'Ich übernehme die Änderung …',
};

export default function BaumeisterDialog({ open, onOpenChange, einheitId }) {
  const b = useBaumeister(einheitId);
  const schliessen = (v) => { if (!v) b.neuStarten(); onOpenChange(v); };

  return (
    <Dialog open={open} onOpenChange={schliessen}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><HardHat className="w-5 h-5" /> Baumeister</DialogTitle>
        </DialogHeader>

        {b.fehler && <div className="text-xs rounded-md bg-destructive/10 text-destructive px-3 py-2">{b.fehler}</div>}

        {b.phase === 'eingabe' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Beschreib in eigenen Worten, was an welcher Aufgabe geändert werden soll.</p>
            <Textarea
              value={b.hinweis}
              onChange={(e) => b.setHinweis(e.target.value)}
              placeholder="z. B. In der Aufgabe zu Pauls innerer Entwicklung passt in Lücke 1 das Wort nicht …"
              className="min-h-[110px]"
            />
            <div className="flex justify-end">
              <Button disabled={!b.hinweis.trim()} onClick={b.suchen}>Stelle suchen</Button>
            </div>
          </div>
        )}

        {LADE_TEXT[b.phase] && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" /> {LADE_TEXT[b.phase]}
          </div>
        )}

        {b.phase === 'auswahl' && (
          <div className="overflow-y-auto">
            <BaumeisterKandidaten ergebnis={b.suche} onWaehlen={(k) => b.bauen(k)} onZurueck={() => b.setPhase('eingabe')} />
          </div>
        )}

        {b.phase === 'vergleich' && b.vorschlag && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="text-xs text-muted-foreground">{b.stelle?.ort} · <span className="font-semibold">{b.stelle?.titel}</span></div>
            <BaumeisterVergleich
              art={b.stelle?.art}
              alt={b.vorschlag.alt}
              neu={b.vorschlag.neu}
              aenderung={b.vorschlag.aenderung}
              formSchema={b.vorschlag.form_schema || []}
            />
            <BaumeisterEntscheidung
              onJa={b.uebernehmen}
              onNein={b.neuStarten}
              onNachbessern={(zusatz) => b.bauen(b.stelle, zusatz)}
            />
          </div>
        )}

        {b.phase === 'fertig' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-chart-3" />
            <p className="text-sm">Erledigt — die Änderung ist übernommen und im Import-Center protokolliert.</p>
            <Button variant="outline" onClick={b.neuStarten}>Weitere Änderung</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}