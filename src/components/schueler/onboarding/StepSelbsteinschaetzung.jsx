import { Gauge, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

/**
 * Schritt 2 – Selbsteinschätzung per Schieberegler (0..100, 5er-Schritte).
 * Liest die Fragen aus onboarding_konfiguration.fragenblock. Fällt der
 * Snapshot weg, gibt es eine einzelne allgemeine Frage.
 */
const FALLBACK_FRAGEN = [
  { frage: 'Wie sicher fühlst du dich insgesamt schon bei diesem Thema?', links_label: 'Ganz neu für mich', rechts_label: 'Sehr sicher' },
];

export default function StepSelbsteinschaetzung({ fragenblock, werte, onChange, onWeiter, onZurueck }) {
  const fragen = Array.isArray(fragenblock?.fragen) && fragenblock.fragen.length > 0
    ? fragenblock.fragen
    : FALLBACK_FRAGEN;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3 mb-5">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-50 text-violet-600 shrink-0">
            <Gauge className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {fragenblock?.titel || 'Wie sicher fühlst du dich?'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fragenblock?.intro || 'Schieb den Regler dahin, wo du dich gerade siehst. Es gibt kein richtig oder falsch.'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {fragen.map((f, i) => (
            <div key={i}>
              <p className="text-sm font-medium text-foreground mb-3">
                <span className="text-violet-500 font-bold mr-1.5">{i + 1}.</span>
                {f.frage}
              </p>
              <Slider
                value={[werte[i] ?? 50]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => onChange(i, v[0])}
              />
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>{f.links_label || 'unsicher'}</span>
                <span className="font-medium text-violet-600">{werte[i] ?? 50}%</span>
                <span>{f.rechts_label || 'sicher'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onZurueck} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
        <Button onClick={onWeiter} className="gap-2">
          Weiter
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}