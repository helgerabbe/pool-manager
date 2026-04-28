/**
 * useMBKBulkGenerate.js
 *
 * Bulk-Aktion für den MBK-Prompt-Generator: erzeugt/aktualisiert alle
 * Standard-Prompts einer Einheit in EINEM Backend-Roundtrip.
 *
 * Skipping-Regeln:
 *   - manuell angepasste Prompts (is_customized=true) werden übersprungen
 *   - blockierte Erstellungspakete (Quelle nicht freigegeben) werden übersprungen
 *
 * Architektur:
 *   - Die Plan-Berechnung lebt in lib/exportPromptBulkPlan.js (rein, testbar).
 *   - Der Hook kümmert sich nur um State, Preview und den Backend-Call.
 *   - Der eigentliche Schreibvorgang läuft über die Backend-Funktion
 *     `bulkUpsertExportPrompts` (1 Roundtrip statt n).
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import {
  isPromptOutOfSync,
  isErstellungspaketBlocked,
  findExistingPrompt,
  LERNTYP_KEYS,
  lookupSourceMaxTimestampFromIndex,
} from '@/lib/exportPromptSync';
import { buildBulkPlan, planToWritePayload, buildMarkdownBundle } from '@/lib/exportPromptBulkPlan';

export function useMBKBulkGenerate({
  einheitId,
  einheit,
  stammdaten,
  themenfelder,
  lernpakete,
  lernziele,
  aufgabenbausteine,
  allgemeineAufgaben,
  allgemeineAufgabenEbene23,
  prompts,
  upsert,
  tsIndex,
}) {
  const [bulkRunning, setBulkRunning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const lookup = (promptType, referenceId = null) =>
    findExistingPrompt(prompts, { einheitId, promptType, referenceId });

  // Plan einmal pro relevanter Datenänderung berechnen — wird sowohl vom
  // Preview-Modal als auch vom Markdown-Export gelesen.
  const plan = useMemo(
    () => {
      if (!einheit) return [];
      return buildBulkPlan({
        einheitId,
        einheit,
        stammdaten,
        themenfelder,
        lernpakete,
        lernziele,
        aufgabenbausteine,
        allgemeineAufgaben,
        allgemeineAufgabenEbene23,
        prompts,
        tsIndex,
      });
    },
    [einheitId, einheit, stammdaten, themenfelder, lernpakete, lernziele, aufgabenbausteine, allgemeineAufgaben, allgemeineAufgabenEbene23, prompts, tsIndex]
  );

  const planSummary = useMemo(() => {
    let willWrite = 0, skipCustomized = 0, skipBlocked = 0;
    for (const it of plan) {
      if (it.status === 'new' || it.status === 'update') willWrite += 1;
      else if (it.status === 'skip-customized') skipCustomized += 1;
      else if (it.status === 'skip-blocked') skipBlocked += 1;
    }
    return { willWrite, skipCustomized, skipBlocked, total: plan.length };
  }, [plan]);

  // Bulk-Run via Backend-Funktion (1 Roundtrip).
  // Fallback: wenn die Backend-Funktion (noch) nicht verfügbar ist, gehen
  // wir auf sequentielle upserts zurück — robust für lokale Dev-Setups.
  const runBulk = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    try {
      const items = planToWritePayload(plan);
      if (items.length === 0) {
        toast.info('Nichts zu tun: alle Prompts sind aktuell oder manuell angepasst/blockiert.');
        return;
      }
      let backendOk = false;
      try {
        const res = await base44.functions.invoke('bulkUpsertExportPrompts', {
          einheit_id: einheitId,
          items,
        });
        const data = res?.data || res; // axios-style wrapper toleriert
        if (data && (data.created !== undefined || data.updated !== undefined)) {
          backendOk = true;
          const { created = 0, updated = 0, errors = [] } = data;
          toast.success(
            `${created + updated} Prompts geschrieben (${created} neu, ${updated} aktualisiert)` +
            (errors.length > 0 ? ` · ${errors.length} Fehler` : '')
          );
        }
      } catch (err) {
        console.warn('[MBK Bulk] Backend-Bulk fehlgeschlagen, falle auf sequentielle Upserts zurück:', err);
      }
      if (!backendOk) {
        // Fallback: sequenziell über den vorhandenen upsert-Hook.
        let processed = 0;
        for (const it of plan) {
          if (it.status !== 'new' && it.status !== 'update') continue;
          await upsert({
            promptType: it.promptType,
            referenceId: it.referenceId,
            content: it.buildContent(),
            isCustomized: false,
            sourceUpdatedAt: new Date(it.sourceMaxTs || Date.now()).toISOString(),
          });
          processed += 1;
        }
        toast.success(`${processed} Prompt${processed === 1 ? '' : 's'} generiert.`);
      }
    } catch (e) {
      toast.error('Bulk-Generierung fehlgeschlagen: ' + (e?.message || 'unbekannt'));
    } finally {
      setBulkRunning(false);
      setPreviewOpen(false);
    }
  };

  // Markdown-Bundle als Download.
  const exportMarkdown = () => {
    const md = buildMarkdownBundle({ einheit, items: plan });
    const safeTitle = (einheit?.titel_der_einheit || 'einheit')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .slice(0, 60);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mbk-prompts-${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Markdown-Datei mit allen Prompts heruntergeladen.');
  };

  const computeMaxTs = (promptType, referenceId = null) =>
    lookupSourceMaxTimestampFromIndex(tsIndex, promptType, referenceId);

  return {
    bulkRunning,
    runBulk,
    previewOpen,
    setPreviewOpen,
    plan,
    planSummary,
    exportMarkdown,
    lookupPrompt: lookup,
    computeMaxTs,
    isPromptOutOfSync,
    isErstellungspaketBlocked,
  };
}