import React from 'react';
import FolieVorschau from './FolieVorschau';
import VorlageRahmen from './vorlagen/VorlageRahmen';
import VorlagenInhalt from './vorlagen/VorlagenInhalt';
import TabletInhalt from './vorlagen/TabletInhalt';
import CiStandardBild from './CiStandardBild';
import PartnerTafel from './standard/PartnerTafel';
import { ANKUENDIGUNG_BEISPIEL } from './standard/AnkuendigungBild';

// Diese Standardfolien bringen schon eine ganze Tafel mit; vergrößert würden sie abgeschnitten.
const VOLLBILD = ['lueckentext', 'bildbeschriftung', 'multiple_choice', 'richtig_falsch', 'reihenfolge', 'zuordnen', 'arbeitsphase_analog', 'einzelphase', 'partnerphase'];

/** Zeigt eine Folie: neue Folien über feste Vorlagen, ältere Folien über die freien Elemente. */
export default function FolieAnzeige({ folie, ansicht = 'lehrer', klein, kopf }) {
  if (!folie.vorlage) return <FolieVorschau elemente={folie[ansicht]} folientyp={folie.folientyp} klein={klein} />;
  return (
    <VorlageRahmen folie={folie} klein={klein} tablet={ansicht === 'schueler' && folie.vorlage !== 'standard'} kopf={[kopf?.einheit || 'Name der Einheit', kopf?.thema || 'Thema der Stunde', folie.phase].filter(Boolean).join(' · ')}>
      {folie.vorlage === 'standard' && folie.standard === 'partner' && ansicht === 'lehrer'
        ? <PartnerTafel />
        : folie.vorlage === 'standard' && folie.standard === 'ankuendigung'
        ? <VorlagenInhalt f={{ ...ANKUENDIGUNG_BEISPIEL, titel: folie.titel || ANKUENDIGUNG_BEISPIEL.titel, satz: folie.satz || folie.text || ANKUENDIGUNG_BEISPIEL.satz, bild: folie.bild || ANKUENDIGUNG_BEISPIEL.bild }} />
        : folie.vorlage === 'standard'
        ? <div className={`flex flex-1 items-center justify-center ${VOLLBILD.includes(folie.standard) ? 'w-full' : 'origin-center scale-[1.8]'}`}><CiStandardBild art={folie.standard} ansicht={ansicht} /></div>
        : ansicht === 'schueler' ? <TabletInhalt f={folie} /> : <VorlagenInhalt f={folie} />}
    </VorlageRahmen>
  );
}