/**
 * sektorSignature.js
 *
 * Phase E.1 — Deterministische Hash-Berechnung über den export-relevanten
 * Inhalt eines Lernpfad-Sektors. Wird genutzt, um beim Lock
 * (`pfad_status = 'locked_for_export'`) eine Signatur einzufrieren und
 * später per Vergleich gegen die aktuelle Signatur Drift zu erkennen
 * („Inhalt seit letzter Freigabe verändert").
 *
 * ── Designprinzipien ────────────────────────────────────────────────
 *
 * 1. **Deterministisch.** Gleicher Input → gleicher Hash, immer.
 *    Wir kanonisieren JSON manuell (sortierte Keys, stabile Item-
 *    Reihenfolge gemäß Position im Sektor — Reihenfolge IST inhaltlich
 *    relevant) und verwenden eine reine, abhängigkeitsfreie 64-bit
 *    FNV-1a-Hashfunktion. Keine Web-Crypto-Calls (async, im Frontend
 *    nicht benötigt) und keine npm-Abhängigkeit.
 *
 * 2. **Nur exportrelevante Felder.** Was im Moodle-/Brian-Export landet,
 *    fließt ein. Reine UI-Metadaten (z. B. `titel_snapshot`, der bei
 *    Lock ohnehin eingefroren wird, oder UI-Sortierhilfen) werden
 *    bewusst NICHT gehasht, damit es keine False-Positive-Drift gibt.
 *
 *    Eingerechnet werden:
 *      - sektor_typ                (Strukturklassifikation)
 *      - themenfeld_id             (semantischer Anker für Arbeitsphasen)
 *      - items[]:
 *          - type                  ('aufgabe' | 'system')
 *          - ref_id                (FK auf Aufgabe oder System-Baustein)
 *          - parent_instance_id    (Bündel-Hierarchie)
 *          - bundle_config         (erforderliche_anzahl, modus) — falls vorhanden
 *
 *    NICHT eingerechnet:
 *      - sektor_id, instance_id    (UUIDs sind reine Identifier; ein
 *        Item-Move zwischen Sektoren wird über Reihenfolgewechsel
 *        innerhalb der Sektoren ohnehin sichtbar)
 *      - titel, titel_snapshot     (Anzeigetext, kein Inhalt)
 *      - modus auf Sektor-Ebene    (laut Schema fix 'sequenziell')
 *      - Felder der referenzierten Aufgabe selbst — Aufgaben-Drift
 *        läuft separat über `geprueft_snapshot_updated_date` der
 *        Membership.
 *
 * 3. **Pro Sektor, gespeichert pro Membership.** Die Signatur eines
 *    Sektors wird pro Aufgabe in der Junction-Tabelle abgelegt. Das
 *    ist eine bewusste Denormalisierung — sie macht den Drift-Vergleich
 *    in `syncLernpfadMembership` zu einer einfachen Feldgleichheits-
 *    Prüfung, ohne dass eine separate Sektor-Tabelle nötig wird.
 *
 * Die Funktion ist pure, hat keine Side-Effects und ist trivial testbar.
 */

/**
 * Stable-Stringify mit sortierten Object-Keys. Arrays behalten ihre
 * Reihenfolge (Reihenfolge IST signifikant für Sektor-Items).
 */
function canonicalize(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return (
      '{' +
      keys
        .map((k) => JSON.stringify(k) + ':' + canonicalize(value[k]))
        .join(',') +
      '}'
    );
  }
  // Fallback (z. B. Symbol, Function — sollte hier nie auftreten).
  return 'null';
}

/**
 * 64-bit FNV-1a, ausgegeben als 16-Zeichen-Hex-String.
 * Reicht für Drift-Erkennung locker aus (Kollisionsraum 2^64) und
 * benötigt keine Web-Crypto-API.
 */
function fnv1a64Hex(str) {
  // FNV-Offset-Basis und -Prime als BigInt (64-bit).
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Reduziert ein Sektor-Item auf die für den Export relevanten Felder.
 * `bundle_config` wird nur eingerechnet, wenn tatsächlich gesetzt —
 * sonst würden zwei strukturell gleiche Bündel mit/ohne explizit
 * gesetzten Defaults unterschiedliche Hashes erzeugen.
 */
function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  const out = {
    type: item.type ?? null,
    ref_id: item.ref_id ?? null,
    parent_instance_id: item.parent_instance_id ?? null,
  };
  const bc = item.bundle_config;
  if (bc && typeof bc === 'object') {
    const bcOut = {};
    if (typeof bc.erforderliche_anzahl === 'number') {
      bcOut.erforderliche_anzahl = bc.erforderliche_anzahl;
    }
    if (typeof bc.modus === 'string') {
      bcOut.modus = bc.modus;
    }
    if (Object.keys(bcOut).length > 0) out.bundle_config = bcOut;
  }
  return out;
}

/**
 * Normalisiert einen Sektor auf seine exportrelevanten Felder.
 * Export-only: `sektor_typ`, `themenfeld_id`, `items[]` (in Reihenfolge,
 * aber pro Item nur normalisierte Felder).
 */
export function normalizeSektorForSignature(sektor) {
  if (!sektor || typeof sektor !== 'object') return { sektor_typ: null, themenfeld_id: null, items: [] };
  const items = Array.isArray(sektor.items) ? sektor.items : [];
  return {
    sektor_typ: sektor.sektor_typ ?? null,
    themenfeld_id: sektor.themenfeld_id ?? null,
    items: items.map(normalizeItem).filter(Boolean),
  };
}

/**
 * Berechnet die Signature eines Sektors als 16-Zeichen-Hex-String.
 * Pure Funktion — gleicher Input liefert immer denselben Output.
 */
export function computeSektorSignature(sektor) {
  const normalized = normalizeSektorForSignature(sektor);
  const canonical = canonicalize(normalized);
  return fnv1a64Hex(canonical);
}

/**
 * Komfort-Helfer: berechnet alle Sektor-Signaturen einer
 * lernpfade_konfiguration für einen bestimmten Lerntyp und gibt
 * eine Map<sektor_id, signature> zurück. Wird beim Lock
 * (`setLernpfadStatus`) genutzt, um pro Membership die Signatur des
 * jeweiligen Sektors einzufrieren.
 */
export function computeSektorSignaturesForLerntyp(konfiguration, lerntyp) {
  const out = new Map();
  const sektoren = Array.isArray(konfiguration?.[lerntyp]) ? konfiguration[lerntyp] : [];
  for (const sektor of sektoren) {
    if (!sektor?.sektor_id) continue;
    out.set(sektor.sektor_id, computeSektorSignature(sektor));
  }
  return out;
}