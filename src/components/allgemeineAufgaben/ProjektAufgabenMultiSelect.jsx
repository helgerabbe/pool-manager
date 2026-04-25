/**
 * ProjektAufgabenMultiSelect.jsx
 *
 * Multiselect-Picker für Ebene-3-Projektaufgaben der aktuellen Einheit.
 * Wird im AufgabeCreateView eingeblendet, wenn aufgaben_typ === 'projekt_anker'.
 * Persistiert die Auswahl in AllgemeineAufgabe.verlinkte_projekt_ids.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { Checkbox } from '@/components/ui/checkbox';
import { Rocket, Loader2 } from 'lucide-react';

export default function ProjektAufgabenMultiSelect({
  einheitId,
  selectedIds = [],
  onChange,
  excludeAufgabeId = null, // verhindert, dass eine Aufgabe sich selbst verlinkt
}) {
  const { data: alleAufgaben = [], isLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => (einheitId ? getAufgabenByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  const ebene3Aufgaben = (alleAufgaben || []).filter(
    (a) => a.anforderungsebene === '3 - Projekt' && a.id !== excludeAufgabeId
  );

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-violet-700" />
        <h4 className="text-sm font-semibold text-violet-800">Verlinkte Ebene-3-Projekte</h4>
        <span className="text-[10px] text-violet-700 bg-violet-100 rounded-full px-2 py-0.5">
          {selectedIds.length} ausgewählt
        </span>
      </div>
      <p className="text-xs text-violet-900/70">
        Wählen Sie die Projektaufgaben (Ebene 3), die Schüler über diesen Anker auswählen können.
      </p>

      <div className="max-h-60 overflow-y-auto rounded-md bg-white border border-violet-100 divide-y divide-violet-50">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Lade Projekte…
          </div>
        ) : ebene3Aufgaben.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground italic">
            Keine Ebene-3-Projektaufgaben in dieser Einheit vorhanden.
          </p>
        ) : (
          ebene3Aufgaben.map((a) => {
            const checked = selectedIds.includes(a.id);
            const hasTitel = !!a.titel?.trim();
            return (
              <label
                key={a.id}
                className="flex items-start gap-2.5 p-2.5 hover:bg-violet-50/40 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(a.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${hasTitel ? 'text-foreground' : 'italic text-muted-foreground'}`}>
                    {hasTitel ? a.titel : 'Ohne Titel'}
                  </p>
                  {a.aufgabenstellung && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{a.aufgabenstellung}</p>
                  )}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}