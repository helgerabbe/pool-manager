/**
 * LernpaketMultiSelect.jsx
 *
 * Multiselect-Picker für Lernpakete (Ebene 1) der aktuellen Einheit.
 * Wird im AufgabeCreateView eingeblendet, wenn aufgaben_typ === 'buendel'.
 * Persistiert die Auswahl in AllgemeineAufgabe.verlinkte_lernpaket_ids.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllLernpakete } from '@/services/LernpaketService';
import { Checkbox } from '@/components/ui/checkbox';
import { Folder, Loader2 } from 'lucide-react';

export default function LernpaketMultiSelect({
  einheitId,
  selectedIds = [],
  onChange,
}) {
  const { data: allPakete = [], isLoading } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => getAllLernpakete(),
  });

  const paketeDerEinheit = (allPakete || []).filter((p) => p.einheit_id === einheitId);

  const toggle = (paketId) => {
    if (selectedIds.includes(paketId)) {
      onChange(selectedIds.filter((id) => id !== paketId));
    } else {
      onChange([...selectedIds, paketId]);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <div className="flex items-center gap-2">
        <Folder className="w-4 h-4 text-blue-700" />
        <h4 className="text-sm font-semibold text-blue-800">Verlinkte Lernpakete</h4>
        <span className="text-[10px] text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
          {selectedIds.length} ausgewählt
        </span>
      </div>
      <p className="text-xs text-blue-900/70">
        Wählen Sie die Lernpakete der Ebene 1, die in diesem Bündel zusammengefasst werden.
      </p>

      <div className="max-h-60 overflow-y-auto rounded-md bg-white border border-blue-100 divide-y divide-blue-50">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Lade Lernpakete…
          </div>
        ) : paketeDerEinheit.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground italic">Keine Lernpakete in dieser Einheit vorhanden.</p>
        ) : (
          paketeDerEinheit.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <label
                key={p.id}
                className="flex items-start gap-2.5 p-2.5 hover:bg-blue-50/40 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(p.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">
                    {p.reihenfolge_nummer ? `${p.reihenfolge_nummer}. ` : ''}{p.titel_des_pakets || 'Unbenanntes Paket'}
                  </p>
                  {p.geschaetzte_dauer_minuten && (
                    <p className="text-[10px] text-muted-foreground">{p.geschaetzte_dauer_minuten} Min.</p>
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