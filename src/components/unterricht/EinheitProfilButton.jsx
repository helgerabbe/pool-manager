import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProfilDialogButton from './ProfilDialogButton';

/** Eigene Einschätzung der Lerngruppe für EINE Unterrichtseinheit; ohne eigene gilt der Standard der Lerngruppe. */
export default function EinheitProfilButton({ unterrichtseinheit, lerngruppenProfil }) {
  const qc = useQueryClient();
  const eigen = !!unterrichtseinheit.profil;
  const speichern = async (profil) => {
    await base44.entities.Unterrichtseinheit.update(unterrichtseinheit.id, { profil });
    qc.invalidateQueries({ queryKey: ['unterrichtseinheiten'] });
  };
  return (
    <ProfilDialogButton
      label={eigen ? 'Lerngruppe (angepasst)' : 'Lerngruppe (Standard)'}
      titel={`Lerngruppe in „${unterrichtseinheit.titel}“`}
      beschreibung={eigen ? 'Für diese Einheit gilt eine eigene Einschätzung.' : 'Bisher gilt der Standard der Lerngruppe. Änderst du hier etwas, gilt es nur für diese Einheit.'}
      profil={unterrichtseinheit.profil}
      standard={lerngruppenProfil}
      eigen={eigen}
      onSpeichern={speichern}
      onZuruecksetzen={() => speichern(null)}
    />
  );
}