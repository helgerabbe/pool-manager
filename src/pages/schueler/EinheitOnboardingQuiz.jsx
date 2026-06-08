import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

/**
 * Platzhalter: Das eigentliche Onboarding-Quiz, das dem Schüler eine
 * Lerntyp-Empfehlung ausspricht. Der Inhalt liegt aktuell noch in den
 * Onboarding-Sektoren der Dashboards und wird im nächsten Schritt
 * ausgelesen und hier dargestellt.
 */
export default function EinheitOnboardingQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const einheitId = urlParams.get('id');

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10">
        <Link
          to={`/lernen/einheit?id=${einheitId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Einheit
        </Link>

        <div className="flex flex-col items-center text-center gap-4 py-16">
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
            <Compass className="w-7 h-7" />
          </span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcher Lerntyp bist du?</h1>
          <p className="text-muted-foreground max-w-md">
            Hier entsteht das Onboarding, das dir am Ende ein passendes Dashboard empfiehlt.
            Diesen Ablauf bauen wir als Nächstes aus.
          </p>
        </div>
      </div>
    </div>
  );
}