/**
 * AktivitaetService.js
 *
 * Service-Layer für LernpaketPhaseAktivitaet und AktivitaetenKatalog.
 * Einzige Datei, die base44Client für Aktivitäten importieren darf.
 * Bei einer Migration (z.B. zu Supabase) wird nur diese Datei angepasst.
 */

import { base44 } from '@/api/base44Client';

// ── AktivitaetenKatalog (globale Referenzdaten) ───────────────────────────────

/**
 * Alle Aktivitäten aus dem Katalog laden (Referenzdaten / selten geändert).
 */
export async function getAktivitaetenKatalog() {
  return base44.entities.AktivitaetenKatalog.list();
}

// ── LernpaketPhaseAktivitaet (Instanzen pro Lernpaket) ───────────────────────

/**
 * Alle Phasen-Aktivitäten laden (global, für Workspace-Baum).
 */
export async function getAllLernpaketAktivitaeten() {
  return base44.entities.LernpaketPhaseAktivitaet.list();
}

/**
 * Alle Phasen-Aktivitäten eines bestimmten Lernpakets laden,
 * sortiert nach reihenfolge.
 *
 * Bei masterfähigen Aktivitäten (supports_master) liegen die eigentlichen
 * Inhalte (z. B. instruction / orderedItems bei „Reihenfolge / Sortierung")
 * NICHT in `field_values` der Aktivität, sondern in einer verknüpften
 * MasterAufgabe (activity_id → Aktivität). Für die Schüleransicht ziehen wir
 * daher die MasterAufgaben des Lernpakets nach und reichern Aktivitäten, deren
 * eigene `field_values` leer sind, mit den `field_values` ihrer (ersten,
 * freigegebenen) MasterAufgabe an. So sieht der Schüler die hinterlegten Inhalte.
 */
export async function getAktivitaetenByLernpaket(lernpaketId) {
  const [aktivitaeten, masterAufgaben] = await Promise.all([
    base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lernpaketId }),
    base44.entities.MasterAufgabe.filter({ lernpaket_id: lernpaketId }),
  ]);

  // activity_id → MasterAufgaben (nach reihenfolge sortiert, erste gewinnt).
  const masterByActivity = new Map();
  masterAufgaben
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
    .forEach((m) => {
      if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, m);
    });

  const angereichert = aktivitaeten.map((akt) => {
    const eigeneFv = akt.field_values || {};
    const hatEigeneInhalte = Object.keys(eigeneFv).length > 0;
    if (hatEigeneInhalte) return akt;
    const master = masterByActivity.get(akt.id);
    if (master?.field_values && Object.keys(master.field_values).length > 0) {
      return { ...akt, field_values: master.field_values };
    }
    return akt;
  });

  return angereichert.sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
}

/**
 * Neue Phasen-Aktivität anlegen.
 */
export async function createAktivitaet(data) {
  return base44.entities.LernpaketPhaseAktivitaet.create(data);
}

/**
 * Phasen-Aktivität aktualisieren (z.B. field_values, is_complete, content_status).
 */
export async function updateAktivitaet(id, data) {
  return base44.entities.LernpaketPhaseAktivitaet.update(id, data);
}

/**
 * Phasen-Aktivität löschen.
 */
export async function deleteAktivitaet(id) {
  return base44.entities.LernpaketPhaseAktivitaet.delete(id);
}

/**
 * Reihenfolge mehrerer Aktivitäten in einem Lernpaket aktualisieren.
 * Erwartet ein Array von { id, reihenfolge }.
 * HINWEIS: Base44 hat keine bulkUpdate-API – wir parallelisieren die Einzelupdates.
 */
export async function reorderAktivitaeten(updates) {
  return Promise.all(
    updates.map(({ id, reihenfolge }) =>
      base44.entities.LernpaketPhaseAktivitaet.update(id, { reihenfolge })
    )
  );
}