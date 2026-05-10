/**
 * AufgabenTab.jsx
 *
 * Tab 2 der MBK-Konsole — Generator 2 ("Aufgaben-Bauer").
 *
 * Workflow analog zum Architekten:
 *   1. Einheit ausgewählt → useMBKAufgabenPayloads baut UI-Config (Payload 1),
 *      Strukturpayload (Payload 2) und Task-Content (Payload 3) on-the-fly.
 *   2. "Payloads anzeigen" zeigt alle drei Payloads + den editierbaren
 *      Master-System-Prompt für den Aufgaben-Bauer (siehe useMBKEditablePrompts).
 *   3. "Alle neu generieren" ruft die Backend-Function `mbkGenerateTasks`
 *      sequentiell pro Datei auf — jeder Aufruf erzeugt GENAU EINE Hülle.
 *      Ein riesiger Multi-File-Aufruf wäre zu schwer; sequenzielle Aufrufe
 *      bleiben überschaubar und brechbar.
 *   4. Pro Slot (Lernpaket / Themenfeld-Bündel / Projekt-Bündel) gibt es
 *      eine Karte mit eigenem "Generieren"-Button, Read-Only-Output,
 *      Copy-Button.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import MBKFileOutputCard from './MBKFileOutputCard';
import MBKPayloadsDialog from './MBKPayloadsDialog';
import { useMBKAufgabenPayloads } from '@/hooks/useMBKAufgabenPayloads';
import { useMBKEditablePrompts } from '@/hooks/useMBKEditablePrompts';
import { AUFGABEN_PROMPT_VERSION } from '@/lib/mbkAufgabenPrompt';

const KIND_LABELS = {
  lernpaket: 'Lernpaket',
  themenfeld_bundle: 'Themenfeld-Bündel',
  projekt_bundle: 'Projekt-Bündel',
};

export default function AufgabenTab({ einheitId }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [runningSingle, setRunningSingle] = useState(null);
  const [showPayloads, setShowPayloads] = useState(false);

  const {
    isLoading: loadingPayloads,
    uiConfigPayload,
    structurePayload,
    taskContentPayload,
    taskSlots,
    missingPrereqs,
  } = useMBKAufgabenPayloads(einheitId);

  const editable = useMBKEditablePrompts();

  // Bereits generierte Files mit generator='task'.
  const { data: generatedFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['mbk-generated-files', einheitId, 'task'],
    queryFn: async () => {
      const all = await base44.entities.MBKGeneratedFile.filter({ einheit_id: einheitId });
      return all.filter((f) => f.generator === 'task');
    },
    enabled: !!einheitId,
  });

  const fileByFilename = new Map(generatedFiles.map((f) => [f.filename, f]));
  const isAnyRunning = running || !!runningSingle;
  const canGenerate =
    missingPrereqs.length === 0 && !isAnyRunning && !loadingPayloads
    && !!uiConfigPayload && !!structurePayload && !!taskContentPayload;

  const invokeTaskBuilder = async (targetFilename) => {
    const res = await base44.functions.invoke('mbkGenerateTasks', {
      einheitId,
      uiConfigPayload,
      structurePayload,
      taskContentPayload,
      targetFilename,
    });
    if (res?.data?.success) {
      queryClient.invalidateQueries({ queryKey: ['mbk-generated-files', einheitId] });
      return true;
    }
    throw new Error(res?.data?.error || 'Generierung fehlgeschlagen.');
  };

  const handleGenerateSingle = async (filename) => {
    if (!canGenerate) return;
    setRunningSingle(filename);
    try {
      await invokeTaskBuilder(filename);
      toast.success(`${filename} generiert.`);
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler.');
    } finally {
      setRunningSingle(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!canGenerate) return;
    setRunning(true);
    let ok = 0;
    let fail = 0;
    try {
      // Sequenziell — jede Datei ist ein eigener LLM-Aufruf. Bei Fehlern
      // sammeln wir, brechen aber nicht ab, damit ein einzelnes fehlerhaftes
      // Item nicht den Rest blockiert.
      for (const slot of taskSlots) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await invokeTaskBuilder(slot.filename);
          ok += 1;
        } catch (err) {
          fail += 1;
          // Toast pro Fehler, damit der Operator sieht, woran es lag.
          toast.error(`${slot.filename}: ${err?.message || 'Fehler'}`);
        }
      }
      if (fail === 0) {
        toast.success(`Alle ${ok} Aufgaben-Hüllen generiert.`);
      } else {
        toast.warning(`${ok} von ${taskSlots.length} Aufgaben-Hüllen generiert (${fail} Fehler).`);
      }
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
      {/* ── Header-Karte ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Generator 2 – Aufgaben-Bauer</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Erzeugt die deterministischen Aufgaben-Hüllen: pro Lernpaket eine
              Monolith-HTML, pro Themenfeld ein Bündel mit allen Ebene-2-Aufgaben,
              pro Einheit ein Projekt-Bündel mit allen Ebene-3-Aufgaben. KI-Aufgaben
              werden als Platzhalter eingebaut — sie werden später von Generator 4
              durch echte Fragmente ersetzt.
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
              disabled={!canGenerate || loadingFiles || taskSlots.length === 0}
              className="gap-1.5"
              title="Erzeugt alle Aufgaben-Hüllen sequenziell — pro Datei ein eigener KI-Aufruf."
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
            <strong>Tipp:</strong> "Alle generieren" ruft die KI für jede Aufgaben-Hülle
            einzeln auf — das kann je nach Anzahl der Lernpakete und Bündel mehrere
            Minuten dauern. Schneller und kontrollierter ist es, die Dateien einzeln
            über den "Generieren"-Button an jeder Karte zu erzeugen.
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
              {generatedFiles.length} von {taskSlots.length} Aufgaben-Hüllen generiert.
            </span>
          </div>
        )}
      </div>

      <MBKPayloadsDialog
        open={showPayloads}
        onOpenChange={setShowPayloads}
        payloads={[
          {
            label: 'Master-System-Prompt (Aufgaben-Bauer)',
            payload: editable.aufgaben.value,
            format: 'text',
            subLabel: `Version ${AUFGABEN_PROMPT_VERSION} · wird als System-Anweisung an die KI übergeben`,
            editConfig: { editable: true, ...editable.aufgaben },
          },
          // Pro Aktivitätstyp ein eigener editierbarer Block.
          // Beim Generieren werden nur die Anweisungen der Typen eingewoben,
          // die im aktuellen Lernpaket tatsächlich vorkommen.
          ...editable.aktivitaetstypen.map((t) => ({
            label: t.anzeigename,
            payload: t.value,
            format: 'text',
            subLabel: `Wird nur eingewoben, wenn eine Aktivität "${t.aktivitaet_name}" im Auftrag vorkommt`,
            editConfig: { editable: true, ...t },
          })),
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
          {
            label: 'Task-Content (Payload 3)',
            payload: taskContentPayload,
            subLabel: 'Vollständige Aufgabeninhalte aller Lernpakete & Allgemeinen Aufgaben',
            editConfig: {
              editable: false,
              readOnlyReason: 'Wird aus Lernpaketen, Aktivitäten, MasterAufgaben und Allgemeinen Aufgaben deterministisch zusammengestellt.',
            },
          },
        ]}
      />

      {/* ── Output-Karten pro Slot ── */}
      {taskSlots.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Diese Einheit enthält noch keine Aufgaben-Hüllen — bitte zuerst Lernpakete oder Allgemeine Aufgaben anlegen.
        </div>
      ) : (
        <div className="space-y-3">
          {taskSlots.map((slot) => {
            const file = fileByFilename.get(slot.filename);
            const kindLabel = KIND_LABELS[slot.kind] || slot.kind;
            return (
              <MBKFileOutputCard
                key={slot.filename}
                filename={slot.filename}
                displayTitle={slot.displayTitle}
                subtitle={slot.subtitle}
                kind={kindLabel}
                content={file?.content || ''}
                isEmpty={!file}
                onGenerate={() => handleGenerateSingle(slot.filename)}
                isGenerating={runningSingle === slot.filename}
                canGenerate={canGenerate && !loadingFiles}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}