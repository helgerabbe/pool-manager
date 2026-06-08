import { BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Schritt 1 – Überblick über die Einheit. Liest den Snapshot aus
 * onboarding_konfiguration.einfuehrung. Fällt dieser weg, zeigt es die
 * Gesamtziele der Einheit als Fallback.
 */
export default function StepUeberblick({ einfuehrung, einheit, onWeiter }) {
  const hatSnapshot = !!einfuehrung;

  return (
    <div className="space-y-5">
      {einfuehrung?.imageUrl && (
        <img
          src={einfuehrung.imageUrl}
          alt=""
          className="w-full max-h-56 object-cover rounded-2xl border border-border"
        />
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <BookOpen className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {hatSnapshot ? einfuehrung.titel : `Worum geht es in „${einheit?.titel_der_einheit}"?`}
            </h2>
            {hatSnapshot && einfuehrung.intro && (
              <p className="mt-1 text-sm text-muted-foreground">{einfuehrung.intro}</p>
            )}
          </div>
        </div>

        {hatSnapshot && Array.isArray(einfuehrung.abschnitte) ? (
          <div className="space-y-4">
            {einfuehrung.abschnitte.map((a, i) => (
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
      </div>

      <div className="flex justify-end">
        <Button onClick={onWeiter} className="gap-2">
          Habe ich verstanden, weiter
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}