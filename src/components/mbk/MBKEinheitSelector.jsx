/**
 * MBKEinheitSelector.jsx
 *
 * Schmaler Dropdown-Selector für die MBK-Konsole. Listet alle Einheiten,
 * sortiert nach jüngstem Update zuerst — der Operator wird typischerweise
 * an einer aktuell bearbeiteten Einheit arbeiten.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function MBKEinheitSelector({ value, onChange }) {
  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['mbk-einheiten-list'],
    queryFn: () => base44.entities.Einheiten.list('-updated_date', 200),
    staleTime: 30_000,
  });

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? 'Lade Einheiten…' : 'Einheit wählen…'} />
      </SelectTrigger>
      <SelectContent>
        {einheiten.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.titel_der_einheit || '(ohne Titel)'} · {e.fach || '—'} · Jg. {e.jahrgangsstufe || '—'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}