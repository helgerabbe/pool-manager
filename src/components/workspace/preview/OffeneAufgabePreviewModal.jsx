/**
 * OffeneAufgabePreviewModal.jsx
 *
 * Schüler-Vorschau für die "Offene Aufgabe" (Sandbox-Prinzip).
 *
 * Besonderheit: Es gibt keine Standard-Darstellung. Aus der Aufgaben-
 * beschreibung der Lehrkraft wird eine konkrete (später interaktive)
 * Umsetzung erzeugt. Gefällt das Ergebnis, kann die Lehrkraft es als
 * "Vorschau-Vorlage" (Snapshot) einfrieren — dieser eingefrorene Stand
 * wird später 1:1 in den Export übernommen.
 *
 * SCHRITT 1 (dieses Gerüst): Erzeugung, Anzeige im iPad-Frame (Sandbox-
 * iframe), Übernehmen-Flow, Warnhinweis + Ladeanzeige. Die eigentliche
 * KI-Generierung der interaktiven Aufgabe folgt in Schritt 2 — aktuell
 * wird ein Platzhalter-Fragment aus der Beschreibung gebaut.
 */
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Sparkles, Loader2, Check, Clock, AlertTriangle, Lock } from 'lucide-react';
import IPadFrame from '@/components/workspace/preview/IPadFrame';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Entfernt evtl. Markdown-Code-Fences, falls das Modell sie mitliefert,
// und gibt das reine HTML-Dokument zurück.
function extractHtml(raw = '') {
  let s = String(raw).trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  return s;
}

export default function OffeneAufgabePreviewModal({
  open,
  onOpenChange,
  description = '',
  kontext = '',
  catalogName = 'Offene Aufgabe',
  phase = 'Übung',
  existingSnapshotHtml = '',
  canApprove = false,
  isReleased = false,
  onApproveSnapshot,
}) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Beim Öffnen: vorhandenen Snapshot laden (oder leeren Zustand zeigen).
  useEffect(() => {
    if (open) {
      setPreviewHtml(existingSnapshotHtml || '');
      setIsGenerating(false);
    }
  }, [open, existingSnapshotHtml]);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist Entwickler interaktiver Lernaufgaben für eine digitale Lernplattform.
Erzeuge aus der folgenden Aufgabenbeschreibung EINE vollständige, in sich geschlossene, interaktive HTML-Seite, die ein einzelner Schüler allein am Computer bearbeitet.

STRIKTE VORGABEN:
- Gib AUSSCHLIESSLICH ein vollständiges HTML-Dokument zurück (beginnend mit <!DOCTYPE html>). Keine Erklärungen, kein Markdown, keine Code-Fences.
- Alles inline: CSS in <style>, JavaScript in <script>. KEINE externen Dateien, Links, Bilder oder CDNs.
- Die Aufgabe muss funktional sein: Eingaben/Auswahl möglich, Auswerten-Button, direktes Feedback (richtig/falsch), am Ende eine kurze Zusammenfassung.
- Modernes, freundliches, gut lesbares Design. Schrift system-ui. Passend für ein iPad (Breite ~960px).
- Sprache: Deutsch. Einzelarbeit, rein digital, keine Gruppen- oder Materialhinweise.
${kontext ? `\nRAHMEN / KONTEXT DIESER AUFGABE (unbedingt beachten, aber NICHT wörtlich auf dem Bildschirm anzeigen):\n${kontext}\n\nWICHTIG: Schulische Begriffe (z. B. "Poolzeit" als Freiarbeits-/Lernzeit) beziehen sich auf diesen Kontext – nicht auf die wörtliche Alltagsbedeutung.\n` : ''}
AUFGABENBESCHREIBUNG:
${description}`,
        model: 'claude_sonnet_4_6',
      });
      const html = extractHtml(typeof result === 'string' ? result : result?.text || '');
      if (!html) throw new Error('Die KI hat keine Aufgabe zurückgegeben.');
      setPreviewHtml(html);
    } catch (err) {
      toast.error('Erstellung fehlgeschlagen: ' + (err?.message || 'Unbekannt'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!previewHtml || !onApproveSnapshot) return;
    setIsSaving(true);
    try {
      await onApproveSnapshot(previewHtml);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPreview = !!previewHtml;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-[1280px] overflow-y-auto bg-slate-100 p-4">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-violet-600" />
            Schüler-Vorschau
            <span className="text-xs font-normal text-slate-500 ml-1">· {catalogName}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Prüfe, ob deine Aufgabenbeschreibung so umgesetzt wird, wie du es dir vorstellst. Passt es, kannst du diesen Stand als Vorlage übernehmen.
          </p>
        </DialogHeader>

        {/* Steuerleiste */}
        <div className="pt-3 flex flex-wrap items-center gap-2">
          {!isReleased && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              title={!description.trim() ? 'Bitte zuerst eine Aufgabenbeschreibung eingeben.' : ''}
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird erstellt…</>
                : <><Sparkles className="w-4 h-4" /> {hasPreview ? 'Neu erstellen' : 'Vorschau erstellen'}</>}
            </Button>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5" /> Achtung: Das Erstellen kann etwas dauern.
          </span>
          {!isReleased && hasPreview && (
            <Button
              onClick={handleApprove}
              disabled={!canApprove || isSaving || isGenerating}
              className="gap-2 ml-auto"
              title={!canApprove ? 'Zum Übernehmen den Bearbeitungsmodus aktivieren.' : ''}
            >
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert…</>
                : <><Check className="w-4 h-4" /> Diese Vorschau übernehmen</>}
            </Button>
          )}
        </div>

        {isReleased && (
          <div className="mt-2 flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Diese Aufgabe ist freigegeben. Um eine neue Vorschau-Vorlage zu erstellen, hebe zuerst die Freigabe auf.</span>
          </div>
        )}

        <div className="pt-3">
          <IPadFrame lernpaketTitel={catalogName} phaseLabel={phase}>
            <div className="bg-white h-full flex flex-col relative">
              <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[12px] text-amber-800 shrink-0">
                <span className="font-semibold">{phase} ·</span> Hier übst du, was du gelernt hast.
              </div>
              <div className="flex-1 min-h-0 relative">
                {isGenerating && (
                  <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 px-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    <p className="text-sm font-semibold text-slate-800">Deine Aufgabe wird erstellt…</p>
                    <p className="text-xs text-slate-500 max-w-sm flex items-center gap-1.5 justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Bitte einen Moment Geduld und die Seite nicht verlassen.
                    </p>
                  </div>
                )}
                {hasPreview ? (
                  <iframe
                    title="Offene-Aufgabe-Vorschau"
                    srcDoc={previewHtml}
                    sandbox="allow-scripts"
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
                  !isGenerating && (
                    <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center">
                      <Sparkles className="w-8 h-8 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        Noch keine Vorschau. Klicke oben auf „Vorschau erstellen", um aus deiner Beschreibung eine Aufgabe zu gestalten.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </IPadFrame>
        </div>
      </DialogContent>
    </Dialog>
  );
}