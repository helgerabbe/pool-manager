import React from 'react';
import FolieVorschau from './FolieVorschau';
import VorlageRahmen from './vorlagen/VorlageRahmen';
import VorlagenInhalt from './vorlagen/VorlagenInhalt';
import CiStandardBild from './CiStandardBild';

/** Zeigt eine Folie: neue Folien über feste Vorlagen, ältere Folien über die freien Elemente. */
export default function FolieAnzeige({ folie, ansicht = 'lehrer', klein, kopf }) {
  if (!folie.vorlage) return <FolieVorschau elemente={folie[ansicht]} folientyp={folie.folientyp} klein={klein} />;
  return (
    <VorlageRahmen folie={folie} klein={klein} kopf={[kopf?.einheit || 'Name der Einheit', kopf?.thema || 'Thema der Stunde', folie.phase].filter(Boolean).join(' · ')}>
      {folie.vorlage === 'standard'
        ? <div className="flex flex-1 origin-center scale-[1.8] items-center justify-center"><CiStandardBild art={folie.standard} ansicht={ansicht} /></div>
        : <VorlagenInhalt f={folie} />}
    </VorlageRahmen>
  );
}