import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';

const PHASE_LABEL = { Input: 'Erklärung', 'Übung': 'Übung', Abschluss: 'Abschluss' };

/**
 * Blanko-Einzelseite EINER Lernpaket-Aktivität. Zeigt einen Platzhalter
 * (echter interaktiver Inhalt folgt später) und unten den „Erledigt"-Button,
 * der die Aktivität abschließt und zur Lernpaket-Inhaltsseite zurückführt.
 */
export default function LernpaketAktivitaetSeite({ aktivitaet, kat, lernpaketTitel, busy, onErledigt, onBack }) {
  const Icon = getSystemBausteinIcon('file-text');
  const name = kat?.name || 'Aktivität';
  const phase = PHASE_LABEL[aktivitaet.phase] || aktivitaet.phase;

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Kopf */}
      <div className="flex items-center gap-3 mb-1">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{phase} · {lernpaketTitel}</p>
          <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{name}</h1>
        </div>
      </div>
      <button
        onClick={onBack}
        className="self-start inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zum Lernpaket
      </button>

      {/* Platzhalter-Inhalt */}
      <div className="flex-1 min-h-0 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-center p-6">
        <p className="text-sm text-muted-foreground max-w-md">
          Hier erscheint: {name}
        </p>
      </div>

      {/* Aktion */}
      <div className="pt-5 shrink-0">
        <Button
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Erledigt
        </Button>
      </div>
    </div>
  );
}