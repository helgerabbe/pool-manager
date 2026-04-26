/**
 * useMoodleExportRunner.js
 *
 * Kapselt die Export-Pipeline für den MoodleExportManager:
 *   1. Delta-Payload je Einheit erzeugen (mit Sprint-G AllgemeineAufgabe).
 *   2. last_exported_at je Einheit setzen.
 *   3. Basismodule-Payload bauen + last_exported_at setzen.
 *   4. Kombiniertes JSON als Datei zum Download anbieten.
 *
 * Das Ziel des Hooks ist, die Hauptkomponente von I/O- und Mutations-
 * Logik freizuhalten. Validierungsfehler werden als Toast gemeldet und
 * brechen den Export ab; reine Cosmetics (Refetches, Schließen-Callback)
 * bleiben Verantwortung der UI.
 */

import { useCallback, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { generateDeltaPayload } from '@/lib/deltaPayloadGenerator';

function downloadJson(payload, deltaMode) {
  const dataStr = JSON.stringify(payload, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `moodle-export-${deltaMode ? 'delta-' : ''}${
    new Date().toISOString().split('T')[0]
  }.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useMoodleExportRunner({
  allLernpakete,
  allLernziele,
  allAufgaben,
  allThemenfelder,
  allAllgemeineAufgaben,
}) {
  const [isExporting, setIsExporting] = useState(false);

  const runExport = useCallback(
    async ({ einheiten, basismodule, deltaMode }) => {
      if (einheiten.length === 0 && basismodule.length === 0) {
        toast.error('Bitte wählen Sie mindestens ein Element zum Exportieren aus.');
        return { ok: false };
      }

      setIsExporting(true);
      const nowTimestamp = new Date().toISOString();
      let totalChangedCount = 0;
      const einheitPayloads = [];

      try {
        // ── Einheiten: Delta-Payload ──
        for (const einheit of einheiten) {
          try {
            const deltaPayload = generateDeltaPayload(
              einheit,
              allLernpakete,
              allLernziele,
              allAufgaben,
              allThemenfelder,
              einheit.last_exported_at,
              deltaMode,
              allAllgemeineAufgaben
            );
            einheitPayloads.push(deltaPayload);
            totalChangedCount += deltaPayload.statistics.total_changed_count;

            await base44.entities.Einheiten.update(einheit.id, {
              last_exported_at: nowTimestamp,
            });
          } catch (validationError) {
            console.warn(`Validierungsfehler für Einheit ${einheit.id}:`, validationError);
            toast.error(
              `Validierungsfehler für "${einheit.titel_der_einheit}": ${validationError.message}`
            );
            throw validationError;
          }
        }

        // ── Basismodule: Full-Export ──
        const basismodulePayload = {
          timestamp: nowTimestamp,
          export_type: 'basismodule',
          basismodule: basismodule.map((b) => ({
            id: b.id,
            fach: b.fach,
            titel: b.titel,
            beschreibung_thema: b.beschreibung_thema,
            status: b.status,
            updated_date: b.updated_date,
            last_synced_at: b.last_synced_at,
            last_exported_at: nowTimestamp,
          })),
          statistics: { basismodule_count: basismodule.length },
        };

        await Promise.all(
          basismodule.map((b) =>
            base44.entities.Basismodule.update(b.id, { last_exported_at: nowTimestamp })
          )
        );

        // ── Kombiniertes Payload ──
        const combinedPayload = {
          timestamp: nowTimestamp,
          export_type: deltaMode ? 'moodle_delta_combined' : 'moodle_full_combined',
          is_delta_export: deltaMode,
          einheiten: einheitPayloads,
          basismodule: basismodulePayload,
          statistics: {
            einheiten_count: einheiten.length,
            basismodule_count: basismodule.length,
            total_changed_count: totalChangedCount + basismodule.length,
          },
        };

        downloadJson(combinedPayload, deltaMode);
        toast.success(
          `${deltaMode ? 'Delta-' : ''}Export erfolgreich: ${combinedPayload.statistics.total_changed_count} Element(e).`
        );
        return { ok: true, payload: combinedPayload };
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Fehler beim Exportieren: ' + error.message);
        return { ok: false, error };
      } finally {
        setIsExporting(false);
      }
    },
    [allLernpakete, allLernziele, allAufgaben, allThemenfelder, allAllgemeineAufgaben]
  );

  return { isExporting, runExport };
}