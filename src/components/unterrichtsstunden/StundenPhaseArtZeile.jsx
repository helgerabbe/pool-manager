import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { istDigitalerTyp, istBrianTyp } from '@/lib/stundenPhasen';

/**
 * Kopfzeile einer Regieblatt-Phase in der Denkweise der Lehrkraft:
 * ZUERST die Art des Geschehens (Lehrervortrag, Offene Aufgabe,
 * Zuordnungsaufgabe …), danach der Titel der Phase.
 */
export default function StundenPhaseArtZeile({ phase }) {
  const digital = istDigitalerTyp(phase.typ);

  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    staleTime: 10 * 60 * 1000,
    enabled: digital,
  });

  let art = '';
  if (digital) {
    art = katalog.find((k) => k.id === phase.aktivitaet_id)?.name || 'Digitale Aufgabe (noch offen)';
  } else if (istBrianTyp(phase.typ)) {
    art = 'Offene Aufgabe mit KI-Tutor';
  } else {
    art = phase.methode_sozialform || 'Analoge Phase';
  }

  return (
    <span
      className="text-sm min-w-0 truncate"
      title={art + (phase.phasenname ? ` · ${phase.phasenname}` : '')}
    >
      <span className="font-bold">{art}</span>
      {phase.phasenname ? <span> · {phase.phasenname}</span> : null}
    </span>
  );
}