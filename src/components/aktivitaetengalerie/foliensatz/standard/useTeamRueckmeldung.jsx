import React from 'react';
import { Smartphone } from 'lucide-react';

const TEXTE = {
  stern: 'Hinweis von eurer Lehrkraft: Ihr arbeitet gerade richtig gut. Weiter so!',
  leise: 'Hinweis von eurer Lehrkraft: Bitte etwas leiser.',
};

/** Rückmeldungen an Teams: Sterne je Team, zuletzt gesendeter Hinweis als Geräte-Vorschau. Ein/aus steuert das Tafel-Menü. */
export default function useTeamRueckmeldung(name, an) {
  const [sterne, setSterne] = React.useState({});
  const [gesendet, setGesendet] = React.useState(null);
  const senden = (team, art) => {
    if (art === 'stern') setSterne((s) => ({ ...s, [team]: (s[team] || 0) + 1 }));
    setGesendet({ team, art });
  };
  const gesamt = Object.values(sterne).reduce((a, b) => a + b, 0);
  return {
    sterne, senden, gesamt,
    vorschau: an && gesendet && (
      <p className="flex items-center gap-1 rounded-lg border border-dashed bg-white px-2 py-1 text-[10px] text-[#6A7181]">
        <Smartphone className="h-3 w-3 shrink-0" />Auf den Geräten von {name} {gesendet.team}: „{TEXTE[gesendet.art]}“
      </p>
    ),
  };
}