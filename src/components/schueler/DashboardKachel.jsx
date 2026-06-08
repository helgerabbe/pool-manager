import { Feather, Target, Flame, Heart, CheckCircle2, Star } from 'lucide-react';

const ICONS = { Feather, Target, Flame, Heart };

/**
 * Kompakte Kachel für ein Lerntyp-Dashboard in der Einheits-Auswahl.
 * - aktiv: der Schüler arbeitet bereits hier (hervorgehoben).
 * - empfohlen: Onboarding hat diesen Typ empfohlen (Stern-Badge).
 * - gedimmt: ein anderes Dashboard ist aktiv → diese Kachel reduziert.
 */
export default function DashboardKachel({ lerntyp, aktiv, empfohlen, gedimmt, onClick }) {
  const Icon = ICONS[lerntyp.icon] || Feather;

  return (
    <button
      onClick={onClick}
      className={`relative text-left flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
        aktiv
          ? 'shadow-sm'
          : 'border-border bg-card hover:shadow-sm hover:border-primary/40'
      } ${gedimmt ? 'opacity-55 hover:opacity-100' : ''}`}
      style={aktiv ? { borderColor: lerntyp.farbe, backgroundColor: `${lerntyp.farbe}0d` } : undefined}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: `${lerntyp.farbe}1a`, color: lerntyp.farbe }}
      >
        <Icon className="w-5 h-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground truncate">{lerntyp.name}</h3>
          {empfohlen && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent-foreground bg-accent rounded-full px-1.5 py-0.5 shrink-0">
              <Star className="w-2.5 h-2.5" />
              Empfohlen
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{lerntyp.untertitel}</p>
        {aktiv && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: lerntyp.farbe }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Du arbeitest hier
          </span>
        )}
      </div>
    </button>
  );
}