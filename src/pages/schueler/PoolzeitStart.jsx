import { Link } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';

/**
 * Hülle: Hier beginnt die eigentliche Poolzeit-Session.
 * Inhalt/Logik folgt später.
 */
export default function PoolzeitStart() {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <Link
          to="/lernen"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Link>

        <div className="flex flex-col items-center text-center gap-4 py-16">
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
            <Play className="w-7 h-7 fill-current" />
          </span>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Hier geht es los mit der Poolzeit</h1>
          <p className="text-muted-foreground max-w-md">Dieser Bereich wird bald mit deiner Lern-Session gefüllt.</p>
        </div>
      </div>
    </div>
  );
}