import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import CockpitHeader from '@/components/schueler/CockpitHeader';
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
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <CockpitHeader name={user?.full_name} />

        <StartButton onClick={() => {}} />

        <SelbstNotizKarte notiz={BEISPIEL_NOTIZ.notiz} datum={BEISPIEL_NOTIZ.datum} />

        <RueckblickLeiste eintraege={BEISPIEL_RUECKBLICK} />

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Deine Fächer
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {poolzeitFaecher.map((fach) => {
              const meta = BEISPIEL_STUFEN[fach.name] || { stufe: 'nicht_gestartet', zuletztVor: null };
              return (
                <FachKachel
                  key={fach.id}
                  fach={fach}
                  stufe={meta.stufe}
                  zuletztVor={meta.zuletztVor}
                  onClick={() => {}}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}