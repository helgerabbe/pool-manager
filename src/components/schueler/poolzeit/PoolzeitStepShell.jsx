import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Einheitliche Hülle für jeden Poolzeit-Schritt:
 * großer Titel, optionaler Untertitel, Inhalt, und unten eine
 * Navigationsleiste (Zur Startseite / Zurück / Weiter).
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
  const navigate = useNavigate();
  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full overflow-hidden">
      <div className="text-center pt-5 pb-3 px-5 sm:px-8 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{titel}</h1>
        {untertitel && <p className="text-sm text-muted-foreground mt-1">{untertitel}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 sm:px-8 flex flex-col justify-center min-h-0">
        {children}
      </div>

      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4 shrink-0 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/lernen')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
            Zur Startseite
          </button>
          {zeigeZurueck && (
            <button
              onClick={onZurueck}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>
          )}
        </div>
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