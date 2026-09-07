import { useState } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

/**
 * KI-Check: Der Schüler gibt seine Antwort ein, ein Sprachmodell prüft sie
 * anhand der (nicht sichtbaren) Kriterien der Lehrkraft und gibt Rückmeldung.
 *
 * WICHTIG: Das ist KEIN Brian-Gespräch. Der KI-Check läuft mit der KI, die im
 * jeweiligen Kontext angebunden ist — hier in der App mit der eigenen KI,
 * im fertigen Kurs mit der KI des Kursbaus (data-mbk-ai-brief).
 */
export default function KICheckPruefung({ aufgabenstellung, kriterien, onBestanden }) {
  const [antwort, setAntwort] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);

  const pruefen = async () => {
    setLaeuft(true);
    setErgebnis(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist eine geduldige, ermutigende Lehrkraft und prüfst die Antwort einer Schülerin oder eines Schülers.

AUFGABE:
${aufgabenstellung || '(keine Aufgabenstellung hinterlegt)'}

BEWERTUNGSKRITERIEN (nicht schülersichtbar, das ist die Messlatte):
${kriterien || 'Fachliche Richtigkeit und Vollständigkeit der Antwort.'}

SCHÜLERANTWORT:
${antwort}

Gib eine kurze, freundliche Rückmeldung in Du-Form (max. 4 Sätze): Was ist gut, was fehlt oder ist falsch, und ein konkreter Hinweis zur Überarbeitung. Nenne keine Note und zitiere die Kriterien nicht wörtlich. Setze "bestanden" nur auf true, wenn die Antwort die Kriterien inhaltlich erfüllt.`,
      response_json_schema: {
        type: 'object',
        properties: {
          bestanden: { type: 'boolean' },
          rueckmeldung: { type: 'string' },
        },
        required: ['bestanden', 'rueckmeldung'],
      },
    });
    setErgebnis(res);
    setLaeuft(false);
    if (res?.bestanden) onBestanden?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Deine Antwort</p>
      </div>
      <Textarea
        value={antwort}
        onChange={(e) => setAntwort(e.target.value)}
        placeholder="Schreibe hier deine Antwort…"
        rows={6}
        className="text-sm"
        disabled={laeuft}
      />

      {ergebnis && (
        <div
          className={
            ergebnis.bestanden
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900'
              : 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'
          }
        >
          <p className="font-semibold mb-1">
            {ergebnis.bestanden ? 'Das passt!' : 'Fast — schau nochmal:'}
          </p>
          <p className="whitespace-pre-wrap">{ergebnis.rueckmeldung}</p>
        </div>
      )}

      <Button onClick={pruefen} disabled={laeuft || !antwort.trim()} className="gap-2 w-full">
        {laeuft
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird geprüft…</>
          : ergebnis
            ? <><RefreshCw className="w-4 h-4" /> Erneut prüfen</>
            : <><Sparkles className="w-4 h-4" /> Antwort prüfen lassen</>}
      </Button>
    </div>
  );
}