import { useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/** Fünf Verständnis-Stufen für den kleinen Selbsteinschätzungs-Schieberegler. */
const STUFEN = [
  { emoji: '😟', label: 'Noch gar nicht verstanden' },
  { emoji: '🙂', label: 'Ein bisschen verstanden' },
  { emoji: '😊', label: 'Schon ganz gut verstanden' },
  { emoji: '😃', label: 'Das meiste verstanden' },
  { emoji: '🤩', label: 'Super verstanden!' },
];

/**
 * Schüler-Aktivität „Bearbeitung bestätigen" – der Abschluss eines Lernpakets.
 *
 * Einheitliches Layout wie die übrigen Schüler-Aktivitäten:
 *  - kein Header (Phase/Titel kommt aus der Navigation),
 *  - blauer Aufgabenstellungs-Anker oben + kurzer Erklärtext,
 *  - ein kleines Gimmick: 5-stufiger Verständnis-Schieberegler (rein für das
 *    Gefühl einer aktiven Handlung; hat keine fachliche Auswirkung),
 *  - unten genau zwei Buttons: links „Zurück zum Lernpaket", rechts „Bestätigen".
 */
export default function BearbeitungBestaetigenSeite({ busy, onErledigt, onBack }) {
  const [stufe, setStufe] = useState(2); // Start in der Mitte
  const aktuell = STUFEN[stufe];

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Aufgabenstellung – einheitlicher blauer Anker. */}
      <AufgabenstellungBox className="mb-4 shrink-0">
        Bestätige, dass du diese Übungen durchgearbeitet hast.
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-6 pb-2">
          {/* Kurzer, motivierender Erklärtext */}
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
              <PartyPopper className="w-5 h-5" />
            </span>
            <p className="text-sm text-foreground leading-relaxed">
              Stark – du hast dieses Lernpaket bis zum Ende durchgearbeitet! Wir hoffen,
              dass es dir geholfen hat und du die Inhalte gut verstehen konntest. Du kannst
              jetzt bestätigen, dass du alles bearbeitet hast. Und keine Sorge: Du kannst
              jederzeit hierher zurückkommen und dir die Übungen noch einmal anschauen.
            </p>
          </div>

          {/* Gimmick: Verständnis-Selbsteinschätzung */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground mb-1">
              Wie gut hast du die Inhalte verstanden?
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              Schätze dich kurz selbst ein – das ist nur für dich.
            </p>

            <div className="text-center mb-5">
              <div className="text-4xl mb-1">{aktuell.emoji}</div>
              <div className="text-sm font-medium text-primary">{aktuell.label}</div>
            </div>

            <Slider
              value={[stufe]}
              onValueChange={(v) => setStufe(v[0])}
              min={0}
              max={STUFEN.length - 1}
              step={1}
            />

            <div className="flex justify-between mt-2 px-0.5">
              {STUFEN.map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-base transition-opacity',
                    i === stufe ? 'opacity-100' : 'opacity-40'
                  )}
                >
                  {s.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen: links zurück, rechts grün */}
      <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Bestätigen
        </Button>
      </div>
    </div>
  );
}