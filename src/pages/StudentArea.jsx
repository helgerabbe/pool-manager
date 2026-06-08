import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import CockpitHeaderOverlay from '@/components/schueler/CockpitHeaderOverlay';
import StartButton from '@/components/schueler/StartButton';
import SelbstNotizKarte from '@/components/schueler/SelbstNotizKarte';
import RueckblickLeiste from '@/components/schueler/RueckblickLeiste';
import FachKachel from '@/components/schueler/FachKachel';

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
// Grobe Beispiel-Zuordnung von Fortschritts-Stufen pro Fach-Name.
const BEISPIEL_STUFEN = {
  Deutsch: { stufe: 'mittendrin', zuletztVor: 'vor 2 Tagen' },
  Mathematik: { stufe: 'fast_geschafft', zuletztVor: 'vor 5 Tagen' },
  Englisch: { stufe: 'angefangen', zuletztVor: 'vor 3 Wochen' },
};

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

  // Nur aktive Poolzeit-Fächer (Lernen und Lerntechniken etc. ausgeschlossen).
  const poolzeitFaecher = faecher.filter(
    (f) => f.ist_aktiv !== false && f.ist_poolzeit_fach !== false
  );

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
              const meta = BEISPIEL_STUFEN[fach.name] || { stufe: 'nicht_gestartet', zuletztVor: null };
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