import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Einheitliche Hülle für jeden Poolzeit-Schritt:
 * großer Titel, optionaler Untertitel, Inhalt, und unten eine
 * Navigationsleiste (Zurück / Weiter).
 */
export default function PoolzeitStepShell({
  titel,
  untertitel,
  children,
  onWeiter,
  onZurueck,
  weiterLabel = 'Weiter',
  weiterDisabled = false,
  zeigeZurueck = true,
}) {
  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 sm:px-8 py-10">
      <div className="text-center mb-8 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{titel}</h1>
        {untertitel && <p className="text-muted-foreground mt-2">{untertitel}</p>}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto">
        {children}
      </div>

      <div className="flex items-center justify-between gap-4 pt-8 shrink-0">
        {zeigeZurueck ? (
          <button
            onClick={onZurueck}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onWeiter}
          disabled={weiterDisabled}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {weiterLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}