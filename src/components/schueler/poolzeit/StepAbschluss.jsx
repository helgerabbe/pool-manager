import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import PoolzeitStepShell from './PoolzeitStepShell';

/**
 * Abschluss / Reflexion am Ende der Poolzeit: Rückblick + Nachricht ans
 * nächste Mal. Beides wird ins Lerntagebuch gespeichert (macht der Parent
 * in onFertig). Beide Felder mit Spracheingabe.
 * Wichtig: Die App merkt sich NICHT automatisch den Fortschritt –
 * das macht der Schüler selbst (Selbstorganisation).
 */
export default function StepAbschluss({ reflexion, setReflexion, nachricht, setNachricht, onFertig, onZurueck, busy = false }) {
  return (
    <PoolzeitStepShell
      titel="Wie lief deine Poolzeit?"
      untertitel="Nimm dir 3 Minuten: Was war schwierig? Wo machst du nächstes Mal weiter?"
      onWeiter={onFertig}
      onZurueck={onZurueck}
      weiterLabel={busy ? 'Wird gespeichert …' : 'Fertig'}
      weiterDisabled={busy}
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
          <div className="mt-1.5">
            <SpeechInputButton value={reflexion} onResult={setReflexion} maxSeconds={60} label="Aufsprechen" />
          </div>
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
          <div className="mt-1.5">
            <SpeechInputButton value={nachricht} onResult={setNachricht} maxSeconds={60} label="Aufsprechen" />
          </div>
        </div>
      </div>
    </PoolzeitStepShell>
  );
}