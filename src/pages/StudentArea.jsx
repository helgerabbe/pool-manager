import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import CockpitHeaderOverlay from '@/components/schueler/CockpitHeaderOverlay';
import StartButton from '@/components/schueler/StartButton';
import SelbstNotizKarte from '@/components/schueler/SelbstNotizKarte';
import RueckblickLeiste from '@/components/schueler/RueckblickLeiste';
import FachKachel from '@/components/schueler/FachKachel';
import { deriveFachStufe, zuletztVorLabel } from '@/lib/fortschrittsBadge';

// ─── Beispiel-Daten (nur Bühne – noch keine Speicherung/Logik) ───────────────
const BEISPIEL_NOTIZ = {
  notiz: 'Bei Mathe-Aufgabe 5 weitermachen – die mit den Brüchen!',
  datum: 'letzte Woche Mittwoch',
};
const BEISPIEL_RUECKBLICK = [
  { tag: 'Mo', minuten: 25, fach: 'Deutsch', erledigt: 'Aufgabe 3 & 4 erledigt' },
  { tag: 'Mi', minuten: 40, fach: 'Mathematik', erledigt: 'Themenfeld „Brüche" begonnen' },
  { tag: 'Do', minuten: 20, fach: 'Englisch', erledigt: '' },
];

// Für Schüler sichtbare Einheiten (analog FachSeite): ab finaler Freigabe.
const SICHTBARE_STATUS = ['final_freigegeben', 'export_running', 'published'];

export default function StudentArea() {
  const navigate = useNavigate();
  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => getCurrentUser(),
    staleTime: 30 * 1000,
  });

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('reihenfolge'),
  });
  const { data: alleEinheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
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

  // Nur aktive Poolzeit-Fächer (Lernen und Lerntechniken etc. ausgeschlossen).
  const poolzeitFaecher = faecher.filter(
    (f) => f.ist_aktiv !== false && f.ist_poolzeit_fach !== false
  );

  // Echte Fortschritts-Stufe + letzter Arbeitstag pro Fach.
  const metaFuerFach = (fachName) => {
    const einheitIds = new Set(
      alleEinheiten
        .filter(
          (e) =>
            e.fach === fachName &&
            SICHTBARE_STATUS.includes(e.export_lifecycle_status) &&
            e.ist_basismodul !== true
        )
        .map((e) => e.id)
    );
    const fs = fortschritte.filter((f) => einheitIds.has(f.einheit_id));
    const stufe = deriveFachStufe({
      gesamt: einheitIds.size,
      abgeschlossen: fs.filter((f) => f.abgeschlossen).length,
      begonnen: fs.some((f) => f.gewaehlter_lerntyp),
    });
    const letzterTag = zeitLogs
      .filter((z) => einheitIds.has(z.einheit_id))
      .reduce((max, z) => (z.datum > max ? z.datum : max), '');
    return { stufe, zuletztVor: zuletztVorLabel(letzterTag || null) };
  };

  return (
    // Volle Höhe des Content-Bereichs, KEIN Scrollen: alles passt auf eine
    // iPad-Seite. Inhalte verteilen sich über ein flex-column-Raster.
    <div className="relative h-full overflow-hidden bg-background">
      {/* Verborgener Header: nur ein Dreieck oben mittig, klappt als Overlay aus */}
      <CockpitHeaderOverlay name={user?.full_name} />

      <div className="h-full max-w-5xl mx-auto px-5 sm:px-8 pt-8 pb-5 flex flex-col gap-4 min-h-0">
        {/* Startknopf + Selbst-Notiz nebeneinander (spart vertikalen Platz) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
          <StartButton onClick={() => navigate('/lernen/poolzeit')} />
          <SelbstNotizKarte
            notiz={BEISPIEL_NOTIZ.notiz}
            datum={BEISPIEL_NOTIZ.datum}
            onClick={() => navigate('/lernen/lerntagebuch')}
          />
        </div>

        {/* Fächer-Übersicht – nimmt den verbleibenden Platz, scrollt intern
            nur falls extrem viele Fächer (Normalfall: passt ohne Scroll). */}
        <div className="flex flex-col min-h-0 flex-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 shrink-0">
            Deine Fächer
          </h2>
          <div className="grid grid-cols-3 gap-3 min-h-0 flex-1 content-start overflow-y-auto">
            {poolzeitFaecher.map((fach) => {
              const meta = metaFuerFach(fach.name);
              return (
                <FachKachel
                  key={fach.id}
                  fach={fach}
                  stufe={meta.stufe}
                  zuletztVor={meta.zuletztVor}
                  onClick={() => navigate(`/lernen/fach?fach=${fach.id}`)}
                />
              );
            })}
          </div>
        </div>

        {/* Rückblick als ruhiger Abschluss-Streifen unten */}
        <div className="shrink-0">
          <RueckblickLeiste eintraege={BEISPIEL_RUECKBLICK} />
        </div>
      </div>
    </div>
  );
}