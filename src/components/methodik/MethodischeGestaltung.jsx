import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import MethodikPhase from './MethodikPhase';

/** Schritt „Methodische Gestaltung“: Ablauf prüfen, einzelne Abschnitte ändern, Hinweise nur auf Wunsch. */
export default function MethodischeGestaltung({ entwurf, onPhaseAendern, pruefung, onZurueck, onWeiter }) {
  const [hinweise, setHinweise] = React.useState(false);
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Ich habe eine Stunde zusammengebaut, die deinen Vorgaben entspricht. Jetzt schauen wir nur auf den methodischen Ablauf: Passt die Reihenfolge, gefällt dir, was die Schüler tun? Digital oder analog und die konkreten Materialien kommen erst in der Feinplanung.</p>
      </div>
      <p className="text-sm font-semibold">{entwurf.kurz}</p>
      {entwurf.phasen.map((p, i) => <MethodikPhase key={i} phase={p} nr={i + 1} onAendern={(w) => onPhaseAendern(i, w)} />)}
      <label className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm">
        <Switch checked={hinweise} onCheckedChange={setHinweise} />
        Zeig mir, was dir noch auffällt (optional)
      </label>
      {hinweise && pruefung}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onZurueck}>Zurück zur Grobplanung</Button>
        <Button onClick={onWeiter}>Ablauf passt so <ArrowRight /></Button>
      </div>
    </div>
  );
}