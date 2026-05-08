/**
 * systemContextHash.js
 *
 * Berechnet einen deterministischen 16-Zeichen-Fingerprint über das gesamte
 * C-Global-Regelwerk der MBK-Integration:
 *   - Schul-Stammdaten (Land, Bundesland, Schulform)
 *   - Schul-Nomenklatur (pro Fach: conventions + global_style)
 *   - aktive globale MBK-Prompts (Mission, Lerntypen, Operatoren, Wortlimits, Guardrails …)
 *
 * Verwendung im exportierten C-Global-Payload als `meta.system_context_hash`.
 * Sobald sich irgendetwas am Regelwerk ändert (Convention bearbeitet,
 * Prompt deaktiviert, Stammdaten geändert), kippt der Hash → die MBK
 * verwirft ihren gecachten System-Prompt und lädt neu.
 *
 * Designprinzipien:
 *  - **Reine Funktion.** Keine I/O, keine Side-Effects, deterministisch.
 *  - **Sortier-stabil.** Reihenfolge der Conventions/Prompts darf den Hash
 *    NICHT ändern — sonst würde ein simples Reorder im UI eine
 *    MBK-Cache-Invalidation auslösen, ohne dass sich inhaltlich etwas
 *    geändert hat.
 *  - **Inhalts-sensitiv.** Jede inhaltliche Änderung (auch nur ein Komma
 *    in einer Convention) MUSS den Hash kippen.
 *  - **Browser- und Deno-tauglich.** Keine Node-spezifischen APIs.
 *
 * Hash-Algorithmus: FNV-1a-64 als 16-Zeichen-Hex.
 * Wir verwenden bewusst FNV statt SHA-1, weil die Funktion synchron sein
 * muss (sonst kann sie nicht in deterministischen Build-Ketten und Tests
 * ohne async-Wrapping verwendet werden). Für ein Cache-Invalidations-
 * Token ist Kollisionsresistenz auf Crypto-Niveau nicht erforderlich.
 */

// FNV-1a-64-Konstanten als BigInt (JS unterstützt 64-Bit-Integer nur via BigInt).
const FNV_PRIME_64 = 1099511628211n;
const FNV_OFFSET_64 = 14695981039346656037n;
const MASK_64 = 0xffffffffffffffffn;

function fnv1a64Hex(str) {
  let hash = FNV_OFFSET_64;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV_PRIME_64) & MASK_64;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Stabile Stringifizierung: sortiert Object-Keys, behandelt undefined als
 * "Feld fehlt" (statt JSON-undefined-Drop), normalisiert leere Strings/Arrays.
 */
function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return 'null';
}

/**
 * Normalisiert eine Liste von Conventions: trimmt key/value, droppt leere
 * Einträge, sortiert nach key (case-insensitive).
 */
function normalizeConventions(conventions) {
  if (!Array.isArray(conventions)) return [];
  return conventions
    .map((c) => ({
      key: typeof c?.key === 'string' ? c.key.trim() : '',
      value: typeof c?.value === 'string' ? c.value.trim() : '',
    }))
    .filter((c) => c.key && c.value)
    .sort((a, b) => a.key.toLowerCase().localeCompare(b.key.toLowerCase()));
}

/**
 * Normalisiert die Schul-Nomenklatur-Records zu einem nach Fach sortierten
 * Map-Objekt. Inaktive Fächer (`ist_aktiv === false`) und Fächer ohne
 * Inhalt (weder Conventions noch global_style) werden weggelassen.
 */
function normalizeNomenklatur(records) {
  if (!Array.isArray(records)) return {};
  const result = {};
  for (const r of records) {
    if (!r || r.ist_aktiv === false) continue;
    const fach = typeof r.fach === 'string' ? r.fach.trim() : '';
    if (!fach) continue;
    const conventions = normalizeConventions(r.conventions);
    const globalStyle = typeof r.global_style === 'string' ? r.global_style.trim() : '';
    if (conventions.length === 0 && !globalStyle) continue;
    result[fach] = { conventions, global_style: globalStyle };
  }
  return result;
}

/**
 * Normalisiert die aktiven globalen MBK-Prompts: filtert Inaktive raus,
 * extrahiert nur die hash-relevanten Felder, sortiert nach Schlüssel.
 */
function normalizeGlobalPrompts(prompts) {
  if (!Array.isArray(prompts)) return [];
  return prompts
    .filter((p) => p && p.ist_aktiv !== false)
    .map((p) => ({
      schluessel: typeof p.schluessel === 'string' ? p.schluessel : '',
      prompt_text: typeof p.prompt_text === 'string' ? p.prompt_text : '',
    }))
    .filter((p) => p.schluessel)
    .sort((a, b) => a.schluessel.localeCompare(b.schluessel));
}

/**
 * Normalisiert die Schul-Stammdaten auf die hash-relevanten Felder.
 */
function normalizeStammdaten(stammdaten) {
  return {
    land: typeof stammdaten?.land === 'string' ? stammdaten.land.trim() : '',
    bundesland: typeof stammdaten?.bundesland === 'string' ? stammdaten.bundesland.trim() : '',
    schulform: typeof stammdaten?.schulform === 'string' ? stammdaten.schulform.trim() : '',
  };
}

/**
 * Hauptfunktion: berechnet den 16-stelligen Hex-Hash über das
 * normalisierte Regelwerk.
 *
 * @param {object} input
 * @param {object} input.stammdaten        — { land, bundesland, schulform }
 * @param {Array}  input.schulNomenklatur  — SchulNomenklatur[]
 * @param {Array}  input.globalPrompts     — MBKGlobalPrompt[]
 * @returns {string} 16-Zeichen-Hex-Hash
 */
export function computeSystemContextHash({ stammdaten, schulNomenklatur, globalPrompts } = {}) {
  const normalized = {
    stammdaten: normalizeStammdaten(stammdaten),
    schul_nomenklatur: normalizeNomenklatur(schulNomenklatur),
    global_prompts: normalizeGlobalPrompts(globalPrompts),
  };
  return fnv1a64Hex(stableStringify(normalized));
}

// Interne Helpers werden für Tests exportiert. Nicht für Anwendungscode.
export const __test__ = {
  fnv1a64Hex,
  stableStringify,
  normalizeConventions,
  normalizeNomenklatur,
  normalizeGlobalPrompts,
  normalizeStammdaten,
};