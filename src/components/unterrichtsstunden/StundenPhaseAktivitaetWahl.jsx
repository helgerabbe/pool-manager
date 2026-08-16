/**
 * Auswahl der digitalen Aktivität (aus dem Aktivitäten-Katalog) für eine
 * Stunden-Phase vom Typ "Digitale Aktivität".
 */
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StundenPhaseAktivitaetWahl({ value, onChange, disabled = false }) {
  const { data: katalog = [], isLoading } = useQuery({
    queryKey: ['aktivitaetenKatalogAktiv'],
    queryFn: () => base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'phase', 200),
  });

  const gewaehlt = katalog.find((a) => a.id === value);

  return (
    <div className="space-y-2">
      <Label>Digitale Aufgabenart</Label>
      <Select value={value || ''} onValueChange={onChange} disabled={disabled || isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? 'Katalog wird geladen…' : 'Aufgabenart auswählen'} />
        </SelectTrigger>
        <SelectContent>
          {katalog.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name} · {a.phase}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {gewaehlt?.beschreibung && (
        <p className="text-xs text-muted-foreground">{gewaehlt.beschreibung}</p>
      )}
    </div>
  );
}