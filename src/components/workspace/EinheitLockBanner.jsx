import { Lock, AlertTriangle } from 'lucide-react';

/**
 * EinheitLockBanner
 * Zeigt einen globalen Hinweis, wenn die Einheit von jemand anderem gesperrt ist
 */
export default function EinheitLockBanner({ isUnitLocked, lockedByEmail }) {
  if (!isUnitLocked || !lockedByEmail) return null;

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
      <Lock className="w-5 h-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">
          🔒 Wird gerade von <strong>{lockedByEmail}</strong> bearbeitet. Sobald der Bearbeitungsmodus beendet ist, wird dieser Bereich automatisch wieder freigegeben – kein Neuladen erforderlich.
        </p>
      </div>
    </div>
  );
}