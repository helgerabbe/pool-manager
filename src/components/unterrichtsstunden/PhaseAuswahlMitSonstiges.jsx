/**
 * Auswahlfeld mit den häufigsten Vorgaben plus „Sonstiges" (Freitext).
 * Wird im Phasen-Editor für Methode & Sozialform sowie Material genutzt.
 */
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SONSTIGES = '__sonstiges__';

export default function PhaseAuswahlMitSonstiges({ titel, optionen, value, onChange, placeholder }) {
  const [freitextAktiv, setFreitextAktiv] = useState(!!value && !optionen.includes(value));
  const istFreitext = freitextAktiv || (!!value && !optionen.includes(value));

  const auswahl = (v) => {
    if (v === SONSTIGES) {
      setFreitextAktiv(true);
      onChange('');
    } else {
      setFreitextAktiv(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {titel} <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <Select value={istFreitext ? SONSTIGES : (value || '')} onValueChange={auswahl}>
        <SelectTrigger className="bg-card h-9">
          <SelectValue placeholder="Bitte auswählen" />
        </SelectTrigger>
        <SelectContent>
          {optionen.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
          <SelectItem value={SONSTIGES}>Sonstiges …</SelectItem>
        </SelectContent>
      </Select>
      {istFreitext && (
        <Input
          className="bg-card h-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </div>
  );
}

export const METHODEN_SOZIALFORMEN = [
  'Lehrervortrag',
  'Lehrer-Schüler-Gespräch',
  'Plenumsgespräch',
  'Einzelarbeit',
  'Partnerarbeit',
  'Gruppenarbeit',
  'Think-Pair-Share',
  'Stationenarbeit',
  'Präsentation durch Schüler:innen',
  'Freie Arbeitsphase',
];

export const MATERIALIEN = [
  'Tafel',
  'Whiteboard',
  'PowerPoint-Folie',
  'Arbeitsblatt',
  'Schulbuch',
  'Heft / Notizen',
  'Tablet / Laptop',
  'Video',
  'Impulsbild',
  'Kein Material',
];