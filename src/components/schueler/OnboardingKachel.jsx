import { Compass, CheckCircle2, HelpCircle } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';

/**
 * Kompakte Kachel, die das Onboarding startet. Darunter steht IMMER ein
 * Ergebnisfeld: entweder die ausgesprochene Dashboard-Empfehlung oder der
 * Hinweis, dass noch keine Diagnose durchgeführt wurde.
 */
export default function OnboardingKachel({ done, empfehlung, onClick }) {
  const empfLerntyp = empfehlung ? getLerntyp(empfehlung) : null;

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <button onClick={onClick} className="text-left flex items-center gap-3 w-full group">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 text-primary shrink-0">
          <Compass className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {done ? 'Diagnose erneut durchführen' : 'Welcher Lerntyp bist du?'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Lass dir helfen, das passende Dashboard zu finden.
          </p>
        </div>
      </button>

      {/* Ergebnisfeld – immer sichtbar */}
      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2">
        {empfLerntyp ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-foreground">
              Empfehlung für dein Dashboard:{' '}
              <span className="font-bold" style={{ color: empfLerntyp.farbe }}>
                {empfLerntyp.name}
              </span>
            </p>
          </>
        ) : (
          <>
            <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Es wurde noch keine Diagnose durchgeführt.
            </p>
          </>
        )}
      </div>
    </div>
  );
}