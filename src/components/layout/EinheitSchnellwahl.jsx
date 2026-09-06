/**
 * EinheitSchnellwahl.jsx
 *
 * Schnellsprung-Auswahl in der globalen Top-Bar: Alle Einheiten, die die
 * Lehrkraft sehen darf (Server-gefiltert über getEinheitenListSecure), in zwei
 * Gruppen — „Meine Einheiten" (privat) und „Gemeinschaftliche Einheiten"
 * (öffentliche Poolzeit-Einheiten). Auswahl springt direkt in die Einheit.
 *
 * Basismodule bleiben bewusst aussen vor: Sie haben ihre eigene Übersicht.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Library } from 'lucide-react';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useEinheitenList } from '@/hooks/useEinheitenList';

export default function EinheitSchnellwahl({ activeEinheitId }) {
  const navigate = useNavigate();
  // Grosszügiges Limit: Die Liste soll vollständig sein, sie ist nur ein Sprungbrett.
  const { einheiten } = useEinheitenList(1, 200);

  const sichtbar = (einheiten || []).filter((e) => !e.ist_basismodul);
  const privat = sichtbar.filter((e) => e.sichtbarkeit === 'privat');
  const gemeinschaftlich = sichtbar.filter((e) => e.sichtbarkeit !== 'privat');

  const sortiert = (list) =>
    [...list].sort((a, b) =>
      (a.titel_der_einheit || '').localeCompare(b.titel_der_einheit || '', 'de')
    );

  const label = (e) => `${e.titel_der_einheit}${e.fach ? ` · ${e.fach}` : ''}`;

  return (
    <Select value={activeEinheitId || ''} onValueChange={(id) => navigate(`/einheiten/${id}`)}>
      <SelectTrigger
        className="h-8 w-[220px] text-xs bg-muted/40"
        aria-label="Zu einer Einheit springen"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Library className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Einheit wechseln …" />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-[70vh]">
        {privat.length > 0 && (
          <SelectGroup>
            <SelectLabel>Meine Einheiten</SelectLabel>
            {sortiert(privat).map((e) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">
                {label(e)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {gemeinschaftlich.length > 0 && (
          <SelectGroup>
            <SelectLabel>Gemeinschaftliche Einheiten</SelectLabel>
            {sortiert(gemeinschaftlich).map((e) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">
                {label(e)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {sichtbar.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">Keine Einheiten vorhanden.</div>
        )}
      </SelectContent>
    </Select>
  );
}