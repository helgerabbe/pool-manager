import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, HardHat, CheckCircle2 } from 'lucide-react';
import { useBaumeister } from '@/hooks/useBaumeister';
import { base44 } from '@/api/base44Client';
import { getBaumeisterKontext } from '@/lib/baumeisterKontext';
import BaumeisterKandidaten from './BaumeisterKandidaten';
import BaumeisterVergleich from './BaumeisterVergleich';
import BaumeisterEntscheidung from './BaumeisterEntscheidung';

const LADE_TEXT = {
  suchen: 'Warte kurz, ich schaue mir die Einheit an und suche die Stelle …',
  bauen: 'Ich baue die Änderung — das dauert einen Moment …',
  ausfuehren: 'Ich übernehme die Änderung …',
};

export default function BaumeisterDialog({ open, onOpenChange, einheitId, startHinweis, startRef, onFertig }) {
  const b = useBaumeister(einheitId);
  const [kontext, setKontext] = React.useState(null);
  const [aufKontext, setAufKontext] = React.useState(true);
  const [freigabeOk, setFreigabeOk] = React.useState(false);
  const [ich, setIch] = React.useState(null);
  React.useEffect(() => {
    if (!open) return;
    setKontext(startHinweis ? null : getBaumeisterKontext());
    setAufKontext(true);
    base44.auth.me().then((u) => setIch(u?.email)).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { setFreigabeOk(false); }, [b.vorschlag]);
  const fremdGesperrt = b.stelle?.gesperrt_von && b.stelle.gesperrt_von !== ich ? b.stelle.gesperrt_von : null;
  const losLegen = () => (kontext && aufKontext ? b.direktBauen(kontext.ref, b.hinweis) : b.suchen());
  // Aus einem Prüfbefund geöffnet: bei bekannter Stelle direkt bauen, sonst Hinweis vorbefüllen.
  React.useEffect(() => {
    if (!open || !startHinweis || b.phase !== 'eingabe' || b.hinweis) return;
    if (startRef) b.direktBauen(startRef, startHinweis);
    else b.setHinweis(startHinweis);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (b.phase === 'fertig') onFertig?.();
  }, [b.phase]); // eslint-disable-line react-hooks/exhaustive-deps
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
            {kontext && (
              <label className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm cursor-pointer">
                <input type="checkbox" className="mt-1" checked={aufKontext} onChange={(e) => setAufKontext(e.target.checked)} />
                <span>
                  Du bist gerade bei <b>{kontext.art} „{kontext.titel}"</b>.
                  <span className="block text-xs text-muted-foreground">Was ich jetzt sage, bezieht sich auf diese Aufgabe.</span>
                </span>
              </label>
            )}
            <div className="flex justify-end">
              <Button disabled={!b.hinweis.trim()} onClick={losLegen}>
                {kontext && aufKontext ? 'Änderung bauen' : 'Stelle suchen'}
              </Button>
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
            {fremdGesperrt && (
              <div className="text-sm rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2">
                <b>Achtung:</b> {fremdGesperrt} bearbeitet diese Stelle gerade. Ich kann die Änderung nicht übernehmen, sonst würde die Arbeit überschrieben. Versuch es später noch einmal.
              </div>
            )}
            {!fremdGesperrt && b.stelle?.freigegeben && (
              <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-sm cursor-pointer">
                <input type="checkbox" className="mt-1" checked={freigabeOk} onChange={(e) => setFreigabeOk(e.target.checked)} />
                <span>
                  Diese Aufgabe ist schon freigegeben. Trotzdem bearbeiten?
                  <span className="block text-xs">Die Freigabe bleibt bestehen. Die Aufgabe gilt danach als geändert und muss im Kurs neu gebaut werden.</span>
                </span>
              </label>
            )}
            <BaumeisterEntscheidung
              jaGesperrt={!!fremdGesperrt || (b.stelle?.freigegeben && !freigabeOk)}
              onJa={b.uebernehmen}
              onNein={b.neuStarten}
              onNachbessern={(zusatz) => b.bauen(b.stelle, zusatz)}
            />
          </div>
        )}

        {b.phase === 'fertig' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-chart-3" />
            <p className="text-sm">Erledigt — die Änderung ist übernommen.</p>
            <Button variant="outline" onClick={b.neuStarten}>Weitere Änderung</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}