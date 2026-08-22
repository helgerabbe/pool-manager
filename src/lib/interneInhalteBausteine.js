/**
 * interneInhalteBausteine.js
 *
 * Welche System-Bausteine kann der Pool-Manager VORAB inhaltlich erzeugen
 * (= als SchuelerInhaltSnapshot ablegen), und welche sind reine Struktur-
 * Elemente, deren Seite erst die MBK aus der `export_instruktion` baut?
 *
 * Diese Liste MUSS mit der Map KI_BAUSTEINE in
 * base44/functions/generateInterneInhalte/entry.ts übereinstimmen — sonst
 * zählt das Export-Center Inhalte als „fehlend", die kein Generator erzeugen
 * kann (der Zähler bliebe für immer rot).
 */
export const VORAB_ERZEUGBARE_BAUSTEINE = ['sys_themenfeld_intro'];

export function istVorabErzeugbar(bausteinId) {
  return VORAB_ERZEUGBARE_BAUSTEINE.includes(bausteinId);
}