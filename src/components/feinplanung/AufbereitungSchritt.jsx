import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AufbereitungsPhase from './AufbereitungsPhase';

/** Aufbereitung: Impulse, Arbeitsaufträge und Materialien je Phase. */
export default function AufbereitungSchritt({ entwurf, setEntwurf, onErstellen, onZurueck, onWeiter }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const vorhanden = entwurf.phasen.some((p) => p.impuls || p.arbeitsauftrag || p.material);
  const setzePhase = (i, daten) => setEntwurf((e) => ({ ...e, phasen: e.phasen.map((p, j) => (j === i ? { ...p, ...daten } : p)) }));
  const erstellen = () => {
    setLaedt(true); setFehler('');
    onErstellen()
      .then((vs) => setEntwurf((e) => ({ ...e, phasen: e.phasen.map((p, i) => ({ ...p, ...(vs[i] || {}) })) })))
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.'))
      .finally(() => setLaedt(false));
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Jetzt wird es konkret: Für jede Phase entstehen dein Impuls, der Arbeitsauftrag und das Material, passend zur gewählten Umsetzung. Du kannst alles direkt anpassen.</p>
      </div>
      <Button variant={vorhanden ? 'outline' : 'default'} disabled={laedt} onClick={erstellen}>
        {laedt ? <Loader2 className="animate-spin" /> : <Sparkles />} {vorhanden ? 'Neu erstellen lassen' : 'Aufgaben und Materialien erstellen'}
      </Button>
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      {vorhanden && (
        <div className="space-y-2">
          {entwurf.phasen.map((p, i) => <AufbereitungsPhase key={i} phase={p} nr={i + 1} onAendern={(d) => setzePhase(i, d)} />)}
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={onZurueck}>Zurück</Button>
        <Button disabled={!vorhanden || laedt} onClick={onWeiter}>Fertig</Button>
      </div>
    </div>
  );
}