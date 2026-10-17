import React from 'react';
import { ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import MethodikPhase from './MethodikPhase';
import SparringFenster from './SparringFenster';

/** Schritt „Methodische Gestaltung“: Ablauf prüfen, Abschnitte ändern, mit dem Assistenten sprechen, Hinweise nur auf Wunsch. */
export default function MethodischeGestaltung({ entwurf, setEntwurf, onPhaseAendern, onSparring, pruefung, onZurueck, onWeiter }) {
  const [hinweise, setHinweise] = React.useState(false);
  const [gespraech, setGespraech] = React.useState(null);
  const oeffnen = (fokus) => {
    const begruessung = fokus == null ? 'Worüber möchtest du sprechen? Du kannst mich alles zur Stunde fragen oder mir sagen, was ich anpassen soll.' : `Du hast eine Frage zur Phase „${entwurf.phasen[fokus].name}“. Was möchtest du wissen?`;
    setGespraech({ fokus, verlauf: [{ role: 'assistant', content: begruessung }] });
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Ich habe eine Stunde zusammengebaut, die deinen Vorgaben entspricht. Jetzt schauen wir nur auf den methodischen Ablauf. Unter „Mehr dazu“ findest du Hintergründe und kannst einzelne Abschnitte ändern oder mich etwas fragen.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{entwurf.kurz}</p>
        <Button size="sm" variant="outline" onClick={() => oeffnen(null)}><MessageCircle /> Mit dem Assistenten sprechen</Button>
      </div>
      {entwurf.phasen.map((p, i) => <MethodikPhase key={i} phase={p} nr={i + 1} onAendern={(w) => onPhaseAendern(i, w)} onFrage={() => oeffnen(i)} />)}
      <label className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm">
        <Switch checked={hinweise} onCheckedChange={setHinweise} />
        Zeig mir, was dir noch auffällt (optional)
      </label>
      {hinweise && pruefung}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onZurueck}>Zurück zur Grobplanung</Button>
        <Button onClick={onWeiter}>Ablauf passt so <ArrowRight /></Button>
      </div>
      {gespraech && (
        <SparringFenster titel={gespraech.fokus == null ? 'Gespräch zur Stunde' : `Gespräch: ${entwurf.phasen[gespraech.fokus]?.name}`}
          verlauf={gespraech.verlauf} setVerlauf={(verlauf) => setGespraech((g) => ({ ...g, verlauf }))}
          onAnfrage={(verlauf) => onSparring(verlauf, gespraech.fokus)} onUebernehmen={setEntwurf} onSchliessen={() => setGespraech(null)} />
      )}
    </div>
  );
}