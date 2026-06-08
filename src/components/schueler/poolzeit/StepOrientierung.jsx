import { NotebookPen } from 'lucide-react';
import PoolzeitStepShell from './PoolzeitStepShell';

/**
 * Schritt 3: Orientierung vor dem Start eines Fach-Blocks.
 * Zeigt das aktuelle Fach + die bisherigen Lerntagebuch-Einträge zu diesem Fach,
 * damit sich der Schüler selbst orientiert (Selbstorganisation).
 * Hier nur Gerüst – die echten Tagebuch-Einträge folgen später.
 */
export default function StepOrientierung({ block, onWeiter, onZurueck }) {
  return (
    <PoolzeitStepShell
      titel={`Bereit für ${block?.name || 'dein Fach'}?`}
      untertitel="Schau kurz nach, wie weit du beim letzten Mal gekommen bist."
      onWeiter={onWeiter}
      onZurueck={onZurueck}
      weiterLabel="Los geht's"
    >
      <div className="w-full flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <NotebookPen className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Deine Notizen zu {block?.name}</span>
          </div>
          <p className="text-sm text-muted-foreground italic">
            Hier erscheinen später deine Lerntagebuch-Einträge zu diesem Fach,
            damit du weißt, wo du weitermachen kannst.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Du springst nicht automatisch an deinen letzten Punkt – orientiere dich selbst und leg dann los.
        </p>
      </div>
    </PoolzeitStepShell>
  );
}