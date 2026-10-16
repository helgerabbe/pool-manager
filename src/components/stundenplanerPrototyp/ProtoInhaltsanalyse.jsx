import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KorrekturFeld from './KorrekturFeld';

/** Schritt 2: KI-Inhaltsanalyse – 3–4 Kernaspekte, ausführliche Sachanalyse aufklappbar. */
export default function ProtoInhaltsanalyse({ analyse, onErstellen, onWeiter }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState(false);
  const [lang, setLang] = React.useState(false);
  const erstellen = (korrektur) => {
    setLaedt(true); setFehler(false);
    onErstellen(korrektur).catch(() => setFehler(true)).finally(() => setLaedt(false));
  };
  React.useEffect(() => { if (!analyse) erstellen(); }, []);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Bevor wir planen, kläre ich mit dir, worum es inhaltlich in dieser Stunde geht.</p>
      {laedt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich mache kurz die Inhaltsanalyse, damit wir uns einig sind, was drankommen soll …</p>}
      {fehler && <div className="space-y-2"><p className="text-sm text-destructive">Die Inhaltsanalyse hat nicht geklappt.</p><Button size="sm" onClick={() => erstellen()}>Noch einmal versuchen</Button></div>}
      {analyse && !laedt && (
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
            <KorrekturFeld knopf="Nein, das ist anders" platzhalter="Was soll anders sein? Worum geht es eigentlich?" neuText="Sachanalyse neu" onNeu={erstellen} />
          </div>
        </div>
      )}
    </div>
  );
}