/**
 * einheitMoodleSyncStatus.js
 *
 * Berechnet den Moodle-Sync-Status einer Einheit für die Export-Center-
 * Liste. Drei Zustände:
 *
 *   - 'new'         → Einheit wurde noch nie nach Moodle ver-published
 *                     (kein `export_published_at`).
 *   - 'in_sync'     → Einheit wurde published und seither hat sich nichts
 *                     im Pool-Manager an dieser Einheit geändert (weder
 *                     an der Einheit selbst, noch an ihren Themenfeldern,
 *                     Lernpaketen, Aktivitäten oder Allgemeinen Aufgaben).
 *   - 'out_of_sync' → Einheit wurde published, aber irgendwo unter ihr
 *                     wurde nach `export_published_at` etwas geändert.
 *
 * Reine Funktion — keine Side-Effects, keine Netzwerkaufrufe.
 */

/**
 * @param {object} args
 * @param {object} args.einheit                    Die Einheit (mit export_published_at, updated_date)
 * @param {Array}  [args.themenfelder]             Themenfelder dieser Einheit
 * @param {Array}  [args.lernpakete]               Lernpakete dieser Einheit
 * @param {Array}  [args.phaseAktivitaeten]        Aktivitäten der Lernpakete dieser Einheit
 * @param {Array}  [args.allgemeineAufgaben]       Allgemeine Aufgaben dieser Einheit
 * @param {Array}  [args.masterAufgaben]           Master-Aufgaben (optional)
 * @returns {'new' | 'in_sync' | 'out_of_sync'}
 */
export function computeEinheitMoodleSyncStatus({
  einheit,
  themenfelder = [],
  lernpakete = [],
  phaseAktivitaeten = [],
  allgemeineAufgaben = [],
  masterAufgaben = [],
}) {
  if (!einheit) return 'new';
  const publishedAt = einheit.export_published_at;
  if (!publishedAt) return 'new';

  const publishedTs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTs)) return 'new';

  const sources = [
    einheit.updated_date,
    ...themenfelder.map((x) => x.updated_date),
    ...lernpakete.map((x) => x.updated_date),
    ...phaseAktivitaeten.map((x) => x.updated_date),
    ...allgemeineAufgaben.map((x) => x.updated_date),
    ...masterAufgaben.map((x) => x.updated_date),
  ];

  for (const ts of sources) {
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (!Number.isNaN(t) && t > publishedTs) {
      return 'out_of_sync';
    }
  }
  return 'in_sync';
}