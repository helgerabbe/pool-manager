import { WifiOff, RotateCcw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Fallback-Anzeige für die Schüleransicht, wenn Daten aus der Datenbank
 * nicht vollständig geladen werden konnten. Bietet einen
 * „Nochmal versuchen"-Button, der die fehlgeschlagenen Abfragen neu startet.
 */
export default function LadeFehlerHinweis({ onRetry }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4 rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-amber-600" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Das Laden hat nicht geklappt</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Es gibt gerade Verbindungsschwierigkeiten. Deine Daten konnten nicht
            vollständig geladen werden.
          </p>
        </div>
        <Button onClick={handleRetry} disabled={retrying} className="gap-2">
          {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Nochmal versuchen
        </Button>
      </div>
    </div>
  );
}