import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import CockpitHeaderOverlay from '@/components/schueler/CockpitHeaderOverlay';
import StepGesamtzeit from '@/components/schueler/poolzeit/StepGesamtzeit';
import StepFaecherPlanung from '@/components/schueler/poolzeit/StepFaecherPlanung';
import StepEinheit from '@/components/schueler/poolzeit/StepEinheit';
import StepAbschluss from '@/components/schueler/poolzeit/StepAbschluss';

/**
 * Poolzeit-Flow (Gerüst). Schritt-für-Schritt-Ablauf:
 *  1. gesamtzeit  – wie viel Zeit habe ich heute?
 *  2. planung     – Fächer + Zeit verteilen (Zeitleiste)
 *  3. einheit      – pro Fach-Block: Notizen ansehen + Einheit wählen
 *  4. abschluss    – Reflexion + Notiz fürs nächste Mal
 *
 * Phase 3 wird pro geplantem Fach-Block durchlaufen (blockIndex).
 */
export default function PoolzeitStart() {
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
  const poolzeitFaecher = faecher.filter((f) => f.ist_aktiv !== false && f.ist_poolzeit_fach !== false);

  const [phase, setPhase] = useState('gesamtzeit');
  const [gesamtzeit, setGesamtzeit] = useState(60);
  const [bloecke, setBloecke] = useState([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [reflexion, setReflexion] = useState('');
  const [nachricht, setNachricht] = useState('');

  const aktuellerBlock = bloecke[blockIndex];

  const renderPhase = () => {
  if (phase === 'gesamtzeit') {
    return (
      <StepGesamtzeit
        gesamtzeit={gesamtzeit}
        setGesamtzeit={setGesamtzeit}
        onWeiter={() => setPhase('planung')}
        onZurueck={() => navigate('/lernen')}
      />
    );
  }

  if (phase === 'planung') {
    return (
      <StepFaecherPlanung
        gesamtzeit={gesamtzeit}
        faecher={poolzeitFaecher}
        bloecke={bloecke}
        setBloecke={setBloecke}
        onWeiter={() => {
          setBlockIndex(0);
          setPhase('einheit');
        }}
        onZurueck={() => setPhase('gesamtzeit')}
      />
    );
  }

  if (phase === 'einheit') {
    const istLetzterBlock = blockIndex >= bloecke.length - 1;
    return (
      <StepEinheit
        block={aktuellerBlock}
        onWeiter={() => {
          if (istLetzterBlock) {
            setPhase('abschluss');
          } else {
            setBlockIndex(blockIndex + 1);
            setPhase('einheit');
          }
        }}
        onZurueck={() => (blockIndex === 0 ? setPhase('planung') : setBlockIndex(blockIndex - 1))}
      />
    );
  }

  // abschluss
  return (
    <StepAbschluss
      reflexion={reflexion}
      setReflexion={setReflexion}
      nachricht={nachricht}
      setNachricht={setNachricht}
      onFertig={() => navigate('/lernen')}
      onZurueck={() => setPhase('einheit')}
    />
  );
  };

  return (
    <div className="relative h-full overflow-hidden bg-background">
      <CockpitHeaderOverlay name={user?.full_name} />
      {renderPhase()}
    </div>
  );
}