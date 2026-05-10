/**
 * ArchitektTab.jsx
 *
 * Tab 1 der MBK-Konsole — Generator 1 ("Architekt").
 *
 * Workflow:
 *   1. Einheit ausgewählt → useMBKArchitektPayloads baut UI-Config (Payload 1)
 *      und Strukturpayload (Payload 2) ON-THE-FLY aus den Rohdaten
 *      (Einheit, Themenfelder, Lernpakete, … + globale MBK-Prompts).
 *      → KEIN Lookup in der ExportPrompts-Tabelle. Die interne MBK ist ein
 *      eigenständiger Pfad parallel zum Air-Gap-Export-Center.
 *   2. Klick auf "Gerüst generieren" → Backend-Funktion mbkGenerateScaffold
 *      ruft Claude Sonnet, parst die FILE-Blöcke, persistiert sie als
 *      MBKGeneratedFile-Records.
 *   3. Output-Felder zeigen die fünf erzeugten Dateien (Manifest + 4 Dashboards).
 *      Re-Generieren überschreibt vorhandene Records.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import MBKFileOutputCard from './MBKFileOutputCard';
import MBKPayloadsDialog from './MBKPayloadsDialog';
import { useMBKArchitektPayloads } from '@/hooks/useMBKArchitektPayloads';
import { useMBKEditablePrompts } from '@/hooks/useMBKEditablePrompts';
import { ARCHITEKT_PROMPT_VERSION } from '@/lib/mbkArchitektPrompt';

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
  const [runningSingle, setRunningSingle] = useState(null); // filename oder null
  const [showPayloads, setShowPayloads] = useState(false);

  // ── Payloads on-the-fly bauen (ohne ExportPrompts-Lookup). ──
  const {
    isLoading: loadingPayloads,
    uiConfigPayload,
    structurePayload,
    missingPrereqs,
  } = useMBKArchitektPayloads(einheitId);

  // ── Editor-States für die bearbeitbaren Bausteine. ──
  const editable = useMBKEditablePrompts();

  // ── Bereits generierte Files laden. ──
  const { data: generatedFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['mbk-generated-files', einheitId, 'scaffold'],
    queryFn: async () => {
      const all = await base44.entities.MBKGeneratedFile.filter({ einheit_id: einheitId });
      return all.filter((f) => f.generator === 'scaffold');
    },
    enabled: !!einheitId,
  });

  const fileByFilename = new Map(generatedFiles.map((f) => [f.filename, f]));
  const isAnyRunning = running || !!runningSingle;
  const canGenerate = missingPrereqs.length === 0 && !isAnyRunning && !loadingPayloads;

  // Gemeinsamer Aufruf für "alle 5" und "nur eine Datei". targetFilename=null
  // → komplettes Gerüst; sonst single-file-Modus.
  const invokeScaffold = async (targetFilename) => {
    const res = await base44.functions.invoke('mbkGenerateScaffold', {
      einheitId,
      uiConfigPayload,
      structurePayload,
      targetFilename: targetFilename || undefined,
    });
    if (res?.data?.success) {
      const count = res.data.file_count;
      toast.success(
        targetFilename
          ? `${targetFilename} generiert.`
          : `Gerüst generiert: ${count} Dateien.`
      );
      queryClient.invalidateQueries({ queryKey: ['mbk-generated-files', einheitId] });
    } else {
      toast.error(res?.data?.error || 'Generierung fehlgeschlagen.');
    }
  };

  const handleGenerateAll = async () => {
    if (!canGenerate) return;
    setRunning(true);
    try {
      await invokeScaffold(null);
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler bei der Generierung.');
    } finally {
      setRunning(false);
    }
  };

  const handleGenerateSingle = async (filename) => {
    if (!canGenerate) return;
    setRunningSingle(filename);
    try {
      await invokeScaffold(filename);
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler bei der Generierung.');
    } finally {
      setRunningSingle(null);
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
              Die nötigen Daten (UI-Config + Struktur) werden hier direkt aus den
              Rohdaten der Einheit zusammengestellt.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowPayloads(true)}
              disabled={loadingPayloads}
              className="gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Payloads anzeigen
            </Button>
            <Button
              onClick={handleGenerateAll}
              disabled={!canGenerate || loadingFiles}
              className="gap-1.5"
              title="Erzeugt alle 5 Dateien in einem KI-Aufruf — kann eine Weile dauern."
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generatedFiles.length > 0 ? 'Alle neu generieren' : 'Alle generieren'}
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Tipp:</strong> "Alle generieren" macht einen einzigen großen
            KI-Aufruf für alle 5 Dateien und kann ein bis zwei Minuten dauern.
            Schneller und zuverlässiger ist es, die Dateien einzeln über den
            "Generieren"-Button an jeder Karte zu erzeugen.
          </span>
        </div>

        {missingPrereqs.length > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <strong>Voraussetzungen fehlen:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {missingPrereqs.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
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

      <MBKPayloadsDialog
        open={showPayloads}
        onOpenChange={setShowPayloads}
        payloads={[
          {
            label: 'Master-System-Prompt (Architekt)',
            payload: editable.architekt.value,
            format: 'text',
            subLabel: `Version ${ARCHITEKT_PROMPT_VERSION} · wird als System-Anweisung an die KI übergeben`,
            editConfig: { editable: true, ...editable.architekt },
          },
          {
            label: 'UI-Baustein: CSS-Variablen',
            payload: editable.uiCss.value,
            format: 'text',
            subLabel: 'ui_css_variables · Inline-CSS für jede generierte HTML-Datei',
            editConfig: { editable: true, ...editable.uiCss },
          },
          {
            label: 'UI-Baustein: Tab-Bar HTML',
            payload: editable.uiTabBar.value,
            format: 'text',
            subLabel: 'ui_tab_bar_html · Tab-Navigation in den vier Dashboards',
            editConfig: { editable: true, ...editable.uiTabBar },
          },
          {
            label: 'UI-Baustein: Header-Template',
            payload: editable.uiHeader.value,
            format: 'text',
            subLabel: 'ui_default_header_html · Header mit Back-Button für Aufgaben/Bündel',
            editConfig: { editable: true, ...editable.uiHeader },
          },
          {
            label: 'UI-Config (Payload 1, generiert)',
            payload: uiConfigPayload,
            subLabel: 'Wird automatisch aus den UI-Bausteinen oben gebaut',
            editConfig: {
              editable: false,
              readOnlyReason: 'Wird automatisch aus den drei UI-Bausteinen oben gebaut.',
            },
          },
          {
            label: 'Strukturpayload (Payload 2)',
            payload: structurePayload,
            editConfig: {
              editable: false,
              readOnlyReason: 'Wird deterministisch aus den Rohdaten der Einheit erzeugt und kann nicht direkt bearbeitet werden.',
            },
          },
        ]}
      />

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
              onGenerate={() => handleGenerateSingle(slot.filename)}
              isGenerating={runningSingle === slot.filename}
              canGenerate={canGenerate && !loadingFiles}
            />
          );
        })}
      </div>
    </div>
  );
}