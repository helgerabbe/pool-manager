import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { BookOpen } from 'lucide-react';
import PoolzeitStepShell from './PoolzeitStepShell';
import EinheitKachel from '@/components/schueler/EinheitKachel';

/**
 * Schritt 4: Der Schüler wählt eine Einheit des geplanten Fachs aus.
 * Es werden alle veröffentlichten Einheiten dieses Fachs als Kacheln
 * gezeigt – ein Klick führt zur Onboarding-/Dashboard-Auswahl der Einheit.
 * „Weiter" führt zum Abschluss der Poolzeit.
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

  const einheiten = alleEinheiten
    .filter(
      (e) =>
        e.fach === block?.name &&
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
    <PoolzeitStepShell
      titel={block?.name || 'Deine Einheit'}
      untertitel="Wähle die Einheit, an der du jetzt arbeiten möchtest."
      onWeiter={onWeiter}
      onZurueck={onZurueck}
      weiterLabel="Poolzeit beenden"
    >
      {isLoading ? (
        <p className="text-muted-foreground py-12 text-center w-full">Einheiten werden geladen …</p>
      ) : einheiten.length === 0 ? (
        <div className="w-full flex flex-col items-center text-center gap-4 py-10">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full py-2">
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
    </PoolzeitStepShell>
  );
}