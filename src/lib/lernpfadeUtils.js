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
import { LEGACY_BAUSTEIN_ALIAS } from '@/lib/dashboardTemplates';

// ── Normalisierung (Lazy Migration) ─────────────────────────────────────────

/**
 * Normalisiert einen einzelnen Item-Eintrag.
 *
 * Schema-Versionen (siehe Einheiten.json / Logbuch §18):
 *   - v1 (Legacy):  String oder { type, ref_id }
 *   - v2 (Phase 1): { instance_id, type, ref_id, parent_instance_id }
 *
 * Diese Funktion akzeptiert beide Formen und liefert IMMER ein v2-Objekt
 * zurück. Fehlende instance_id wird live ergänzt (Lazy-Migration im
 * Frontend für Edge-Cases, in denen der One-shot Backfill noch nicht
 * gelaufen ist). Fehlendes parent_instance_id wird auf null gesetzt.
 */
function freshInstanceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `inst_${crypto.randomUUID()}`;
  }
  return `inst_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeItem(item) {
  if (item == null) return null;
  if (typeof item === 'string') {
    return item
      ? {
          instance_id: freshInstanceId(),
          type: ITEM_TYPE.AUFGABE,
          ref_id: item,
          parent_instance_id: null,
        }
      : null;
  }
  if (typeof item === 'object' && item.ref_id) {
    return {
      instance_id: item.instance_id || freshInstanceId(),
      type: item.type === ITEM_TYPE.SYSTEM ? ITEM_TYPE.SYSTEM : ITEM_TYPE.AUFGABE,
      ref_id: item.ref_id,
      parent_instance_id: item.parent_instance_id ?? null,
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

/**
 * Liefert true, wenn die Konfiguration komplett leer ist – also für
 * KEINEN der vier Lerntypen Sektoren existieren. Wird vom Frontend für
 * den Lazy-Init-Pfad genutzt: Bestandseinheiten ohne Default-Dashboards
 * (vor dem Eager-Init-Rollout angelegt) werden beim ersten Aufruf
 * organisch mit den Standard-Templates befüllt.
 */
export function isKonfigurationEmpty(konfiguration) {
  if (!konfiguration || typeof konfiguration !== 'object') return true;
  const keys = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
  return keys.every((k) => !Array.isArray(konfiguration[k]) || konfiguration[k].length === 0);
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
 * Wendet ein statisches Dashboard-Template (siehe lib/dashboardTemplates.js)
 * auf den Lernpfad eines bestimmten Lerntyps an.
 *
 * Verhalten:
 *   - Überschreibt das Sektor-Array des angegebenen Lerntyps KOMPLETT.
 *   - Andere Lerntypen bleiben unangetastet.
 *   - Jeder Sektor erhält eine FRISCHE UUID (kritisch für DnD- und
 *     React-Key-Stabilität — Templates haben statische Demo-IDs wie
 *     "tpl_min_sec1", die sonst zwischen Lerntypen kollidieren würden).
 *   - Items werden flach geklont (frische Referenzen) und durch
 *     `normalizeItem` geschickt — schützt vor Tippfehlern in Templates.
 *
 * Bewusst NICHT in dieser Funktion:
 *   - Persistenz / Junction-Sync: Übernimmt der scheduleSave-Mechanismus
 *     im Cockpit nach setKonfiguration().
 *   - Lock-Pre-Flight: Liegt beim Aufrufer (Cockpit), weil er Zugriff
 *     auf den queryClient hat und Toasts triggern muss.
 *
 * @param {object} aktuelleKonfig - Die komplette lernpfade_konfiguration.
 * @param {string} lerntyp - 'minimalist' | 'pragmatiker' | 'ehrgeizig' | 'passioniert'.
 * @param {Array}  templateData - Array of Sektoren aus DASHBOARD_TEMPLATES[lerntyp].
 * @returns {object} Neue Konfiguration (immutable) mit überschriebenem Lerntyp.
 */
export function applyDashboardTemplate(aktuelleKonfig, lerntyp, templateData) {
  if (!lerntyp) return aktuelleKonfig;
  if (!Array.isArray(templateData)) return aktuelleKonfig;

  // Legacy-Alias: alte Baustein-IDs (z. B. `sys_landkarte`) werden auf
  // ihre V2-Entsprechung gemappt, sobald sie via Template einlaufen.
  // Bestehende Pfade von Lehrkräften werden hier NICHT verändert –
  // diese Funktion überschreibt nur den Ziel-Lerntyp mit dem Template.
  const aliasItem = (it) => {
    if (!it || it.type !== ITEM_TYPE.SYSTEM) return it;
    const mapped = LEGACY_BAUSTEIN_ALIAS[it.ref_id];
    return mapped ? { ...it, ref_id: mapped } : it;
  };

  const freshSektoren = templateData.map((sektor) => {
    const items = Array.isArray(sektor?.items)
      ? sektor.items.map(normalizeItem).filter(Boolean).map(aliasItem)
      : [];
    return {
      sektor_id: `sec_${uuid()}`,
      titel: sektor?.titel || 'Neuer Sektor',
      modus: sektor?.modus === 'frei' ? 'frei' : 'sequenziell',
      items,
    };
  });

  return setSektoren(aktuelleKonfig || {}, lerntyp, freshSektoren);
}

/**
 * Wendet die kompletten Default-Dashboards (alle vier Lerntypen) auf
 * eine Konfiguration an. Wird sowohl für den Lazy-Init-Pfad genutzt
 * (Bestandseinheiten ohne `lernpfade_konfiguration`) als auch theoretisch
 * für einen "Alle Dashboards zurücksetzen"-Button (aktuell nicht im UI).
 *
 * Erwartet ein `templates`-Objekt mit Keys minimalist/pragmatiker/
 * ehrgeizig/passioniert (z. B. `DASHBOARD_TEMPLATES`).
 */
export function applyAllDashboardTemplates(aktuelleKonfig, templates) {
  if (!templates || typeof templates !== 'object') return aktuelleKonfig;
  let next = aktuelleKonfig || {};
  for (const lerntyp of ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']) {
    if (Array.isArray(templates[lerntyp])) {
      next = applyDashboardTemplate(next, lerntyp, templates[lerntyp]);
    }
  }
  return next;
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