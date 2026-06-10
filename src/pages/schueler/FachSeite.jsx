import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { ArrowLeft, BookOpen } from 'lucide-react';
import EinheitKachel from '@/components/schueler/EinheitKachel';

/**
 * Übersichtsseite für ein einzelnes Unterrichtsfach (Schüleransicht).
 * Zeigt alle veröffentlichten Einheiten dieses Fachs als Kacheln,
 * sortiert nach Jahrgangsstufe und Halbjahr. Klick auf eine Kachel
 * führt zur Onboarding-/Dashboard-Auswahl der Einheit.
 */
export default function FachSeite() {
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('reihenfolge'),
  });
  const { data: phasen = [] } = useQuery({
    queryKey: ['lookupPhasen'],
    queryFn: () => base44.entities.LookupPhasen.list(),
  });
  const { data: alleEinheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });
  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => getCurrentUser(),
    staleTime: 30 * 1000,
  });
  const { data: fortschritte = [] } = useQuery({
    queryKey: ['schuelerFortschritt', user?.email],
    queryFn: () => base44.entities.SchuelerEinheitFortschritt.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });
  const { data: zeitLogs = [] } = useQuery({
    queryKey: ['einheitZeitLogs', user?.email],
    queryFn: () => base44.entities.SchuelerEinheitZeitLog.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });
  const { data: notizen = [] } = useQuery({
    queryKey: ['einheitNotizenAlle', user?.email],
    queryFn: () => base44.entities.SchuelerEinheitNotiz.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const urlParams = new URLSearchParams(window.location.search);
  const fachId = urlParams.get('fach');
  const fach = faecher.find((f) => f.id === fachId);
  const fachName = fach?.name || 'Fach';

  const phasenLabel = (id) => phasen.find((p) => p.id === id)?.bezeichnung || '';

  // Nur veröffentlichte Einheiten dieses Fachs, sortiert nach Jahrgang + Halbjahr.
  const einheiten = alleEinheiten
    .filter(
      (e) =>
        e.fach === fachName &&
        e.export_lifecycle_status === 'published' &&
        e.ist_basismodul !== true
    )
    .sort((a, b) => {
      const ja = parseInt(a.jahrgangsstufe || '0', 10);
      const jb = parseInt(b.jahrgangsstufe || '0', 10);
      if (ja !== jb) return ja - jb;
      return phasenLabel(a.zeit_phase_id).localeCompare(phasenLabel(b.zeit_phase_id), 'de');
    });

  const fortschrittFor = (einheitId) =>
    fortschritte.find((f) => f.einheit_id === einheitId) || null;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <Link
          to="/lernen"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <span
            className="flex items-center justify-center w-14 h-14 rounded-2xl shrink-0"
            style={{ backgroundColor: `${fach?.farbe || '#64748b'}1a`, color: fach?.farbe || '#64748b' }}
          >
            <BookOpen className="w-7 h-7" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{fachName}</h1>
            <p className="text-muted-foreground">Wähle eine Einheit, an der du arbeiten möchtest.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground py-16 text-center">Einheiten werden geladen …</p>
        ) : einheiten.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
            <p className="text-muted-foreground">
              Für dieses Fach gibt es noch keine freigegebenen Einheiten.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {einheiten.map((einheit, idx) => (
              <EinheitKachel
                key={einheit.id}
                einheit={einheit}
                fachFarbe={fach?.farbe}
                fortschritt={fortschrittFor(einheit.id)}
                nummer={idx + 1}
                zeitLogs={zeitLogs.filter((z) => z.einheit_id === einheit.id)}
                notizen={notizen.filter((n) => n.einheit_id === einheit.id)}
                userEmail={user?.email}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}