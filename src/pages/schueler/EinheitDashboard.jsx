import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';

/**
 * Platzhalter: Das eigentliche Lerntyp-Dashboard der Einheit. Hier wird
 * später der Lernpfad (lernpfade_konfiguration[lerntyp]) als Schüleransicht
 * gerendert. Vorerst nur ein Gerüst mit Einheits- und Lerntyp-Bezug.
 */
export default function EinheitDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const einheitId = urlParams.get('id');
  const lerntypKey = urlParams.get('lerntyp');
  const lerntyp = getLerntyp(lerntypKey);

  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        <Link
          to={`/lernen/einheit?id=${einheitId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Einheit
        </Link>

        <div className="flex flex-col items-center text-center gap-4 py-16">
          <span
            className="flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              backgroundColor: `${lerntyp?.farbe || '#64748b'}1a`,
              color: lerntyp?.farbe || '#64748b',
            }}
          >
            <LayoutDashboard className="w-7 h-7" />
          </span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {einheit?.titel_der_einheit || 'Dashboard'}
          </h1>
          {lerntyp && (
            <p className="text-sm font-semibold" style={{ color: lerntyp.farbe }}>
              Dashboard: {lerntyp.name}
            </p>
          )}
          <p className="text-muted-foreground max-w-md">
            Hier erscheint dein persönlicher Lernpfad für diese Einheit. Diese Ansicht bauen wir
            als Nächstes aus.
          </p>
        </div>
      </div>
    </div>
  );
}