import React from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { variantenListe, varianteHinzufuegen, varianteEntfernen, varianteFreigeben } from '@/lib/schrittVarianten';

/** Umschalter für die Varianten eines Elements: wählen, hinzufügen, freigeben, löschen. */
export default function VariantenLeiste({ schritt, aktiv, onChange }) {
  const liste = variantenListe(schritt);
  const anzahl = liste.length;
  const aktive = liste[aktiv];
  const leer = Object.keys(aktive?.field_values || {}).length === 0;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {liste.map((v, i) => (
          <Button key={i} size="sm" variant={i === aktiv ? 'default' : 'outline'} className="h-7"
            onClick={() => onChange({ ...schritt, _variante: i })}>
            Variante {i + 1}{v.entwurf ? ' (Entwurf)' : ''}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => onChange(varianteHinzufuegen(schritt))}>
          <Plus /> Variante
        </Button>
        {aktive?.entwurf && (
          <Button size="sm" variant="outline" className="h-7 gap-1" disabled={leer}
            onClick={() => onChange(varianteFreigeben(schritt, aktiv))}>
            <Check /> Variante {aktiv + 1} freigeben
          </Button>
        )}
        {anzahl > 1 && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 ml-auto text-destructive hover:text-destructive"
            onClick={() => onChange(varianteEntfernen(schritt, aktiv))}>
            <Trash2 /> Variante {aktiv + 1} löschen
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {aktive?.entwurf
          ? 'Entwurf: Schüler bekommen diese Variante erst, wenn sie freigegeben ist. Das Element bleibt trotzdem vollständig.'
          : anzahl > 1
            ? 'Jeder Schüler bekommt zufällig eine der freigegebenen Varianten.'
            : 'Mit weiteren Varianten bekommt jeder Schüler zufällig eine davon.'}
      </p>
    </div>
  );
}