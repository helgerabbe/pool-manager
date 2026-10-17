import React from 'react';
import { ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MethodikPhase from './MethodikPhase';
import SparringFenster from './SparringFenster';
import TippCenter from './TippCenter';

const BEGRUESSUNG = {
  aendern: (n) => `Du möchtest etwas in der Phase „${n}“ ändern. Erklär mir, was es sein soll. Wir besprechen das so lange, bis es passt.`,
  frage: (n) => `Du hast eine Frage zur Phase „${n}“. Was möchtest du wissen?`,
  alternativen: (n) => `Du möchtest Alternativen zur Phase „${n}“. In welche Richtung denkst du, z. B. mehr Teamarbeit, gelenkter oder offener?`,
  gesamt: () => 'Hier geht es um den Gesamtverlauf der Stunde. Möchtest du am Ablauf insgesamt etwas ändern, oder beschreib mir allgemein, was du vorhast.',
};

/** Schritt „Methodische Gestaltung“: Ablauf prüfen und alles über einen Gesprächsassistenten klären. */
export default function MethodischeGestaltung({ entwurf, setEntwurf, onSparring, onTipps, pruefung, onZurueck, onWeiter }) {
  const [gespraech, setGespraech] = React.useState(null);
  const oeffnen = (fokus, modus) => setGespraech({ fokus, verlauf: [{ role: 'assistant', content: BEGRUESSUNG[modus](entwurf.phasen[fokus]?.name) }] });
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Ich habe eine Stunde zusammengebaut, die deinen Vorgaben entspricht. Unter „Mehr dazu“ findest du Hintergründe zu jeder Phase und kannst mit mir über sie sprechen.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{entwurf.kurz}</p>
        <Button size="sm" variant="outline" onClick={() => oeffnen(null, 'gesamt')}><MessageCircle /> Über den Gesamtverlauf sprechen</Button>
      </div>
      {entwurf.phasen.map((p, i) => <MethodikPhase key={i} phase={p} nr={i + 1} onStart={(modus) => oeffnen(i, modus)} />)}
      <TippCenter pruefung={pruefung} onLaden={onTipps}
        onBesprechen={(t) => setGespraech({ fokus: null, verlauf: [{ role: 'assistant', content: `Lass uns über diese Idee sprechen:\n\n> ${t.text}\n\nWas hältst du davon? Soll ich dir zeigen, wie die Stunde damit aussehen würde?` }] })} />
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onZurueck}>Zurück zur Grobplanung</Button>
        <Button onClick={onWeiter}>Ablauf passt so <ArrowRight /></Button>
      </div>
      {gespraech && (
        <SparringFenster titel={gespraech.fokus == null ? 'Gespräch zum Gesamtverlauf' : `Gespräch: ${entwurf.phasen[gespraech.fokus]?.name}`}
          verlauf={gespraech.verlauf} setVerlauf={(verlauf) => setGespraech((g) => ({ ...g, verlauf }))}
          onAnfrage={(verlauf) => onSparring(verlauf, gespraech.fokus)} onUebernehmen={setEntwurf} onSchliessen={() => setGespraech(null)} />
      )}
    </div>
  );
}