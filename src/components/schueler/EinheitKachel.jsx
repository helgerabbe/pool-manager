import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';

/**
 * Kachel für eine einzelne Einheit auf der Fachseite. Zeigt Jahrgang/Halbjahr
 * und – falls der Schüler hier schon ein Dashboard gewählt hat – den aktiven
 * Lerntyp. Klick führt zur Onboarding-/Dashboard-Auswahlseite der Einheit.
 */
export default function EinheitKachel({ einheit, fachFarbe, fortschritt, nummer }) {
  const farbe = fachFarbe || '#64748b';
  const lerntyp = fortschritt?.gewaehlter_lerntyp ? getLerntyp(fortschritt.gewaehlter_lerntyp) : null;

  return (
    <Link
      to={`/lernen/einheit?id=${einheit.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{ backgroundColor: `${farbe}1a`, color: farbe }}
        >
          <BookOpen className="w-5 h-5" />
        </span>
        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2.5 py-1">
          {nummer}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-foreground leading-snug">
        {einheit.titel_der_einheit}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {einheit.jahrgangsstufe ? `Klasse ${einheit.jahrgangsstufe}` : 'Einheit'}
      </p>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        {lerntyp ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: lerntyp.farbe }}>
            <CheckCircle2 className="w-4 h-4" />
            {lerntyp.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Noch nicht begonnen</span>
        )}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}