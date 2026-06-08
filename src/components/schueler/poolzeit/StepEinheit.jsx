import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { BookOpen, NotebookPen } from 'lucide-react';
import PoolzeitStepShell from './PoolzeitStepShell';
import EinheitKachel from '@/components/schueler/EinheitKachel';

/**
 * Schritt 3 (zusammengefasst): Orientierung + Einheiten-Auswahl auf EINER Seite.
 *
 * Oben sieht der Schüler kurz seine Notizen/Lerntagebuch-Einträge zum Fach
 * (Selbstorganisation), direkt darunter wählt er die Einheit, an der er
 * arbeiten möchte. So entfällt der zusätzliche Klick zwischen Orientierung
 * und Auswahl. „Weiter" führt zum Abschluss der Poolzeit.
 */
export default function StepEinheit({ block, onWeiter, onZurueck }) {
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

  const phasenLabel = (id) => phasen.find((p) => p.id === id)?.bezeichnung || '';

  // Zum Testen: alle Einheiten dieses Fachs, die mindestens "im Export" sind
  // (final_freigegeben, export_running, published) – nicht nur veröffentlichte.
  const SICHTBARE_STATUS = ['final_freigegeben', 'export_running', 'published'];
  const einheiten = alleEinheiten
    .filter(
      (e) =>
        e.fach === block?.name &&
        SICHTBARE_STATUS.includes(e.export_lifecycle_status) &&
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
    <PoolzeitStepShell
      titel={`Bereit für ${block?.name || 'dein Fach'}?`}
      untertitel="Schau kurz nach, wo du warst – und wähle dann deine Einheit."
      onWeiter={onWeiter}
      onZurueck={onZurueck}
      weiterLabel="Poolzeit beenden"
    >
      <div className="w-full flex flex-col gap-5 py-2">
        {/* Notizen / Lerntagebuch-Orientierung */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <NotebookPen className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Deine Notizen zu {block?.name}</span>
          </div>
          <p className="text-sm text-muted-foreground italic">
            Hier erscheinen später deine Lerntagebuch-Einträge zu diesem Fach,
            damit du weißt, wo du weitermachen kannst.
          </p>
        </div>

        {/* Einheiten-Auswahl */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">
            Wähle die Einheit, an der du jetzt arbeiten möchtest.
          </p>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center w-full">Einheiten werden geladen …</p>
          ) : einheiten.length === 0 ? (
            <div className="w-full flex flex-col items-center text-center gap-4 py-8">
              <span
                className="flex items-center justify-center w-16 h-16 rounded-full"
                style={{ backgroundColor: `${block?.farbe || '#64748b'}1a`, color: block?.farbe || '#64748b' }}
              >
                <BookOpen className="w-7 h-7" />
              </span>
              <p className="text-muted-foreground max-w-md">
                Für dieses Fach gibt es noch keine freigegebenen Einheiten.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {einheiten.map((einheit, idx) => (
                <EinheitKachel
                  key={einheit.id}
                  einheit={einheit}
                  fachFarbe={block?.farbe}
                  fortschritt={fortschrittFor(einheit.id)}
                  nummer={idx + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PoolzeitStepShell>
  );
}