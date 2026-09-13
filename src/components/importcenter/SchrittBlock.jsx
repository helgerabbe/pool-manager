import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import SchrittFeldEingabe from '@/components/importcenter/SchrittFeldEingabe';

/**
 * EIN Schritt einer Aufgabensequenz im Formular: Art, Titel und die Felder,
 * die genau zu dieser Art gehören. Die Feldliste kommt aus dem Vertrag
 * (schritt_typen) — hier steht keine zweite Wahrheit darüber, was ein Schritt
 * braucht.
 */
export default function SchrittBlock({
  schritt = {},
  index = 0,
  typen = [],
  aufgabenarten = [],
  onChange,
  onMove,
  onRemove,
  einzeln = false,
}) {
  const def = typen.find((t) => t.typ === schritt.typ) || null;

  const setzeFeld = (name, wert) => {
    if (!def) return;
    if (def.block) {
      onChange({ ...schritt, [def.block]: { ...(schritt[def.block] || {}), [name]: wert } });
    } else {
      onChange({ ...schritt, [name]: wert });
    }
  };

  const quelle = def?.block ? schritt[def.block] || {} : schritt;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!einzeln && <Badge variant="secondary">Schritt {index + 1}</Badge>}
          {schritt.id && (
            <span className="font-mono text-[11px] text-muted-foreground">{schritt.id}</span>
          )}
        </div>
        {!einzeln && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(index, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(index, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(index)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">
            Art des Schritts<span className="ml-1 text-destructive">*</span>
          </Label>
          <Select
            value={schritt.typ || ''}
            onValueChange={(v) => onChange({ id: schritt.id, titel: schritt.titel, typ: v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Art wählen" />
            </SelectTrigger>
            <SelectContent>
              {typen.map((t) => (
                <SelectItem key={t.typ} value={t.typ}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Titel des Schritts</Label>
          <Input
            className="h-8 text-sm"
            value={schritt.titel || ''}
            onChange={(e) => onChange({ ...schritt, titel: e.target.value })}
          />
        </div>
      </div>

      {def && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {def.felder.map((feld) => (
            <SchrittFeldEingabe
              key={feld.name}
              feld={feld}
              wert={quelle[feld.name]}
              aufgabenarten={aufgabenarten}
              onChange={(v) => setzeFeld(feld.name, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}