/**
 * lernpfadeUtils.js
 *
 * Reine Helfer für das Lernpfad-Cockpit (Tab 7).
 * Single Source of Truth für die "ist Aufgabe bereits in einem Pfad?"-Logik.
 *
 * Datenstruktur (lernpfade_konfiguration[lernTyp]):
 *   [
 *     {
 *       sektor_id, titel, modus,
 *       items: [
 *         { type: 'aufgabe', ref_id: 'uuid-123' },
 *         { type: 'system',  ref_id: 'sys_diagnose' },
 *       ]
 *     },
 *     ...
 *   ]
 *
 * ── LAZY MIGRATION ──────────────────────────────────────────────────────────
 * Bestandsdaten verwenden noch das alte Format `aufgaben_ids: ['uuid-123']`.
 * Jeder lesende & schreibende Helper normalisiert eingehende Sektoren über
 * `normalizeSektor`. Das alte Feld wird beim Schreiben weggelassen, sodass
 * Datensätze beim ersten Update organisch ins neue Format migriert werden.
 * → Kein Big-Bang-Migrationsskript nötig.
 *
 * Anti-Duplikat-Logik berücksichtigt strikt nur Items mit type === 'aufgabe';
 * System-Bausteine sind globale Platzhalter und dürfen mehrfach vorkommen.
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

// ── Normalisierung (Lazy Migration) ─────────────────────────────────────────

/**
 * Normalisiert einen einzelnen Item-Eintrag.
 * - String → { type: 'aufgabe', ref_id: <string> }   (Legacy)
 * - Objekt → unverändert (sofern Felder vorhanden)
 * - Ungültiges → null (vom Aufrufer zu filtern)
 */
export function normalizeItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') {
    return item ? { type: ITEM_TYPE.AUFGABE, ref_id: item } : null;
  }
  if (typeof item === 'object' && item.ref_id) {
    return {
      type: item.type === ITEM_TYPE.SYSTEM ? ITEM_TYPE.SYSTEM : ITEM_TYPE.AUFGABE,
      ref_id: item.ref_id,
    };
  }
  return null;
}

/**
 * Normalisiert einen Sektor: bevorzugt `items`, fällt sonst auf `aufgaben_ids`
 * zurück. Liefert IMMER ein Objekt mit `items` und OHNE `aufgaben_ids`.
 */
export function normalizeSektor(sektor) {
  const safe = sektor || {};
  const rawItems = Array.isArray(safe.items)
    ? safe.items
    : Array.isArray(safe.aufgaben_ids)
      ? safe.aufgaben_ids
      : [];

  // aufgaben_ids gezielt droppen – beim nächsten Save wandert nur noch `items` in die DB.
  const { aufgaben_ids: _legacy, ...rest } = safe;

  return {
    ...rest,
    items: rawItems.map(normalizeItem).filter(Boolean),
  };
}

/**
 * Normalisiert die komplette Sektor-Liste eines Lerntyps.
 */
function normalizeSektoren(sektoren) {
  return (sektoren || []).map(normalizeSektor);
}

// ── Read-Helpers ────────────────────────────────────────────────────────────

/**
 * Liefert ein Set aller Aufgaben-`ref_id`s, die im angegebenen Lerntyp bereits
 * in irgendeinem Sektor verwendet werden.
 *
 * Berücksichtigt strikt nur Items mit type === 'aufgabe'. System-Bausteine
 * sind globale Platzhalter und fließen NICHT in die Anti-Duplikat-Prüfung ein.
 *
 * Rückgabetyp: Set<string> von ref_ids – kompatibel zur bestehenden Pool-UI,
 * die `usedAufgabenIds.has(aufgabe.id)` aufruft.
 */
export function getUsedAufgabenIds(konfiguration, lernTyp) {
  const sektoren = normalizeSektoren(konfiguration?.[lernTyp]);
  const used = new Set();
  for (const s of sektoren) {
    for (const it of s.items) {
      if (it.type === ITEM_TYPE.AUFGABE && it.ref_id) used.add(it.ref_id);
    }
  }
  return used;
}

/**
 * Convenience-Check: Ist die Aufgabe (per ref_id) bereits im aktuellen Pfad?
 */
export function isAufgabeInLernpfad(konfiguration, lernTyp, aufgabeId) {
  return getUsedAufgabenIds(konfiguration, lernTyp).has(aufgabeId);
}

// ── Sektor-Helfer ──────────────────────────────────────────────────────────

/**
 * Erzeugt eine zufällige UUID. Fällt auf Math.random zurück, falls
 * crypto.randomUUID nicht verfügbar ist (alte Browser, SSR).
 */
function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Default-Sektor im neuen Format.
 *
 * Backwards-Compat: Wenn ein Aufrufer noch `aufgaben_ids` als Override mitgibt
 * (z. B. Quick-Add-Pfad), wird das beim Anlegen sofort zu `items` normalisiert.
 */
export function createNewSektor(overrides = {}) {
  const base = {
    sektor_id: `sec_${uuid()}`,
    titel: 'Neuer Sektor',
    modus: 'sequenziell',
    items: [],
  };
  return normalizeSektor({ ...base, ...overrides });
}

/**
 * Liefert die normalisierte Sektor-Liste eines Lerntyps.
 */
function getSektoren(konfig, lernTyp) {
  return normalizeSektoren(konfig?.[lernTyp]);
}

/**
 * Schreibt eine geänderte Sektor-Liste zurück in die Konfiguration.
 */
function setSektoren(konfig, lernTyp, sektoren) {
  return { ...konfig, [lernTyp]: sektoren };
}

// ── Schreibende Operationen ────────────────────────────────────────────────

/**
 * Sektor anhängen.
 */
