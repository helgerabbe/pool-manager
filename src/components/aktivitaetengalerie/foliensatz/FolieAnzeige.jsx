import React from 'react';
import FolieVorschau from './FolieVorschau';
import VorlageRahmen from './vorlagen/VorlageRahmen';
import VorlagenInhalt from './vorlagen/VorlagenInhalt';
import TabletInhalt from './vorlagen/TabletInhalt';
import CiStandardBild from './CiStandardBild';
import PartnerTafel from './standard/PartnerTafel';

/** Zeigt eine Folie: neue Folien über feste Vorlagen, ältere Folien über die freien Elemente. */
export default function FolieAnzeige({ folie, ansicht = 'lehrer', klein, kopf }) {
  if (!folie.vorlage) return <FolieVorschau elemente={folie[ansicht]} folientyp={folie.folientyp} klein={klein} />;
  return (
    <VorlageRahmen folie={folie} klein={klein} tablet={ansicht === 'schueler' && folie.vorlage !== 'standard'} kopf={[kopf?.einheit || 'Name der Einheit', kopf?.thema || 'Thema der Stunde', folie.phase].filter(Boolean).join(' · ')}>
      {folie.vorlage === 'standard' && folie.standard === 'partner' && ansicht === 'lehrer'
        ? <PartnerTafel />
        : folie.vorlage === 'standard'
        ? <div className="flex flex-1 origin-center scale-[1.8] items-center justify-center"><CiStandardBild art={folie.standard} ansicht={ansicht} /></div>
        : ansicht === 'schueler' ? <TabletInhalt f={folie} /> : <VorlagenInhalt f={folie} />}
    </VorlageRahmen>
  );
}