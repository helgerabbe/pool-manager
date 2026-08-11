/**
 * base44/shared/lernpaketDedupe.js
 *
 * Schutz gegen verdoppelte Lernpakete (Vorfall 2026-08-11, Einheit
 * "Exploring Australia"): Es gab keinen serverseitigen Schutz dagegen, dass
 * ein Lernpaket mit identischem Titel im selben Themenfeld ein zweites Mal
 * angelegt wird — z. B. durch Doppelklick, Retry nach Timeout oder einen
 * KI-/Struktur-Vorschlag, der bestehende Titel erneut vorschlägt.
 *
 * Regel: Innerhalb derselben Einheit + demselben Themenfeld darf es keine
 * zwei Lernpakete mit gleichem (normalisierten) Titel geben.
 */

const PAGE_SIZE = 500;

export function normalizeTitel(titel) {
  return String(titel || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export async function listLernpaketeOfEinheit(entity, einheit_id) {
  const all = [];
  let skip = 0;
  while (true) {
    const page = await entity.filter({ einheit_id }, 'created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

/**
 * Findet ein bestehendes Lernpaket mit gleichem Titel im selben Themenfeld.
 * @returns {object|null} das bestehende Lernpaket oder null
 */
export function findDuplicate(existingPakete, { titel, themenfeld_id }) {
  const key = normalizeTitel(titel);
  if (!key) return null;
  return (existingPakete || []).find((p) =>
    p.sync_status !== 'to_delete' &&
    (p.themenfeld_id || null) === (themenfeld_id || null) &&
    normalizeTitel(p.titel_des_pakets) === key
  ) || null;
}