export function addSektor(konfig, lernTyp, sektor = createNewSektor()) {
  return setSektoren(konfig, lernTyp, [...getSektoren(konfig, lernTyp), normalizeSektor(sektor)]);
}

/**
 * Beliebige Felder eines Sektors patchen (Titel, Modus, …).
 * Patch wird auf das normalisierte Sektor-Objekt angewandt.
 */
export function patchSektor(konfig, lernTyp, sektorId, patch) {
  const next = getSektoren(konfig, lernTyp).map((s) =>
    s.sektor_id === sektorId ? normalizeSektor({ ...s, ...patch }) : s
  );
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Sektor entfernen (samt aller darin enthaltenen Items).
 */
export function removeSektor(konfig, lernTyp, sektorId) {
  const next = getSektoren(konfig, lernTyp).filter((s) => s.sektor_id !== sektorId);
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Aufgabe an einer bestimmten Position in einen Sektor einfügen.
 * Falls aufgabeId bereits in irgendeinem Sektor des Lerntyps vorkommt
 * (Anti-Duplikat) → unverändert zurückgeben.
 *
 * NB: Diese Funktion arbeitet ausschließlich mit Aufgaben-Items.
 * Für System-Bausteine siehe `insertSystemBausteinInSektor`.
 */
export function insertAufgabeInSektor(konfig, lernTyp, sektorId, aufgabeId, index) {
  if (!aufgabeId) return konfig;
  if (getUsedAufgabenIds(konfig, lernTyp).has(aufgabeId)) return konfig;

  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const items = [...s.items];
    const insertAt = typeof index === 'number' && index >= 0 && index <= items.length ? index : items.length;
    items.splice(insertAt, 0, { type: ITEM_TYPE.AUFGABE, ref_id: aufgabeId });
    return { ...s, items };
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * System-Baustein an einer bestimmten Position in einen Sektor einfügen.
 *
 * WICHTIG: Hier greift die Anti-Duplikat-Sperre ABSICHTLICH NICHT.
 * System-Bausteine sind globale Platzhalter (z. B. „Lehrer-Check") und dürfen
 * mehrfach in beliebig vielen Sektoren des gleichen Lerntyps vorkommen.
 */
export function insertSystemBausteinInSektor(konfig, lernTyp, sektorId, bausteinId, index) {
  if (!bausteinId) return konfig;

  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const items = [...s.items];
    const insertAt = typeof index === 'number' && index >= 0 && index <= items.length ? index : items.length;
    items.splice(insertAt, 0, { type: ITEM_TYPE.SYSTEM, ref_id: bausteinId });
    return { ...s, items };
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Aufgabe komplett aus einem Lerntyp entfernen (sucht in allen Sektoren).
 * Entfernt nur Aufgaben-Items; System-Bausteine bleiben unangetastet, selbst
 * wenn deren ref_id zufällig identisch wäre.
 */
export function removeAufgabeFromLernTyp(konfig, lernTyp, aufgabeId) {
  const next = getSektoren(konfig, lernTyp).map((s) => ({
    ...s,
    items: s.items.filter((it) => !(it.type === ITEM_TYPE.AUFGABE && it.ref_id === aufgabeId)),
  }));
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Sektoren von einem Lerntyp in einen anderen kopieren (Deep Clone).
 * - Generiert frische sektor_id pro Sektor (verhindert React-Key-Kollisionen).
 * - Übernimmt nur titel, modus, items (keine internen Flags).
 * - Item-Objekte werden flach geklont (frische Referenzen).
 * - Überschreibt die Sektor-Liste des Ziel-Lerntyps komplett.
 */
export function copySektorenBetweenLernTypen(konfig, fromLernTyp, toLernTyp) {
  if (fromLernTyp === toLernTyp) return konfig;
  const source = getSektoren(konfig, fromLernTyp);
  const cloned = source.map((s) => ({
    sektor_id: `sec_${uuid()}`,
    titel: s.titel || 'Neuer Sektor',
    modus: s.modus || 'sequenziell',
    items: s.items.map((it) => ({ type: it.type, ref_id: it.ref_id })),
  }));
  return setSektoren(konfig, toLernTyp, cloned);
}

/**
 * Item innerhalb eines Sektors umsortieren oder zwischen zwei Sektoren des
 * gleichen Lerntyps verschieben. Reine Reihenfolge-Operation – führt keine
 * Duplikat-Prüfung durch (es wird ja kein neues Item hinzugefügt).
 *
 * Funktioniert für Aufgaben- UND System-Items gleichermaßen.
 */
export function moveAufgabe(konfig, lernTyp, fromSektorId, fromIndex, toSektorId, toIndex) {
  const sektoren = getSektoren(konfig, lernTyp);
  const fromSektor = sektoren.find((s) => s.sektor_id === fromSektorId);
  if (!fromSektor) return konfig;
  const movedItem = fromSektor.items[fromIndex];
  if (!movedItem) return konfig;

  const next = sektoren.map((s) => {
    // Source = Target → Reorder innerhalb einer Liste.
    if (fromSektorId === toSektorId && s.sektor_id === fromSektorId) {
      const items = [...s.items];
      items.splice(fromIndex, 1);
      const insertAt = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= items.length ? toIndex : items.length;
      items.splice(insertAt, 0, movedItem);
      return { ...s, items };
    }
    if (s.sektor_id === fromSektorId) {
      const items = [...s.items];
      items.splice(fromIndex, 1);
      return { ...s, items };
    }
    if (s.sektor_id === toSektorId) {
      const items = [...s.items];
      const insertAt = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= items.length ? toIndex : items.length;
      items.splice(insertAt, 0, movedItem);
      return { ...s, items };
    }
    return s;
  });
  return setSektoren(konfig, lernTyp, next);
}