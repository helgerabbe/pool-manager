import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Schritt 3: Ehrliche KI-Einschätzung – Entscheidungen nur, wenn etwas nicht passt. */
export default function PlausibilitaetsPruefung({ pruefung, laedt, wahl, setWahl, onErneut, onWeiter }) {
  if (laedt || !pruefung) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich prüfe deinen Rahmen …</p>;
  }
  const entscheidungen = pruefung.ampel === 'passt' ? [] : pruefung.entscheidungen || [];
  const fertig = entscheidungen.every((_, i) => wahl[i]);
  return (
    <div className="space-y-5">
      {pruefung.ampel === 'passt' ? (
        <Hinweis icon={CheckCircle2} farbe="border-chart-3/50 bg-chart-3/10" iconFarbe="text-chart-3" titel="Sieht gut aus" text={pruefung.satz} />
      ) : (
        <Hinweis icon={AlertTriangle} farbe="border-accent/50 bg-accent/10" iconFarbe="text-accent" titel="Passt bedingt" text={pruefung.satz} />
      )}
      {entscheidungen.length > 0 && <p className="text-sm font-medium">Bitte triff {entscheidungen.length} Entscheidung{entscheidungen.length > 1 ? 'en' : ''}:</p>}
      {entscheidungen.map((e, i) => (
        <div key={i} className="space-y-2 rounded-lg border bg-card p-3">
          <p className="text-sm font-medium">{i + 1}. {e.frage}</p>
          <div className="flex flex-wrap gap-2">
            {(e.optionen || []).map((o) => (
              <Button key={o} size="sm" variant={wahl[i] === o ? 'default' : 'outline'} onClick={() => setWahl({ ...wahl, [i]: o })}>{o}</Button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!fertig} onClick={onWeiter}>Grobentwurf erstellen</Button>
        <Button variant="outline" className="gap-2" onClick={onErneut}><RotateCcw className="h-4 w-4" /> Erneut prüfen</Button>
      </div>
    </div>
  );
}

function Hinweis({ icon: Icon, farbe, iconFarbe, titel, text }) {
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${farbe}`}>
      <Icon className={`h-5 w-5 shrink-0 ${iconFarbe}`} />
      <div><p className="text-sm font-semibold">{titel}</p><p className="text-sm">{text}</p></div>
    </div>
  );
}