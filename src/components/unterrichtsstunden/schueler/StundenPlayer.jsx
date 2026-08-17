import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { istDigitalerTyp } from '@/lib/stundenPhasen';
import StundenStartSeite from './StundenStartSeite';
import StundenCodeGate from './StundenCodeGate';
import StundenAnalogSeite from './StundenAnalogSeite';
import StundenDigitalSeite from './StundenDigitalSeite';
import StundenAbschlussSeite from './StundenAbschlussSeite';

/**
 * Digitale Unterrichtsstunde für die Schüler: Startseite → Phase für Phase
 * (jeweils per Code freigeschaltet) → Abschlussseite.
 *
 * Alles wird direkt aus den gespeicherten Phasen-Daten gerendert – es gibt
 * keine Zwischen-Generierung, die Ansicht ist damit immer aktuell.
 *
 * `vorschau=true` (Lehrer-Register „Schüleransicht"): die Code-Sperren werden
 * übersprungen, damit die Lehrkraft frei durchklicken kann.
 */
export default function StundenPlayer({ stunde, phasen, vorschau = false, katalog: katalogProp = null }) {
  const [index, setIndex] = React.useState(-1); // -1 = Startseite, phasen.length = Abschluss
  const [entsperrt, setEntsperrt] = React.useState({});

  // Moodle-Schüler (LTI) übergeben den Katalog fertig als Prop, weil sie kein
  // Base44-Konto haben; im Lehrer-/App-Kontext wird er hier geladen.
  const { data: katalogGeladen = [] } = useQuery({
    queryKey: ['aktivitaetenKatalogAlle'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list('name', 200),
    staleTime: 10 * 60 * 1000,
    enabled: !katalogProp,
  });
  const katalog = katalogProp || katalogGeladen;
  const katById = React.useMemo(
    () => new Map(katalog.map((k) => [k.id, k])),
    [katalog]
  );

  if (index === -1) {
    return (
      <StundenStartSeite
        stunde={stunde}
        anzahlPhasen={phasen.length}
        onStart={() => setIndex(0)}
      />
    );
  }

  if (index >= phasen.length) {
    return (
      <StundenAbschlussSeite
        stunde={stunde}
        onNeustart={() => { setIndex(-1); setEntsperrt({}); }}
      />
    );
  }

  const phase = phasen[index];
  // Haltepunkt: nur Phasen mit AKTIVEM Code verlangen eine Eingabe.
  const brauchtCode =
    !vorschau && !!phase.freischalt_code && !phase.code_deaktiviert && !entsperrt[phase.id];

  if (brauchtCode) {
    return (
      <StundenCodeGate
        phasenname={phase.phasenname}
        code={phase.freischalt_code}
        notfallCode={stunde.notfall_code}
        onEntsperrt={() => setEntsperrt((p) => ({ ...p, [phase.id]: true }))}
        onZurueck={index > 0 ? () => setIndex(index - 1) : null}
      />
    );
  }

  const weiter = () => setIndex(index + 1);
  const zurueck = () => setIndex(index - 1);

  return istDigitalerTyp(phase.typ) ? (
    <StundenDigitalSeite
      key={phase.id}
      phase={phase}
      kat={katById.get(phase.aktivitaet_id)}
      onWeiter={weiter}
      onZurueck={zurueck}
    />
  ) : (
    <StundenAnalogSeite key={phase.id} phase={phase} onWeiter={weiter} onZurueck={zurueck} />
  );
}