/**
 * shared/pruefungKI.js
 *
 * Prüfstufe B der Vollständigkeitsprüfung: inhaltliche Durchsicht durch die KI
 * (Anthropic/Claude). Die mechanische Stufe A findet leere Felder und
 * Platzhalter; hier geht es um das, was nur beim Lesen auffällt:
 *   2 Arbeitsauftrag unklar oder nicht bearbeitbar
 *   3 Erwartungshorizont fehlt oder trägt nicht
 *   4 Rückmeldeweg nicht entschieden
 *   5 Material und Text nicht schülertauglich
 *
 * Kategorie 1 bleibt bewusst der mechanischen Stufe vorbehalten — dafür braucht
 * niemand ein Sprachmodell. Findet die KI nichts, entstehen keine Befunde.
 */

import { askAnthropicJson } from './anthropicClient.js';

const SYSTEM = `Du prüfst Unterrichtsmaterial einer Schule daraufhin, ob Schülerinnen und Schüler es selbstständig bearbeiten können.
Du meldest NUR echte Probleme in genau diesen vier Kategorien:
2 = Arbeitsauftrag unklar oder nicht bearbeitbar
3 = Erwartungshorizont fehlt oder trägt nicht (die Lösung/Messlatte fehlt oder passt nicht zur Aufgabe)
4 = Rückmeldeweg nicht entschieden (unklar, wie die Lernenden erfahren, ob es richtig war)
5 = Material und Text nicht schülertauglich (zu lang, zu schwer, unverständlich, fehlender Bezug)

Regeln:
- Sei streng mit echten Hürden und großzügig mit Kleinigkeiten. Keine Stilkritik, keine Verbesserungswünsche.
- Leere Felder meldest du NICHT (das prüft ein anderer Schritt).
- Pro Stelle höchstens zwei Befunde.
- "befund": ein Satz, was nicht trägt, mit kurzem Zitat der Stelle.
- "vorschlag": ein Satz, was die Lehrkraft konkret tun kann.
- "schwere": "blockiert" (nicht bearbeitbar), "stoert" (bearbeitbar, aber Rückmeldung/Lernen leidet) oder "hinweis".
- Antworte AUSSCHLIESSLICH mit JSON: {"ergebnisse":[{"ref":"<ref>","befunde":[{"kategorie":2,"schwere":"stoert","befund":"…","vorschlag":"…"}]}]}
- Stellen ohne Problem lässt du weg.`;

/**
 * @param {object} cfg   Anthropic-Konfiguration (getAnthropicConfig)
 * @param {Array}  stellen [{ ref, art, titel, inhalt }]
 * @returns {Promise<Map<string, Array>>} ref → Kandidaten [{kategorie, schwere, befund, vorschlag}]
 */
export async function pruefeStellenMitKI(cfg, stellen) {
  const ergebnis = new Map();
  if (!cfg?.aktiv || stellen.length === 0) return ergebnis;

  const prompt = `Prüfe die folgenden Stellen einer Unterrichtseinheit.\n\n${JSON.stringify(
    stellen.map((s) => ({ ref: s.ref, art: s.art, titel: s.titel, inhalt: s.inhalt })),
    null,
    1
  )}`;

  const data = await askAnthropicJson(cfg, { system: SYSTEM, prompt, maxTokens: 4000 });
  for (const item of data?.ergebnisse || []) {
    const kandidaten = (item?.befunde || [])
      .filter((b) => [2, 3, 4, 5].includes(Number(b?.kategorie)) && b?.befund)
      .slice(0, 2)
      .map((b) => ({
        kategorie: Number(b.kategorie),
        schwere: ['blockiert', 'stoert', 'hinweis'].includes(b.schwere) ? b.schwere : 'hinweis',
        befund: String(b.befund).slice(0, 600),
        vorschlag: String(b.vorschlag || '').slice(0, 400),
      }));
    if (kandidaten.length > 0) ergebnis.set(item.ref, kandidaten);
  }
  return ergebnis;
}

/** Verdichtet beliebige Feldwerte zu einem lesbaren Text für die KI. */
export function beschreibeFeldwerte(werte, maxLaenge = 2500) {
  const teile = [];
  const gehe = (wert, pfad) => {
    if (wert === null || wert === undefined || wert === '') return;
    if (typeof wert === 'string' || typeof wert === 'number' || typeof wert === 'boolean') {
      teile.push(`${pfad}: ${String(wert).slice(0, 400)}`);
      return;
    }
    if (Array.isArray(wert)) {
      wert.slice(0, 12).forEach((w, i) => gehe(w, `${pfad}[${i + 1}]`));
      return;
    }
    for (const [k, v] of Object.entries(wert)) gehe(v, pfad ? `${pfad}.${k}` : k);
  };
  gehe(werte || {}, '');
  return teile.join('\n').slice(0, maxLaenge);
}