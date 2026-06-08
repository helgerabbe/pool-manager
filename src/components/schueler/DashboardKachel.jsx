import { Feather, Target, Flame, Heart, CheckCircle2, Star } from 'lucide-react';

const ICONS = { Feather, Target, Flame, Heart };

/**
 * Kachel für ein Lerntyp-Dashboard in der Einheits-Auswahl.
 * - aktiv: der Schüler arbeitet bereits hier (hervorgehoben).
 * - empfohlen: Onboarding hat diesen Typ empfohlen (Stern-Badge).
 * - gedimmt: ein anderes Dashboard ist aktiv → diese Kachel reduziert.
 */
export default function DashboardKachel({ lerntyp, aktiv, empfohlen, gedimmt, onClick }) {
  const Icon = ICONS[lerntyp.icon] || Feather;

  return (
    <button
      onClick={onClick}
      className={`relative text-left flex flex-col rounded-2xl border-2 p-5 transition-all ${
        aktiv
          ? 'shadow-md'
          : 'border-border bg-card hover:shadow-md hover:border-primary/40'
      } ${gedimmt ? 'opacity-55 hover:opacity-100' : ''}`}
      style={aktiv ? { borderColor: lerntyp.farbe, backgroundColor: `${lerntyp.farbe}0d` } : undefined}
    >
      {empfohlen && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-foreground bg-accent rounded-full px-2 py-0.5">
          <Star className="w-3 h-3" />
          Empfohlen
        </span>
      )}

      <span
        className="flex items-center justify-center w-12 h-12 rounded-xl"
        style={{ backgroundColor: `${lerntyp.farbe}1a`, color: lerntyp.farbe }}
      >
        <Icon className="w-6 h-6" />
      </span>

      <h3 className="mt-4 text-lg font-bold text-foreground">{lerntyp.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{lerntyp.untertitel}</p>

      {aktiv && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: lerntyp.farbe }}>
          <CheckCircle2 className="w-4 h-4" />
          Du arbeitest hier
        </span>
      )}
    </button>
  );
}