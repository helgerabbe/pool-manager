import { useState } from 'react';
import { Copy, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { brianTutorPrompt, sichtbarerTeil } from '@/lib/brianTutorPrompt';

/**
 * Kopierfeld für die Brian-Anweisung: zeigt den schülersichtbaren Teil und
 * kopiert beim Klick den vollständigen Text (inkl. der Hinweise für Brian).
 */
export default function BrianAnweisungKopieren({ aufgabe, erwartungshorizont = '' }) {
  const [kopiert, setKopiert] = useState(false);

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(brianTutorPrompt(aufgabe, erwartungshorizont));
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch { /* Zwischenablage nicht verfügbar */ }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-foreground">Diese Anweisung kopierst du in Brian</p>
        <Button size="sm" onClick={kopieren} className="gap-2 shrink-0">
          {kopiert
            ? <><Check className="w-4 h-4" /> Kopiert!</>
            : <><Copy className="w-4 h-4" /> Anweisung kopieren</>}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/60 rounded-lg p-3 max-h-52 overflow-y-auto font-inter">
        {sichtbarerTeil(aufgabe)}
      </pre>
      {String(erwartungshorizont || '').trim() && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Der kopierte Text enthält außerdem Hinweise deiner Lehrkraft für Brian – die musst du nicht lesen.
        </p>
      )}
    </div>
  );
}