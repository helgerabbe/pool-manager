/**
 * AuswahlAufgabenMultiSelect.jsx
 *
 * Multiselect-Picker für den Aufgabentyp `auswahl_buendel` (Brian-Bündel).
 * Persistiert die Auswahl in `AllgemeineAufgabe.verlinkte_aufgaben_ids`.
 *
 * Filterung (Sprint D):
 * - Nur Aufgaben der aktuellen Einheit.
 * - Vorrangig Ebene-2-Aufgaben („2 - Transfer"). Ebene 1/3 werden
 *   absichtlich ausgeblendet, damit ein Brian-Bündel nicht versehentlich
 *   Projekte oder Basisaufgaben verlinkt.
 * - Keine anderen Bündel/Anker (`buendel`, `auswahl_buendel`, `projekt_anker`),
 *   damit keine Verschachtelungen entstehen.
 * - Die Aufgabe darf sich nicht selbst verlinken (`excludeAufgabeId`).
 * - Tombstones (`sync_status === 'to_delete'`) werden ausgeblendet.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { Checkbox } from '@/components/ui/checkbox';
import { PackageCheck, Loader2 } from 'lucide-react';

const ZULAESSIGE_TYPEN = new Set(['inhalt', 'prozess', 'handlung']);

export default function AuswahlAufgabenMultiSelect({
  einheitId,
  selectedIds = [],
  onChange,
  excludeAufgabeId = null,
}) {
  const { data: alleAufgaben = [], isLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => (einheitId ? getAufgabenByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  const verfuegbareAufgaben = (alleAufgaben || []).filter((a) => {
    if (a.id === excludeAufgabeId) return false;
    if (a.sync_status === 'to_delete') return false;
    if (a.anforderungsebene !== '2 - Transfer') return false;
    const typ = a.aufgaben_typ || 'inhalt';
    return ZULAESSIGE_TYPEN.has(typ);
  });

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      <div className="flex items-center gap-2">
        <PackageCheck className="w-4 h-4 text-emerald-700" />
        <h4 className="text-sm font-semibold text-emerald-800">Verlinkte Ebene-2-Aufgaben</h4>
        <span className="text-[10px] text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
          {selectedIds.length} ausgewählt
        </span>
      </div>
      <p className="text-xs text-emerald-900/70">
        Wähle die Aufgaben (Ebene 2), aus denen der Schüler im Brian-Bündel auswählen kann.
      </p>

      <div className="max-h-60 overflow-y-auto rounded-md bg-white border border-emerald-100 divide-y divide-emerald-50">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Lade Aufgaben…
          </div>
        ) : verfuegbareAufgaben.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground italic">
            Keine passenden Ebene-2-Aufgaben in dieser Einheit vorhanden.
          </p>
        ) : (
          verfuegbareAufgaben.map((a) => {
            const checked = selectedIds.includes(a.id);
            const hasTitel = !!a.titel?.trim();
            return (
              <label
                key={a.id}
                className="flex items-start gap-2.5 p-2.5 hover:bg-emerald-50/40 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(a.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-medium truncate ${
                      hasTitel ? 'text-foreground' : 'italic text-muted-foreground'
                    }`}
                  >
                    {hasTitel ? a.titel : 'Ohne Titel'}
                  </p>
                  {a.aufgabenstellung && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {a.aufgabenstellung}
                    </p>
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