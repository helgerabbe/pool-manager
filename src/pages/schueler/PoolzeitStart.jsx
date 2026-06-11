import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as SchuelerData from '@/services/schueler/SchuelerDataService';
import CockpitHeaderOverlay from '@/components/schueler/CockpitHeaderOverlay';
import StepGesamtzeit from '@/components/schueler/poolzeit/StepGesamtzeit';
import StepFaecherPlanung from '@/components/schueler/poolzeit/StepFaecherPlanung';
import StepEinheit from '@/components/schueler/poolzeit/StepEinheit';
import StepWechselNotiz from '@/components/schueler/poolzeit/StepWechselNotiz';
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
    queryFn: () => SchuelerData.getCurrentUser(),
    staleTime: 30 * 1000,
  });

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => SchuelerData.listFaecher(),
  });
  const poolzeitFaecher = faecher.filter((f) => f.ist_aktiv !== false && f.ist_poolzeit_fach !== false);

  const [phase, setPhase] = useState('gesamtzeit');
  const [gesamtzeit, setGesamtzeit] = useState(40);
  const [bloecke, setBloecke] = useState([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [reflexion, setReflexion] = useState('');
  const [nachricht, setNachricht] = useState('');
  const [speichert, setSpeichert] = useState(false);

  // Abschluss-Einträge ins Lerntagebuch speichern, dann zurück zum Cockpit.
  const abschlussSpeichern = async () => {
    const eintraege = [
      reflexion.trim() && { user_email: user?.email, text: reflexion.trim(), typ: 'reflexion' },
      nachricht.trim() && { user_email: user?.email, text: nachricht.trim(), typ: 'nachricht' },
    ].filter(Boolean);
    if (eintraege.length > 0 && user?.email) {
      setSpeichert(true);
      try {
        await SchuelerData.bulkCreateLerntagebuch(eintraege);
      } finally {
        setSpeichert(false);
      }
    }
    navigate('/lernen');
  };

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
            setPhase('wechsel');
          }
        }}
        onZurueck={() => (blockIndex === 0 ? setPhase('planung') : setBlockIndex(blockIndex - 1))}
      />
    );
  }

  if (phase === 'wechsel') {
    // Erinnerung beim Fachwechsel: kurze Zwischennotiz fürs Lerntagebuch (freiwillig).
    return (
      <StepWechselNotiz
        vorherigesFach={bloecke[blockIndex]?.name}
        naechstesFach={bloecke[blockIndex + 1]?.name}
        userEmail={user?.email}
        onWeiter={() => {
          setBlockIndex(blockIndex + 1);
          setPhase('einheit');
        }}
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
      busy={speichert}
      onFertig={abschlussSpeichern}
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