import { Compass, CheckCircle2 } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';

/**
 * Große Kachel, die das Onboarding startet. Wenn der Schüler das Onboarding
 * schon durchlaufen hat, wird die ausgesprochene Empfehlung angezeigt.
 */
export default function OnboardingKachel({ done, empfehlung, onClick }) {
  const empfLerntyp = empfehlung ? getLerntyp(empfehlung) : null;

  return (
    <button
      onClick={onClick}
      className="text-left flex items-start gap-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 hover:bg-primary/10 transition-all w-full"
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary shrink-0">
        <Compass className="w-6 h-6" />
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-foreground">
          {done ? 'Onboarding erneut starten' : 'Welcher Lerntyp bist du?'}
        </h3>
        {done && empfLerntyp ? (
          <p className="mt-1 text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Onboarding abgeschlossen – empfohlen wurde dir{' '}
            <span className="font-semibold" style={{ color: empfLerntyp.farbe }}>
              {empfLerntyp.name}
            </span>
            .
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Lass dir helfen, das passende Dashboard zu finden. Du kannst es jederzeit durchführen.
          </p>
        )}
      </div>
    </button>
  );
}