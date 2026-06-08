import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import PoolzeitStepShell from './PoolzeitStepShell';

/**
 * Schritt 5: Abschluss / Reflexion. Der Schüler kann sich eine Notiz fürs
 * Lerntagebuch und eine Nachricht fürs nächste Mal hinterlassen.
 * Wichtig: Die App merkt sich NICHT automatisch den Fortschritt –
 * das macht der Schüler selbst (Selbstorganisation).
 * Hier nur Gerüst – das Speichern folgt später.
 */
export default function StepAbschluss({ reflexion, setReflexion, nachricht, setNachricht, onFertig, onZurueck }) {
  return (
    <PoolzeitStepShell
      titel="Wie lief deine Poolzeit?"
      untertitel="Nimm dir kurz Zeit, um zurückzublicken."
      onWeiter={onFertig}
      onZurueck={onZurueck}
      weiterLabel="Fertig"
    >
      <div className="w-full flex flex-col gap-5">
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Ich merke mir <strong>nicht</strong> automatisch, wie weit du gekommen bist. Wenn du das
            wissen willst, schreib es dir hier selbst auf.
          </span>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            Was lief gut, was nicht so gut?
          </label>
          <Textarea
            value={reflexion}
            onChange={(e) => setReflexion(e.target.value)}
            placeholder="Heute habe ich …"
            className="h-24"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            Nachricht an dich fürs nächste Mal
          </label>
          <Textarea
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
            placeholder="Beim nächsten Mal weitermachen bei …"
            className="h-20"
          />
        </div>
      </div>
    </PoolzeitStepShell>
  );
}