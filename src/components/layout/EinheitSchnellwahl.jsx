/**
 * EinheitSchnellwahl.jsx
 *
 * Schnellsprung-Auswahl in der globalen Top-Bar: gemeinschaftliche (öffentliche)
 * Einheiten UND die eigenen privaten Einheiten in zwei Gruppen. Auswahl springt
 * direkt in die Einheit.
 *
 * Warum zwei Abfragen: getEinheitenListSecure liefert je Aufruf NUR eine
 * Sichtbarkeits-Ansicht (view='oeffentlich' bzw. 'privat'). Ohne die zweite
 * Abfrage fehlt die private Bibliothek komplett.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function useEinheitenAnsicht(view) {
  const { data } = useQuery({
    queryKey: ['einheiten', 'schnellwahl', view],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitenListSecure', {
        page: 1,
        limit: 100,
        view,
      });
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return data || [];
}

export default function EinheitSchnellwahl({ activeEinheitId }) {
  const navigate = useNavigate();
  const oeffentlich = useEinheitenAnsicht('oeffentlich');
  const privat = useEinheitenAnsicht('privat');

  const ohneBasismodule = (list) => list.filter((e) => !e.ist_basismodul);
  const sortiert = (list) =>
    [...ohneBasismodule(list)].sort((a, b) =>
      (a.titel_der_einheit || '').localeCompare(b.titel_der_einheit || '', 'de')
    );

  const meine = sortiert(privat);
  const gemeinschaft = sortiert(oeffentlich);
  const label = (e) => `${e.titel_der_einheit}${e.fach ? ` · ${e.fach}` : ''}`;

  return (
    <Select value={activeEinheitId || ''} onValueChange={(id) => navigate(`/einheiten/${id}`)}>
      <SelectTrigger
        className="h-8 w-[220px] text-xs bg-muted/40"
        aria-label="Zu einer Einheit springen"
      >
        <SelectValue placeholder="Einheit wechseln …" />
      </SelectTrigger>
      <SelectContent className="max-h-[70vh]">
        {meine.length > 0 && (
          <SelectGroup>
            <SelectLabel>Meine Einheiten</SelectLabel>
            {meine.map((e) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">
                {label(e)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {gemeinschaft.length > 0 && (
          <SelectGroup>
            <SelectLabel>Gemeinschaftliche Einheiten</SelectLabel>
            {gemeinschaft.map((e) => (
              <SelectItem key={e.id} value={e.id} className="text-xs">
                {label(e)}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {meine.length === 0 && gemeinschaft.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">Keine Einheiten vorhanden.</div>
        )}
      </SelectContent>
    </Select>
  );
}