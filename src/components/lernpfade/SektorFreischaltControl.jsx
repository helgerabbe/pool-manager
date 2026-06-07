/**
 * SektorFreischaltControl.jsx
 *
 * Kompaktes Control im Sektor-Header zur Festlegung, WANN ein Sektor im
 * Schüler-Dashboard zugänglich wird:
 *   - "Sofort sichtbar" (Default)
 *   - "Erst nach Abschluss von: <Sektor>" (Single-Select)
 *
 * Bewusst minimal: genau EIN vorgeschalteter Sektor, keine UND/ODER-Logik.
 * Sektoren, die einen Zyklus erzeugen würden, werden gar nicht erst angeboten.
 */

import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FREISCHALT_MODUS,
  normalizeFreischaltBedingung,
  getVerboteneVoraussetzungen,
} from '@/lib/sektorFreischaltung';

const SOFORT_VALUE = '__sofort__';

export default function SektorFreischaltControl({
  sektor,
  alleSektoren = [],
  disabled = false,
  onChange,
  getSektorLabel,
}) {
  const fb = normalizeFreischaltBedingung(sektor?.freischalt_bedingung);
  const verboten = getVerboteneVoraussetzungen(alleSektoren, sektor?.sektor_id);

  const auswahlbar = (alleSektoren || []).filter((s) => !verboten.has(s.sektor_id));

  const labelFor = (s) =>
    (getSektorLabel ? getSektorLabel(s) : null) || s.titel?.trim() || 'Sektor';

  const currentValue =
    fb.modus === FREISCHALT_MODUS.NACH_SEKTOR && fb.voraussetzung_sektor_id
      ? fb.voraussetzung_sektor_id
      : SOFORT_VALUE;

  const handleChange = (val) => {
    if (val === SOFORT_VALUE) {
      onChange?.({ modus: FREISCHALT_MODUS.SOFORT, voraussetzung_sektor_id: null });
    } else {
      onChange?.({ modus: FREISCHALT_MODUS.NACH_SEKTOR, voraussetzung_sektor_id: val });
    }
  };

  const isGated = fb.modus === FREISCHALT_MODUS.NACH_SEKTOR;
  const Icon = isGated ? Lock : Unlock;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                isGated ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {isGated
              ? 'Dieser Sektor ist anfangs gesperrt und wird erst nach Abschluss des gewählten Sektors zugänglich.'
              : 'Dieser Sektor ist von Anfang an sichtbar und zugänglich.'}
          </TooltipContent>
        </Tooltip>
        <Select value={currentValue} onValueChange={handleChange} disabled={disabled}>
          <SelectTrigger className="h-7 text-[11px] w-auto min-w-[150px] bg-card gap-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SOFORT_VALUE} className="text-[11px]">
              Sofort sichtbar
            </SelectItem>
            {auswahlbar.map((s) => (
              <SelectItem key={s.sektor_id} value={s.sektor_id} className="text-[11px]">
                Erst nach: {labelFor(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TooltipProvider>
  );
}