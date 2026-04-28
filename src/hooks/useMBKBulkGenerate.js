/**
 * useMBKBulkGenerate.js
 *
 * Bulk-Aktion für den MBK-Prompt-Generator: erzeugt/aktualisiert alle
 * Standard-Prompts einer Einheit in einem Schwung.
 *
 * Skipping-Regeln:
 *   - manuell angepasste Prompts (is_customized=true) werden übersprungen
 *   - blockierte Erstellungspakete (Quelle nicht freigegeben) werden übersprungen
 *
 * Sequenzielle Ausführung, damit der Server nicht überlastet wird und der
 * upsert-Cache zwischen den Calls konsistent bleibt.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import {
  computeSourceMaxTimestamp,
  isPromptOutOfSync,
  isErstellungspaketBlocked,
  findExistingPrompt,
  LERNTYP_KEYS,
} from '@/lib/exportPromptSync';
import {
  buildNucleusPrompt,
  buildPersonaPrompt,
  buildSektorPrompt,
  buildErstellungspaketForLernpaket,
  buildErstellungspaketForAufgabe,
} from '@/lib/exportPromptTemplates';

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
}) {
  const [bulkRunning, setBulkRunning] = useState(false);

  const lookup = (promptType, referenceId = null) =>
    findExistingPrompt(prompts, { einheitId, promptType, referenceId });

  const computeMaxTs = (promptType, referenceId = null) =>
    computeSourceMaxTimestamp({
      promptType,
      referenceId,
      einheit,
      themenfelder,
      lernpakete,
      lernziele,
      aufgabenbausteine,
      allgemeineAufgaben,
    });

  const runBulk = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    let processed = 0;
    let skipped = 0;
    try {
      const tasks = [];
      const queue = (cond, fn) => { if (cond) tasks.push(fn); else skipped += 1; };

      // Nukleus
      const nucleus = lookup('nucleus');
      const nucleusTs = computeMaxTs('nucleus');
      queue(!nucleus?.is_customized, () => upsert({
        promptType: 'nucleus',
        referenceId: null,
        content: buildNucleusPrompt({ einheit, stammdaten, themenfelder, lernpakete, lernziele }),
        isCustomized: false,
        sourceUpdatedAt: new Date(nucleusTs || Date.now()).toISOString(),
      }));

      // Persona
      const persona = lookup('persona');
      const personaTs = computeMaxTs('persona');
      queue(!persona?.is_customized, () => upsert({
        promptType: 'persona',
        referenceId: null,
        content: buildPersonaPrompt({ einheit }),
        isCustomized: false,
        sourceUpdatedAt: new Date(personaTs || Date.now()).toISOString(),
      }));

      // Sektoren (4)
      for (const lerntyp of LERNTYP_KEYS) {
        const existing = lookup('sektor_anweisung', lerntyp);
        const maxTs = computeMaxTs('sektor_anweisung', lerntyp);
        queue(!existing?.is_customized, () => upsert({
          promptType: 'sektor_anweisung',
          referenceId: lerntyp,
          content: buildSektorPrompt({ einheit, lerntyp, themenfelder }),
          isCustomized: false,
          sourceUpdatedAt: new Date(maxTs || Date.now()).toISOString(),
        }));
      }

      // Erstellungspakete: Lernpakete
      for (const lp of lernpakete) {
        const existing = lookup('erstellungspaket', lp.id);
        const blockReason = isErstellungspaketBlocked({
          referenceId: lp.id, lernpakete, allgemeineAufgaben,
        });
        const eligible = !existing?.is_customized && !blockReason;
        const maxTs = computeMaxTs('erstellungspaket', lp.id);
        const zieleDesPakets = lernziele.filter((z) => z.lernpaket_id === lp.id);
        const aufgabenDesPakets = aufgabenbausteine.filter((a) => a.lernpaket_id === lp.id);
        queue(eligible, () => upsert({
          promptType: 'erstellungspaket',
          referenceId: lp.id,
          content: buildErstellungspaketForLernpaket({
            lernpaket: lp, lernziele: zieleDesPakets, aufgaben: aufgabenDesPakets,
          }),
          isCustomized: false,
          sourceUpdatedAt: new Date(maxTs || Date.now()).toISOString(),
        }));
      }

      // Erstellungspakete: AllgemeineAufgaben Ebene 2/3
      for (const aa of allgemeineAufgabenEbene23) {
        const existing = lookup('erstellungspaket', aa.id);
        const blockReason = isErstellungspaketBlocked({
          referenceId: aa.id, lernpakete, allgemeineAufgaben,
        });
        const eligible = !existing?.is_customized && !blockReason;
        const maxTs = computeMaxTs('erstellungspaket', aa.id);
        queue(eligible, () => upsert({
          promptType: 'erstellungspaket',
          referenceId: aa.id,
          content: buildErstellungspaketForAufgabe({ aufgabe: aa }),
          isCustomized: false,
          sourceUpdatedAt: new Date(maxTs || Date.now()).toISOString(),
        }));
      }

      for (const fn of tasks) {
        await fn();
        processed += 1;
      }

      toast.success(
        `${processed} Prompt${processed === 1 ? '' : 's'} generiert${skipped > 0 ? ` · ${skipped} übersprungen (manuell angepasst oder blockiert)` : ''}.`
      );
    } catch (e) {
      toast.error('Bulk-Generierung fehlgeschlagen: ' + (e?.message || 'unbekannt'));
    } finally {
      setBulkRunning(false);
    }
  };

  // Re-Export der Hilfsfunktionen, falls die UI sie braucht (DRY).
  return {
    bulkRunning,
    runBulk,
    lookupPrompt: lookup,
    computeMaxTs,
    isPromptOutOfSync,
    isErstellungspaketBlocked,
  };
}