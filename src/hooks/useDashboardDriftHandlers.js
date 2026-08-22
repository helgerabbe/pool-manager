/**
 * useDashboardDriftHandlers.js
 *
 * Die vier Inline-Aktionen des Drift-Hinweises im Lernpfad-Cockpit:
 *   - fehlende Arbeitsphase für ein Themenfeld anlegen,
 *   - verwaisten Sektor entfernen,
 *   - verwaisten Verweis (Ghost-Item) entfernen,
 *   - neu entstandenen Inhalt in sein Ziel-Bündel einsortieren.
 *
 * Alle Handler arbeiten immutable über `updateKonfiguration` und nutzen damit
 * dieselbe Save-/Junction-Sync-Pipeline wie reguläre Edits.
 */

import { useCallback } from 'react';
import {
  addArbeitsphaseSektorForThemenfeld,
  removeOrphanedSektor,
  removeGhostItem,
  addMissingItemToBundle,
} from '@/lib/dashboardDriftResolutions';

export function useDashboardDriftHandlers({
  readOnly,
  activeLernTyp,
  updateKonfiguration,
  // true = Dashboard ist bestätigt → nachgezogene Inhalte starten inaktiv,
  // damit sich ein geprüfter Pfad für Schüler nicht unbemerkt ändert.
  dashboardBestaetigt,
  toast,
}) {
  const handleDriftAddSektor = useCallback(
    (themenfeld) => {
      if (readOnly || !themenfeld?.id) return;
      updateKonfiguration((prev) =>
        addArbeitsphaseSektorForThemenfeld(prev, activeLernTyp, themenfeld)
      );
      toast({
        title: 'Sektor angelegt',
        description: `Arbeitsphase „${themenfeld.titel}" wurde dem Arbeitsplan hinzugefügt.`,
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration, toast]
  );

  const handleDriftRemoveSektor = useCallback(
    (drift) => {
      if (readOnly || !drift?.sektor_id) return;
      updateKonfiguration((prev) => removeOrphanedSektor(prev, activeLernTyp, drift.sektor_id));
      toast({
        title: 'Sektor entfernt',
        description: 'Aufgaben und Lernpakete bleiben erhalten – sie tauchen wieder im Pool auf.',
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration, toast]
  );

  const handleDriftRemoveItem = useCallback(
    (drift) => {
      if (readOnly || !drift?.sektor_id || !drift?.instance_id) return;
      updateKonfiguration((prev) =>
        removeGhostItem(prev, activeLernTyp, drift.sektor_id, drift.instance_id)
      );
      toast({
        title: 'Verweis entfernt',
        description: 'Der verwaiste Eintrag wurde aus dem Pfad entfernt.',
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration, toast]
  );

  const handleDriftAddItem = useCallback(
    (entry) => {
      if (readOnly || !entry?.ref_id) return;
      updateKonfiguration((prev) =>
        addMissingItemToBundle(prev, activeLernTyp, entry, { inaktiv: dashboardBestaetigt })
      );
      toast({
        title: dashboardBestaetigt ? 'Einsortiert (inaktiv)' : 'Einsortiert',
        description: dashboardBestaetigt
          ? `„${entry.titel}" wurde inaktiv eingefügt – aktiviere es über das Augen-Symbol am Element.`
          : `„${entry.titel}" wurde in „${entry.sektor_titel}" eingefügt.`,
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration, toast, dashboardBestaetigt]
  );

  return {
    handleDriftAddSektor,
    handleDriftRemoveSektor,
    handleDriftRemoveItem,
    handleDriftAddItem,
  };
}

export default useDashboardDriftHandlers;