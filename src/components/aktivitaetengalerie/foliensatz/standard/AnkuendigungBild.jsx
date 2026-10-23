import React from 'react';
import VorlageRahmen from '../vorlagen/VorlageRahmen';
import VorlagenInhalt from '../vorlagen/VorlagenInhalt';

export const ANKUENDIGUNG_BEISPIEL = {
  vorlage: 'fokus', folientyp: 'inhalt', freigabe: 'lehrkraft', titel: 'Unzufrieden im Beruf?',
  satz: 'Wir wollen herausfinden, warum viele Menschen mit ihrem Beruf unglücklich sind.',
  bild: 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/ab5930a9d_generated_image.png',
};

/** Standardfolie „Inhaltliche Ankündigung“: kündigt an, was in der nächsten Phase herausgefunden werden soll. */
export default function AnkuendigungBild() {
  return (
    <div className="w-full">
      <VorlageRahmen folie={ANKUENDIGUNG_BEISPIEL} klein kopf="Name der Einheit · Thema der Stunde · Einstieg">
        <VorlagenInhalt f={ANKUENDIGUNG_BEISPIEL} />
      </VorlageRahmen>
    </div>
  );
}