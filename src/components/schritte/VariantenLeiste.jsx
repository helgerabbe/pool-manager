import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { variantenListe, varianteHinzufuegen, varianteEntfernen } from '@/lib/schrittVarianten';

/** Umschalter für die Varianten eines Elements: wählen, hinzufügen, löschen. */
export default function VariantenLeiste({ schritt, aktiv, onChange }) {
  const anzahl = variantenListe(schritt).length;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: anzahl }, (_, i) => (
          <Button key={i} size="sm" variant={i === aktiv ? 'default' : 'outline'} className="h-7"
            onClick={() => onChange({ ...schritt, _variante: i })}>
            Variante {i + 1}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => onChange(varianteHinzufuegen(schritt))}>
          <Plus /> Variante
        </Button>
        {anzahl > 1 && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 ml-auto text-destructive hover:text-destructive"
            onClick={() => onChange(varianteEntfernen(schritt, aktiv))}>
            <Trash2 /> Variante {aktiv + 1} löschen
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {anzahl > 1
          ? 'Jeder Schüler bekommt zufällig eine dieser Varianten.'
          : 'Mit weiteren Varianten bekommt jeder Schüler zufällig eine davon.'}
      </p>
    </div>
  );
}