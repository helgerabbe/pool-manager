import { BookOpen } from 'lucide-react';
import PoolzeitStepShell from './PoolzeitStepShell';

/**
 * Schritt 4: Die eigentliche Arbeitsansicht (später das Lerntyp-Dashboard
 * der Einheit). Hier nur Platzhalter. „Weiter" führt zum Abschluss.
 */
export default function StepEinheit({ block, onWeiter, onZurueck }) {
  return (
    <PoolzeitStepShell
      titel={block?.name || 'Deine Einheit'}
      untertitel="Hier öffnet sich später dein persönliches Dashboard für dieses Fach."
      onWeiter={onWeiter}
      onZurueck={onZurueck}
      weiterLabel="Poolzeit beenden"
    >
      <div className="w-full flex flex-col items-center text-center gap-4 py-10">
        <span
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{ backgroundColor: `${block?.farbe || '#64748b'}1a`, color: block?.farbe || '#64748b' }}
        >
          <BookOpen className="w-7 h-7" />
        </span>
        <p className="text-muted-foreground max-w-md">
          An dieser Stelle arbeitest du in deinem Dashboard an der Einheit – je nach deinem Lerntyp.
        </p>
      </div>
    </PoolzeitStepShell>
  );
}