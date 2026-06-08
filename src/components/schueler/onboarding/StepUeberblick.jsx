import { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Schritt 1 – Überblick über die Einheit.
 *
 * Bevorzugt den von der Lehrkraft gespeicherten Snapshot
 * (onboarding_konfiguration.einfuehrung). Existiert KEIN Snapshot, erzeugt
 * eine KI live eine kurze, schülergerechte Einführung (max. ~100 Wörter,
 * einfache Sprache) aus dem gesamten Einheits-Kontext (Beschreibung,
 * Themenfelder, Lernpakete, Lernziele) via generateEinheitEinfuehrung.
 */
export default function StepUeberblick({ einfuehrung, einheit, onWeiter }) {
  const [generiert, setGeneriert] = useState(null);
  const [laedt, setLaedt] = useState(false);

  // Live generieren, wenn kein Snapshot vorliegt.
  useEffect(() => {
    if (einfuehrung || !einheit?.id) return;
    let abbruch = false;
    (async () => {
      setLaedt(true);
      try {
        const res = await base44.functions.invoke('generateEinheitEinfuehrung', { einheitId: einheit.id });
        if (!abbruch && res?.data?.einfuehrung) setGeneriert(res.data.einfuehrung);
      } finally {
        if (!abbruch) setLaedt(false);
      }
    })();
    return () => { abbruch = true; };
  }, [einfuehrung, einheit?.id]);

  const inhalt = einfuehrung || generiert;

  return (
    <div className="space-y-5">
      {inhalt?.imageUrl && (
        <img
          src={inhalt.imageUrl}
          alt=""
          className="w-full max-h-56 object-cover rounded-2xl border border-border"
        />
      )}

      <div className="rounded-2xl border border-border bg-card p-6 min-h-[180px]">
        {laedt ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin mb-3 text-blue-500" />
            <p className="text-sm">Dein Überblick wird vorbereitet …</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {inhalt?.titel || `Worum geht es in „${einheit?.titel_der_einheit}"?`}
                </h2>
                {inhalt?.intro && (
                  <p className="mt-1 text-sm text-muted-foreground">{inhalt.intro}</p>
                )}
              </div>
            </div>

            {inhalt && Array.isArray(inhalt.abschnitte) ? (
              <div className="space-y-3.5">
                {inhalt.abschnitte.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-xl leading-none">{a.emoji || '•'}</span>
                    <div>
                      {a.ueberschrift && <p className="font-semibold text-foreground text-sm">{a.ueberschrift}</p>}
                      <p className="text-sm text-muted-foreground">{a.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {(einheit?.gesamtziele || []).map((ziel, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    {ziel}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onWeiter} disabled={laedt} className="gap-2">
          Habe ich verstanden, weiter
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}