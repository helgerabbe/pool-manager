import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import SchrittBlock from '@/components/importcenter/SchrittBlock';

/**
 * Die Schrittfolge im Formular: eine wiederholbare Blockliste, Position über
 * Pfeile. Im Modus `einzeln` wird genau EIN Schritt gepflegt — das brauchen die
 * schrittgenauen Auftragsarten (schritt_einfuegen, schritt_aendern).
 */
export default function SchritteFeld({
  label = 'Schritte der Sequenz',
  werte,
  onChange,
  typen = [],
  aufgabenarten = [],
  einzeln = false,
}) {
  if (einzeln) {
    return (
      <div className="space-y-2">
        <Label className="text-sm">
          {label}
          <span className="ml-1 text-destructive">*</span>
        </Label>
        <SchrittBlock
          schritt={werte && typeof werte === 'object' ? werte : {}}
          typen={typen}
          aufgabenarten={aufgabenarten}
          onChange={onChange}
          einzeln
        />
      </div>
    );
  }

  const liste = Array.isArray(werte) ? werte : [];

  const setzen = (neu) => onChange(neu);

  const aendern = (idx, schritt) => setzen(liste.map((s, i) => (i === idx ? schritt : s)));

  const verschieben = (idx, richtung) => {
    const ziel = idx + richtung;
    if (ziel < 0 || ziel >= liste.length) return;
    const kopie = liste.slice();
    [kopie[idx], kopie[ziel]] = [kopie[ziel], kopie[idx]];
    setzen(kopie);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm">
        {label}
        <span className="ml-1 text-destructive">*</span>
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {liste.length} Schritt(e)
        </span>
      </Label>

      {liste.map((schritt, idx) => (
        <SchrittBlock
          key={idx}
          schritt={schritt}
          index={idx}
          typen={typen}
          aufgabenarten={aufgabenarten}
          onChange={(s) => aendern(idx, s)}
          onMove={verschieben}
          onRemove={(i) => setzen(liste.filter((_, x) => x !== i))}
        />
      ))}

      <Button variant="outline" size="sm" className="gap-2" onClick={() => setzen([...liste, { typ: 'material' }])}>
        <Plus className="h-4 w-4" /> Schritt hinzufügen
      </Button>
    </div>
  );
}