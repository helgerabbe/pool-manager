/**
 * ArchitektTab.jsx
 *
 * Tab 1 der MBK-Konsole — Generator 1 ("Architekt").
 *
 * Workflow:
 *   1. Einheit ausgewählt → Hook lädt aus ExportPrompts die UI-Config
 *      (Payload 1) und den Strukturpayload (Payload 2). Beides muss
 *      vorhanden sein, sonst ist der Button deaktiviert.
 *   2. Klick auf "Gerüst generieren" → Backend-Funktion mbkGenerateScaffold
 *      ruft Claude Sonnet, parst die FILE-Blöcke, persistiert sie als
 *      MBKGeneratedFile-Records.
 *   3. Output-Felder zeigen die fünf erzeugten Dateien (Manifest + 4 Dashboards).
 *      Re-Generieren überschreibt vorhandene Records.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import MBKFileOutputCard from './MBKFileOutputCard';

// Slots in der gewünschten Anzeige-Reihenfolge.
const ARCHITEKT_SLOTS = [
  { filename: 'imsmanifest.xml', kind: 'manifest', label: 'SCORM-Manifest' },
  { filename: 'dashboard-minimalist.html', kind: 'dashboard', label: 'Dashboard – Minimalist' },
  { filename: 'dashboard-pragmatiker.html', kind: 'dashboard', label: 'Dashboard – Pragmatiker' },
  { filename: 'dashboard-ehrgeizig.html', kind: 'dashboard', label: 'Dashboard – Ehrgeizig' },
  { filename: 'dashboard-passioniert.html', kind: 'dashboard', label: 'Dashboard – Passioniert' },
];

export default function ArchitektTab({ einheitId }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  // ── ExportPrompts laden: UI-Config (Payload 1) + Struktur (Payload 2). ──
  const { data: exportPrompts = [], isLoading: loadingPrompts } = useQuery({
    queryKey: ['mbk-export-prompts', einheitId],
    queryFn: () => base44.entities.ExportPrompts.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const uiConfigRecord = useMemo(
    () => exportPrompts.find((p) => p.prompt_type === 'mbk_ui_config') || null,
    [exportPrompts]
  );
  const structureRecord = useMemo(
    () => exportPrompts.find((p) => p.prompt_type === 'mbk_structure_payload') || null,
    [exportPrompts]
  );

  // ── Bereits generierte Files laden. ──
  const { data: generatedFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['mbk-generated-files', einheitId, 'scaffold'],
    queryFn: async () => {
      const all = await base44.entities.MBKGeneratedFile.filter({ einheit_id: einheitId });
      return all.filter((f) => f.generator === 'scaffold');
    },
    enabled: !!einheitId,
  });

  const fileByFilename = useMemo(() => {
    const m = new Map();
    for (const f of generatedFiles) m.set(f.filename, f);
    return m;
  }, [generatedFiles]);

  // ── Voraussetzungen prüfen. ──
  const missingPrereqs = [];
  if (!uiConfigRecord) missingPrereqs.push('UI-Config (Payload 1)');
  if (!structureRecord) missingPrereqs.push('Strukturpayload (Payload 2)');
  const canGenerate = missingPrereqs.length === 0 && !running;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setRunning(true);
    try {
      // Die ExportPrompts speichern den Payload als JSON-String — parsen.
      let uiConfigPayload = null;
      let structurePayload = null;
      try {
        uiConfigPayload = JSON.parse(uiConfigRecord.content || '{}');
      } catch (e) {
        throw new Error('UI-Config-Payload konnte nicht geparst werden.');
      }
      try {
        structurePayload = JSON.parse(structureRecord.content || '{}');
      } catch (e) {
        throw new Error('Strukturpayload konnte nicht geparst werden.');
      }

      const res = await base44.functions.invoke('mbkGenerateScaffold', {
        einheitId,
        uiConfigPayload,
        structurePayload,
      });

      if (res?.data?.success) {
        toast.success(`Gerüst generiert: ${res.data.file_count} Dateien.`);
        queryClient.invalidateQueries({ queryKey: ['mbk-generated-files', einheitId] });
      } else {
        toast.error(res?.data?.error || 'Generierung fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler bei der Generierung.');
    } finally {
      setRunning(false);
    }
  };

  if (!einheitId) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Bitte oben eine Einheit auswählen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header-Karte mit Status + Generieren-Button ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Generator 1 – Architekt</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Erzeugt das statische SCORM-Gerüst der Einheit: SCORM-Manifest und
              die vier Dashboards (Minimalist, Pragmatiker, Ehrgeizig, Passioniert).
              Inhalte werden noch nicht erfunden — nur Hüllen, Tabs und Navigation.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || loadingPrompts || loadingFiles}
            className="gap-1.5 shrink-0"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generatedFiles.length > 0 ? 'Erneut generieren' : 'Gerüst generieren'}
          </Button>
        </div>

        {missingPrereqs.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <strong>Voraussetzungen fehlen:</strong>{' '}
              {missingPrereqs.join(', ')}. Bitte zuerst im Export-Center die
              entsprechenden Air-Gap-Payloads generieren lassen.
            </div>
          </div>
        )}

        {generatedFiles.length > 0 && missingPrereqs.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {generatedFiles.length} von {ARCHITEKT_SLOTS.length} Dateien generiert.
            </span>
          </div>
        )}
      </div>

      {/* ── Output-Karten in fester Reihenfolge ── */}
      <div className="space-y-3">
        {ARCHITEKT_SLOTS.map((slot) => {
          const file = fileByFilename.get(slot.filename);
          return (
            <MBKFileOutputCard
              key={slot.filename}
              filename={slot.filename}
              kind={slot.kind}
              content={file?.content || ''}
              isEmpty={!file}
            />
          );
        })}
      </div>
    </div>
  );
}