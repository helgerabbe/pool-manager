import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssistentFrage from './AssistentFrage';
import KorrekturFeld from './KorrekturFeld';
import { ANALYSE_FRAGEN, ANALYSE, ANALYSE_NEU } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 2: Inhaltsanalyse – Rückfragen, dann 3–4 Kernaspekte, ausführliche Sachanalyse aufklappbar. */
export default function ProtoInhaltsanalyse({ onWeiter }) {
  const [i, setI] = React.useState(0);
  const [antworten, setAntworten] = React.useState([]);
  const [analyse, setAnalyse] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);
  const [lang, setLang] = React.useState(false);
  const erstellen = (daten) => { setLaedt(true); setAnalyse(null); setTimeout(() => { setAnalyse(daten); setLaedt(false); }, 1300); };
  const antworte = (a) => {
    setAntworten([...antworten, { frage: ANALYSE_FRAGEN[i].frage, antwort: a }]);
    if (i + 1 < ANALYSE_FRAGEN.length) setI(i + 1); else erstellen(ANALYSE);
  };
  const fragenOffen = !analyse && !laedt;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Bevor wir planen, kläre ich mit dir, worum es inhaltlich in dieser Stunde geht. Dafür brauche ich noch kurz ein paar Informationen.</p>
      {antworten.map((a, k) => <p key={k} className="text-xs text-muted-foreground"><span className="font-medium">{a.frage}</span> → {a.antwort}</p>)}
      {fragenOffen && <AssistentFrage key={i} frage={ANALYSE_FRAGEN[i]} onAntwort={antworte} />}
      {laedt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich mache kurz die Inhaltsanalyse, damit wir uns einig sind, was drankommen soll …</p>}
      {analyse && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Darum geht es in der Stunde</p>
            <p className="mb-3 text-xs text-muted-foreground">Bitte kurz überfliegen: Ist das der Inhalt, den du meinst?</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm">{analyse.aspekte.map((a) => <li key={a}>{a}</li>)}</ol>
            <button className="mt-3 flex items-center gap-1 text-xs text-primary" onClick={() => setLang(!lang)}>
              <ChevronDown className={`h-3 w-3 transition-transform ${lang ? 'rotate-180' : ''}`} /> Ausführliche Sachanalyse {lang ? 'ausblenden' : 'lesen'}
            </button>
            {lang && <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">{analyse.sachanalyse}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onWeiter}>Passt so – weiter</Button>
            <KorrekturFeld knopf="Nein, das ist anders" platzhalter="Was soll anders sein? Worum geht es eigentlich?" neuText="Sachanalyse neu" onNeu={() => erstellen(ANALYSE_NEU)} />
          </div>
        </div>
      )}
    </div>
  );
}