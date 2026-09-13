import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * EIN Eingabefeld eines Sequenz-Schritts, gerendert nach der Feld-Beschreibung
 * aus dem Vertrag (schritt_typen). Das Formular kann dadurch nie andere Felder
 * anbieten, als die Empfangsprüfung kennt.
 */
export default function SchrittFeldEingabe({ feld, wert, onChange, aufgabenarten = [] }) {
  const optionen =
    feld.typ === 'aufgabenart'
      ? aufgabenarten.map((a) => ({ value: a.id, label: `${a.name} (${a.phase})` }))
      : feld.typ === 'select'
      ? (feld.optionen || []).map((o) => ({ value: o, label: o }))
      : null;

  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {feld.label}
        {feld.pflicht && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {optionen ? (
        <Select value={wert || ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={`${feld.label} wählen`} />
          </SelectTrigger>
          <SelectContent>
            {optionen.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : feld.typ === 'json' ? (
        <Textarea
          rows={8}
          className="font-mono text-xs"
          placeholder='{ "aufgabenstellung": "…" }'
          value={typeof wert === 'string' ? wert : wert ? JSON.stringify(wert, null, 2) : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : feld.typ === 'textarea' ? (
        <Textarea rows={3} className="text-sm" value={wert || ''} onChange={(e) => onChange(e.target.value)} />
      ) : feld.typ === 'number' ? (
        <Input
          type="number"
          className="h-8 text-sm"
          value={wert ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      ) : feld.typ === 'array' ? (
        <Input
          className="h-8 text-sm"
          placeholder="Werte mit Komma trennen"
          value={Array.isArray(wert) ? wert.join(', ') : wert || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input className="h-8 text-sm" value={wert || ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}