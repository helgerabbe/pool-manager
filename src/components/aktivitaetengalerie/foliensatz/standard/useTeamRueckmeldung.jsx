import React from 'react';
import { Award, Smartphone } from 'lucide-react';

const TEXTE = {
  stern: 'Hinweis von eurer Lehrkraft: Ihr arbeitet gerade richtig gut. Weiter so!',
  leise: 'Hinweis von eurer Lehrkraft: Bitte etwas leiser.',
};

/** Rückmeldungen an Teams: an/aus-Schalter, Sterne je Team, zuletzt gesendeter Hinweis als Geräte-Vorschau. */
export default function useTeamRueckmeldung(name) {
  const [an, setAn] = React.useState(false);
  const [sterne, setSterne] = React.useState({});
  const [gesendet, setGesendet] = React.useState(null);
  const senden = (team, art) => {
    if (art === 'stern') setSterne((s) => ({ ...s, [team]: (s[team] || 0) + 1 }));
    setGesendet({ team, art });
  };
  return {
    an, sterne, senden,
    schalter: <button type="button" onClick={() => setAn(!an)} title="Rückmeldungen an Teams ein-/ausblenden"
      className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${an ? 'bg-[#2A4074] text-white' : 'bg-white'}`}><Award className="h-3 w-3" />Rückmeldung</button>,
    vorschau: an && gesendet && (
      <p className="flex items-center gap-1 rounded-lg border border-dashed bg-white px-2 py-1 text-[10px] text-[#6A7181]">
        <Smartphone className="h-3 w-3 shrink-0" />Auf den Geräten von {name} {gesendet.team}: „{TEXTE[gesendet.art]}“
      </p>
    ),
  };
}