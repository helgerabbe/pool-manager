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
import {
  DEFAULT_SEKTOR_TYP,
  isValidSektorTyp,
  SEKTOR_TYP,
} from '@/lib/sektorTypen';

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
    const normalized = {
      instance_id: item.instance_id || freshInstanceId(),
      type: item.type === ITEM_TYPE.SYSTEM ? ITEM_TYPE.SYSTEM : ITEM_TYPE.AUFGABE,
      ref_id: item.ref_id,
      parent_instance_id: item.parent_instance_id ?? null,
    };
    // Phase 4 + Phase A (Epic „Semantische Sektoren"): bundle_config darf nur
    // an System-Items existieren (am Bündel-Header). Für andere Items still
    // verwerfen, um Drift zu vermeiden.
    //
    // bundle_config.erforderliche_anzahl: optional (Phase 4)
    // bundle_config.modus:                'sequenziell' | 'frei' (Phase A)
    if (normalized.type === ITEM_TYPE.SYSTEM && item.bundle_config && typeof item.bundle_config === 'object') {
      const bc = {};
      const num = Number(item.bundle_config.erforderliche_anzahl);
      if (Number.isFinite(num) && num >= 1) {
        bc.erforderliche_anzahl = Math.floor(num);
      }
      const m = item.bundle_config.modus;
      if (m === 'sequenziell' || m === 'frei') {
        bc.modus = m;
      }
      if (Object.keys(bc).length > 0) {
        normalized.bundle_config = bc;
      }
    }
    return normalized;
  }
  return null;
}

/**
 * Normalisiert einen Sektor: bevorzugt `items`, fällt sonst auf `aufgaben_ids`
 * zurück. Liefert IMMER ein Objekt mit `items` und OHNE `aufgaben_ids`.
 *
 * Phase A (Epic „Semantische Sektoren"):
 *   - `sektor_typ` wird sicher gesetzt (Default: 'individuell').
 *   - `themenfeld_id` und `titel_snapshot` werden durchgereicht (default null).
 *   - `modus` wird HART auf 'sequenziell' fixiert. Das Feld bleibt im Schema
 *     für Export-Konsistenz, ist aber UI-seitig nicht mehr veränderbar.
 *     Bündel-Modus lebt jetzt in `item.bundle_config.modus`.
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

  const sektorTyp = isValidSektorTyp(rest.sektor_typ) ? rest.sektor_typ : DEFAULT_SEKTOR_TYP;
  // themenfeld_id ist nur bei Arbeitsphase semantisch sinnvoll. Für andere Typen
  // wird es defensiv weggekürzt, damit kein Drift entsteht.
  const themenfeldId =
    sektorTyp === SEKTOR_TYP.ARBEITSPHASE && typeof rest.themenfeld_id === 'string' && rest.themenfeld_id
      ? rest.themenfeld_id
      : null;
  // titel_snapshot ebenfalls nur bei Arbeitsphase relevant (Lock-Snapshot).
  const titelSnapshot =
    sektorTyp === SEKTOR_TYP.ARBEITSPHASE && typeof rest.titel_snapshot === 'string'
      ? rest.titel_snapshot
      : null;

  return {
    ...rest,
    sektor_typ: sektorTyp,
    themenfeld_id: themenfeldId,
    titel_snapshot: titelSnapshot,
    modus: 'sequenziell', // Phase A: hart fixiert.
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
 *
 * Phase A: Default-Sektortyp ist 'individuell', kann aber per Override
 * überschrieben werden (z. B. von der "Sektor hinzufügen"-UI in Phase B).
 */
export function createNewSektor(overrides = {}) {
  const base = {
    sektor_id: `sec_${uuid()}`,
    titel: 'Neuer Sektor',
    modus: 'sequenziell',
    sektor_typ: DEFAULT_SEKTOR_TYP,
    themenfeld_id: null,
    titel_snapshot: null,
    items: [],
  };
  return normalizeSektor({ ...base, ...overrides });
}

/**
 * Gruppiert die items eines Sektors für das Phase-2-Rendering nach Hierarchie.
 *
 * Liefert eine flache, render-fertige Liste aus Root-Items in Originalreihenfolge.
 * Jedes Root-Item bekommt zusätzlich `originalIndex` (Position in sektor.items,
 * stabil für DnD) und – falls baustein_modus='bundle_1ton' – `children`, das
 * dieselbe Struktur für seine Kinder enthält.
 *
 * Wichtig:
 *   - Reihenfolge bleibt strikt sektor.items-basiert. Innerhalb der Children
 *     wird ebenfalls die Original-Reihenfolge bewahrt.
 *   - Items mit parent_instance_id, deren Eltern nicht (mehr) existieren, werden
 *     defensiv als Root behandelt (Datendrift-Schutz, kein Verlust).
 *   - Ein Bündel kann theoretisch Children haben, auch wenn der Strict-Drop
 *     in Phase 3 das später erst hart durchsetzt. Das ist Absicht – Phase 2
 *     soll bestehende Daten korrekt anzeigen.
 *
 * @param {Array}    items                 Items eines Sektors (bereits normalisiert).
 * @param {Function} isBundleByRefId       Map/Funktion (ref_id) → bool.
 * @returns {Array<{item, originalIndex, children?}>}
 */
export function groupItemsByParent(items, isBundleByRefId) {
  const list = Array.isArray(items) ? items : [];
  const isBundle = (refId) => {
    if (typeof isBundleByRefId === 'function') return !!isBundleByRefId(refId);
    if (isBundleByRefId && typeof isBundleByRefId.get === 'function') return !!isBundleByRefId.get(refId);
    return false;
  };

  // Set aller existierenden instance_ids für Datendrift-Schutz.
  const knownInstanceIds = new Set(list.map((it) => it?.instance_id).filter(Boolean));

  const roots = [];
  const childrenByParent = new Map();

  list.forEach((item, originalIndex) => {
    if (!item) return;
    const parentId = item.parent_instance_id ?? null;
    if (parentId && knownInstanceIds.has(parentId)) {
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push({ item, originalIndex });
    } else {
      // Root oder Waise → als Root rendern.
      roots.push({ item, originalIndex });
    }
  });

  return roots.map((root) => {
    const isBundleRoot =
      root.item.type === ITEM_TYPE.SYSTEM && isBundle(root.item.ref_id);
    if (!isBundleRoot) return root;
    const children = childrenByParent.get(root.item.instance_id) || [];
    return { ...root, children };
  });
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

// ── Strict-Drop-Validator (Phase 3) ────────────────────────────────────────

/**
 * Bildet eine `AllgemeineAufgabe` auf das Vokabular von `accepted_types` ab.
 * Vokabular: 'lernpaket' | 'inhalt' | 'prozess' | 'handlung' | 'auswahl_buendel' | 'projekt'
 *
 * Logik (siehe Logbuch §18, M4):
 *   - aufgaben_typ='buendel'         → 'lernpaket'
 *   - aufgaben_typ='projekt_anker'   → 'projekt'
 *   - anforderungsebene='3 - Projekt'→ 'projekt' (Fallback, wenn aufgaben_typ
 *                                                 nicht explizit gesetzt ist)
 *   - sonst: aufgaben_typ direkt (inhalt | prozess | handlung | auswahl_buendel)
 *
 * Liefert null, wenn die Aufgabe nicht klassifizierbar ist.
 */
export function getAcceptedTypeForAufgabe(aufgabe) {
  if (!aufgabe || typeof aufgabe !== 'object') return null;
  const typ = aufgabe.aufgaben_typ;
  if (typ === 'buendel') return 'lernpaket';
  if (typ === 'projekt_anker') return 'projekt';
  if (aufgabe.anforderungsebene === '3 - Projekt') return 'projekt';
  if (typ === 'inhalt' || typ === 'prozess' || typ === 'handlung' || typ === 'auswahl_buendel') {
    return typ;
  }
  return null;
}

/**
 * Strict-Drop-Validator: darf das gezogene Item an der Ziel-Position abgelegt werden?
 *
 * @param {object}   args
 * @param {object}   args.draggedItem          - Item-Objekt (mit type='aufgabe'|'system', ref_id)
 *                                                ODER pseudo-Item für Pool-Drags:
 *                                                { type: 'aufgabe', ref_id, isFromPool: true }
 * @param {string}   args.lernTyp              - aktiver Lerntyp (für Duplikat-Check)
 * @param {object}   args.konfiguration        - aktuelle lernpfade_konfiguration
 * @param {string|null} args.targetParentRefId - ref_id des Ziel-Bündels, oder null für Sektor-Root
 * @param {Map}      args.systemBausteineById  - Map<baustein_id, SystemBaustein>
 * @param {Map}      args.aufgabenById         - Map<aufgabe_id, AllgemeineAufgabe>
 *
 * @returns {{ ok: true } | { ok: false, reason: string, expected?: string[], actual?: string|null }}
 */
export function canDrop({
  draggedItem,
  lernTyp,
  konfiguration,
  targetParentRefId,
  systemBausteineById,
  aufgabenById,
}) {
  if (!draggedItem) return { ok: false, reason: 'invalid_item' };

  const isDroppingIntoBundle = !!targetParentRefId;
  const targetBundle = isDroppingIntoBundle
    ? systemBausteineById?.get?.(targetParentRefId)
    : null;

  // ── Regel 1: Bündel-in-Bündel verboten ───────────────────────────────────
  if (isDroppingIntoBundle && draggedItem.type === ITEM_TYPE.SYSTEM) {
    const draggedBaustein = systemBausteineById?.get?.(draggedItem.ref_id);
    if (draggedBaustein?.baustein_modus === 'bundle_1ton') {
      return { ok: false, reason: 'bundle_in_bundle' };
    }
  }

  // ── Regel 2: Duplikat-Check (nur Aufgaben, nur bei Pool-Drag) ────────────
  // Existierende Items werden NUR umsortiert, kein neuer Eintrag → kein Duplikat.
  if (draggedItem.type === ITEM_TYPE.AUFGABE && draggedItem.isFromPool) {
    const used = getUsedAufgabenIds(konfiguration, lernTyp);
    if (used.has(draggedItem.ref_id)) {
      return { ok: false, reason: 'duplicate_in_lerntyp' };
    }
  }

  // ── Regel 3: accepted_types des Ziel-Bündels respektieren ────────────────
  if (isDroppingIntoBundle) {
    const accepted = Array.isArray(targetBundle?.accepted_types) ? targetBundle.accepted_types : [];
    if (accepted.length === 0) {
      // Ziel-Bündel akzeptiert NICHTS (defensives Default)
      return { ok: false, reason: 'wrong_type', expected: [], actual: null };
    }

    let actualType = null;
    if (draggedItem.type === ITEM_TYPE.AUFGABE) {
      const aufgabe = aufgabenById?.get?.(draggedItem.ref_id);
      actualType = getAcceptedTypeForAufgabe(aufgabe);
    } else {
      // System-Baustein in Bündel: aktuell nicht vorgesehen.
      return { ok: false, reason: 'wrong_type', expected: accepted, actual: 'system' };
    }

    if (!actualType || !accepted.includes(actualType)) {
      return { ok: false, reason: 'wrong_type', expected: accepted, actual: actualType };
    }
  }

  return { ok: true };
}

/**
 * Cascade-Delete: Entfernt ein Bündel UND alle seine Children aus dem Sektor.
 *
 * Phase 3 (siehe Logbuch §18). Die Junction-Tabelle `LernpfadAufgabeMembership`
 * wird NICHT in dieser reinen Helper-Funktion gepflegt — das übernimmt der
 * scheduleSave-/Sync-Pfad im Cockpit (entfernte Child-Aufgaben werden dort
 * automatisch erkannt, weil ihre ref_id nicht mehr in items vorkommt).
 *
 * @param {object} konfig          - aktuelle lernpfade_konfiguration
 * @param {string} lernTyp         - aktiver Lerntyp
 * @param {string} sektorId        - betroffener Sektor
 * @param {string} bundleInstanceId - instance_id des zu löschenden Bündels
 * @returns {{ konfig: object, removedChildAufgabenIds: string[] }}
 *          - konfig: neue lernpfade_konfiguration (immutable)
 *          - removedChildAufgabenIds: Aufgaben-ref_ids der entfernten Kinder
 *            (für optionalen Membership-Cleanup im Aufrufer)
 */
export function removeBundleAndCascade(konfig, lernTyp, sektorId, bundleInstanceId) {
  if (!bundleInstanceId) return { konfig, removedChildAufgabenIds: [] };

  const removedChildAufgabenIds = [];
  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;

    const items = s.items.filter((it) => {
      if (it.instance_id === bundleInstanceId) return false; // Bündel selbst raus
      if (it.parent_instance_id === bundleInstanceId) {
        if (it.type === ITEM_TYPE.AUFGABE && it.ref_id) {
          removedChildAufgabenIds.push(it.ref_id);
        }
        return false; // Children raus
      }
      return true;
    });
    return { ...s, items };
  });

  return {
    konfig: setSektoren(konfig, lernTyp, next),
    removedChildAufgabenIds,
  };
}

/**
 * Liefert die Children eines Bündels in einem Sektor (für Confirm-Dialoge).
 */
export function getBundleChildren(konfig, lernTyp, sektorId, bundleInstanceId) {
  const sektor = getSektoren(konfig, lernTyp).find((s) => s.sektor_id === sektorId);
  if (!sektor) return [];
  return sektor.items.filter((it) => it.parent_instance_id === bundleInstanceId);
}

/**
 * Phase 4: Setzt/löscht `bundle_config.erforderliche_anzahl` an einem Bündel-
 * Item (System-Baustein mit baustein_modus='bundle_1ton').
 *
 * - `erforderlicheAnzahl = null` ODER fehlend → bundle_config wird entfernt
 *   (Default-Verhalten "alle Children müssen bearbeitet werden" greift).
 * - Wert wird auf [1, childCount] geclamped, damit der User-Wert immer sinnvoll
 *   bleibt — auch wenn nachträglich Children entfernt werden.
 * - Wenn das Bündel keine Children hat, wird bundle_config entfernt (sinnlos).
 *
 * Operiert idempotent und immutable.
 */
export function setBundleConfig(konfig, lernTyp, sektorId, bundleInstanceId, erforderlicheAnzahl) {
  if (!bundleInstanceId) return konfig;

  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const childCount = s.items.filter(
      (it) => it.parent_instance_id === bundleInstanceId
    ).length;

    const items = s.items.map((it) => {
      if (it.instance_id !== bundleInstanceId) return it;
      if (it.type !== ITEM_TYPE.SYSTEM) return it; // safety

      const { bundle_config: _ignored, ...rest } = it;
      const num = Number(erforderlicheAnzahl);
      if (
        erforderlicheAnzahl == null ||
        !Number.isFinite(num) ||
        num < 1 ||
        childCount === 0
      ) {
        return rest; // bundle_config entfernen → Default
      }
      const clamped = Math.min(Math.max(1, Math.floor(num)), childCount);
      return { ...rest, bundle_config: { erforderliche_anzahl: clamped } };
    });
    return { ...s, items };
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Phase A (Epic „Semantische Sektoren"): Setzt `bundle_config.modus` an einem
 * Bündel-Item (System-Baustein mit baustein_modus='bundle_1ton').
 *
 * Pädagogisches Constraint (Frage 11):
 *   - Wenn auf 'sequenziell' gewechselt wird UND das Bündel hat eine
 *     erforderliche_anzahl < childCount, wird die erforderliche_anzahl
 *     automatisch resettet (entfernt → Default = "alle Pflicht").
 *     Begründung: "Mach 2 von 5 in fester Reihenfolge" ist didaktisch
 *     widersinnig.
 *   - 'frei' belässt die erforderliche_anzahl unangetastet.
 *
 * Operiert idempotent und immutable. Ungültige Modus-Werte werden ignoriert.
 */
export function setBundleModus(konfig, lernTyp, sektorId, bundleInstanceId, modus) {
  if (!bundleInstanceId) return konfig;
  if (modus !== 'sequenziell' && modus !== 'frei') return konfig;

  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;

    const items = s.items.map((it) => {
      if (it.instance_id !== bundleInstanceId) return it;
      if (it.type !== ITEM_TYPE.SYSTEM) return it; // safety

      const prevConfig = it.bundle_config || {};
      const nextConfig = { ...prevConfig, modus };

      // Auto-Reset: bei sequenziell macht erforderliche_anzahl < childCount keinen Sinn.
      if (modus === 'sequenziell' && nextConfig.erforderliche_anzahl != null) {
        delete nextConfig.erforderliche_anzahl;
      }

      // Wenn nichts mehr drin ist → bundle_config komplett weg.
      if (Object.keys(nextConfig).length === 0) {
        const { bundle_config: _ignored, ...rest } = it;
        return rest;
      }
      return { ...it, bundle_config: nextConfig };
    });
    return { ...s, items };
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Phase A: Friert beim Lock den aktuellen Themenfeld-Titel als
 * `titel_snapshot` an allen Arbeitsphase-Sektoren ein, damit ein nachträgliches
 * Umbenennen des Themenfelds den Schüler-Pfad nicht rückwirkend ändert.
 *
 * Wird vom Lock-Hook (Phase B) vor dem Setzen von pfad_status='locked_for_export'
 * aufgerufen. Operiert immutable und idempotent — hat ein Sektor bereits einen
 * Snapshot, bleibt er unangetastet.
 *
 * @param {object} konfig                Konfiguration der Einheit.
 * @param {string} lernTyp               Lerntyp, für den gelockt wird.
 * @param {Map|object} themenfeldTitelById  Map<themenfeld_id, titel>.
 */
export function freezeThemenfeldSnapshot(konfig, lernTyp, themenfeldTitelById) {
  const lookup = (id) => {
    if (!id) return null;
    if (themenfeldTitelById && typeof themenfeldTitelById.get === 'function') {
      return themenfeldTitelById.get(id) || null;
    }
    if (themenfeldTitelById && typeof themenfeldTitelById === 'object') {
      return themenfeldTitelById[id] || null;
    }
    return null;
  };

  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_typ !== SEKTOR_TYP.ARBEITSPHASE) return s;
    if (s.titel_snapshot) return s; // schon eingefroren
    const titel = lookup(s.themenfeld_id);
    if (!titel) return s;
    return { ...s, titel_snapshot: titel };
  });
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
    modus: 'sequenziell', // Phase A: hart fixiert.
    sektor_typ: s.sektor_typ || DEFAULT_SEKTOR_TYP,
    themenfeld_id: s.themenfeld_id || null,
    titel_snapshot: null, // Snapshot wird im Ziel-Lerntyp neu erzeugt.
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
      // Phase A: Sektor-Modus ist nicht mehr nutzerveränderlich. Wir
      // schreiben hart 'sequenziell' — auch wenn das Template 'frei' sagt,
      // weil der Sektor-Modus für den Export-Generator irrelevant geworden
      // ist (Bündel-Modus übernimmt diese Rolle).
      modus: 'sequenziell',
      sektor_typ: isValidSektorTyp(sektor?.sektor_typ) ? sektor.sektor_typ : DEFAULT_SEKTOR_TYP,
      themenfeld_id: null, // Templates haben keine Themenfeld-Bindung.
      titel_snapshot: null,
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

// ── Phase D: Auto-Befüllen von Bündeln ──────────────────────────────────────

/**
 * Liefert Auto-Befüll-Kandidaten für ein Bündel.
 *
 * Filterregeln (siehe Phase D des Epic „Semantische Dashboard-Sektoren"):
 *   - Lernpakete-Bündel  → Lernpakete der Einheit, gefiltert nach themenfeld_id
 *                          des Sektors. Aufgaben-IDs sind hier die Lernpaket-IDs
 *                          (siehe lernpaketAdapter).
 *   - Aufgaben-Bündel    → AllgemeineAufgabe mit aufgaben_typ ∈ {inhalt, prozess,
 *                          handlung, auswahl_buendel}, gefiltert nach themenfeld_id.
 *   - Projekt-Bündel     → AllgemeineAufgabe mit anforderungsebene='3 - Projekt'
 *                          ODER aufgaben_typ='projekt_anker', themenfeld-unabhängig.
 *
 * Bereits im Lerntyp platzierte Aufgaben werden immer ausgeschlossen
 * (Anti-Duplikat).
 *
 * @param {object} args
 * @param {string} args.bundleKind         'lernpakete' | 'aufgaben' | 'projekte'
 * @param {string|null} args.themenfeldId  Sektor.themenfeld_id (für Lernpakete/Aufgaben)
 * @param {Array}  args.aufgaben           AllgemeineAufgabe-Records der Einheit
 * @param {Array}  args.lernpakete         Lernpakete-Records der Einheit
 * @param {Set<string>} args.usedAufgabenIds  ref_ids, die im aktiven Lerntyp bereits
 *                                            platziert sind (siehe getUsedAufgabenIds)
 * @returns {string[]} Array von ref_ids, die in das Bündel eingefügt werden können.
 */
export function getAutoFillCandidates({
  bundleKind,
  themenfeldId,
  aufgaben = [],
  lernpakete = [],
  usedAufgabenIds = new Set(),
}) {
  if (!bundleKind) return [];

  if (bundleKind === 'lernpakete') {
    if (!themenfeldId) return [];
    return lernpakete
      .filter((lp) => lp.themenfeld_id === themenfeldId && !usedAufgabenIds.has(lp.id))
      .map((lp) => lp.id);
  }

  if (bundleKind === 'aufgaben') {
    if (!themenfeldId) return [];
    const ALLOWED_TYPEN = new Set(['inhalt', 'prozess', 'handlung', 'auswahl_buendel']);
    return aufgaben
      .filter((a) => {
        if (a.themenfeld_id !== themenfeldId) return false;
        if (a.anforderungsebene === '3 - Projekt') return false;
        if (!ALLOWED_TYPEN.has(a.aufgaben_typ || 'inhalt')) return false;
        return !usedAufgabenIds.has(a.id);
      })
      .map((a) => a.id);
  }

  if (bundleKind === 'projekte') {
    return aufgaben
      .filter((a) => {
        const isProjekt =
          a.anforderungsebene === '3 - Projekt' || a.aufgaben_typ === 'projekt_anker';
        if (!isProjekt) return false;
        return !usedAufgabenIds.has(a.id);
      })
      .map((a) => a.id);
  }

  return [];
}

/**
 * Fügt mehrere Aufgaben-refs als Children eines Bündels in einen Sektor ein.
 *
 * Verhalten:
 *   - Items werden ans Ende der Children-Liste des Bündels angehängt
 *     (nach Reihenfolge in `aufgabeIds`).
 *   - parent_instance_id wird auf bundleInstanceId gesetzt.
 *   - Bereits platzierte Aufgaben (im selben Lerntyp) werden defensiv
 *     übersprungen — der Aufrufer hat das normalerweise schon via
 *     `getAutoFillCandidates` gefiltert.
 *
 * @returns {{konfig: object, addedCount: number, skippedCount: number}}
 */
export function bulkAddItemsToBundle(konfig, lernTyp, sektorId, bundleInstanceId, aufgabeIds) {
  if (!bundleInstanceId || !Array.isArray(aufgabeIds) || aufgabeIds.length === 0) {
    return { konfig, addedCount: 0, skippedCount: 0 };
  }
  const used = getUsedAufgabenIds(konfig, lernTyp);
  const toAdd = [];
  let skippedCount = 0;
  for (const id of aufgabeIds) {
    if (!id || used.has(id)) {
      skippedCount += 1;
      continue;
    }
    used.add(id); // dedupliziere innerhalb des Batches
    toAdd.push(id);
  }
  if (toAdd.length === 0) {
    return { konfig, addedCount: 0, skippedCount };
  }

  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const newChildren = toAdd.map((refId) =>
      normalizeItem({
        type: ITEM_TYPE.AUFGABE,
        ref_id: refId,
        parent_instance_id: bundleInstanceId,
      })
    );
    return { ...s, items: [...s.items, ...newChildren] };
  });
  return {
    konfig: setSektoren(konfig, lernTyp, next),
    addedCount: toAdd.length,
    skippedCount,
  };
}

/**
 * Phase 3.4: Index-Translation zwischen lokalem DnD-Index und absolutem
 * Index in `sektor.items`.
 *
 * - Root-Drop:  rootDndIndex   → absoluter Index NACH dem rootDndIndex-ten Root-Item
 *               (oder ans Ende, wenn es so viele Roots nicht gibt).
 * - Bündel-Drop: childDndIndex → absoluter Index NACH dem childDndIndex-ten Child
 *                des Ziel-Bündels (oder direkt nach dem Bündel selbst, falls leer).
 *
 * Wichtig: Wenn das gezogene Item in derselben Liste umsortiert wird, gibt
 * @hello-pangea/dnd `destination.index` BEZOGEN AUF DIE LISTE OHNE das gezogene
 * Item zurück (Standardverhalten). Der Aufrufer muss vor der Translation das
 * Item also noch im Array haben — wir errechnen den Ziel-Index unter der
 * Annahme, dass das Item gleich entfernt und neu eingefügt wird.
 */
export function resolveAbsoluteInsertIndex(items, targetParentInstanceId, localIndex) {
  const list = Array.isArray(items) ? items : [];
  if (targetParentInstanceId) {
    // Bündel-Drop: zähle Children dieses Bündels in Original-Reihenfolge.
    const childPositions = [];
    list.forEach((it, idx) => {
      if (it?.parent_instance_id === targetParentInstanceId) childPositions.push(idx);
    });
    if (localIndex <= 0 || childPositions.length === 0) {
      // Vor das erste Child – also direkt hinter den Bündel-Header.
      const bundlePos = list.findIndex((it) => it?.instance_id === targetParentInstanceId);
      return bundlePos === -1 ? list.length : bundlePos + 1;
    }
    if (localIndex >= childPositions.length) {
      // Hinter das letzte Child.
      return childPositions[childPositions.length - 1] + 1;
    }
    // Vor das localIndex-te Child.
    return childPositions[localIndex];
  }

  // Root-Drop: Roots sind Items mit parent_instance_id == null.
  const rootPositions = [];
  list.forEach((it, idx) => {
    if (!it?.parent_instance_id) rootPositions.push(idx);
  });
  if (localIndex <= 0 || rootPositions.length === 0) return 0;
  if (localIndex >= rootPositions.length) return list.length;
  return rootPositions[localIndex];
}

/**
 * Phase 3.4: Item an absoluter Position einfügen. Setzt parent_instance_id
 * konsistent (null für Sektor-Root, bundleInstanceId für Bündel-Children).
 *
 * Anti-Duplikat NICHT in dieser Funktion — die Validierung läuft schon im
 * canDrop-Validator vor dem Drop.
 */
export function insertItemInSektorAtAbsolute(konfig, lernTyp, sektorId, item, absoluteIndex) {
  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const items = [...s.items];
    const insertAt = Math.max(0, Math.min(absoluteIndex ?? items.length, items.length));
    items.splice(insertAt, 0, normalizeItem(item));
    return { ...s, items };
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Phase 3.4: Bestehendes Item innerhalb des Sektors verschieben (DnD-Reorder
 * inkl. Bündel-Wechsel im selben Sektor) oder zwischen Sektoren mit Update der
 * parent_instance_id.
 *
 * @param {string|null} newParentInstanceId - null für Sektor-Root, sonst Bündel-instance_id
 * @param {number} absoluteToIndex          - Ziel-Index im flachen Array des Ziel-Sektors,
 *                                            BEREITS unter der Annahme errechnet, dass das
 *                                            Item zuerst aus dem Quell-Sektor entfernt wird
 *                                            (wenn fromSektorId === toSektorId).
 */
export function moveItemAbsolute(
  konfig,
  lernTyp,
  fromSektorId,
  fromAbsoluteIndex,
  toSektorId,
  absoluteToIndex,
  newParentInstanceId
) {
  const sektoren = getSektoren(konfig, lernTyp);
  const fromSektor = sektoren.find((s) => s.sektor_id === fromSektorId);
  if (!fromSektor) return konfig;
  const movedItem = fromSektor.items[fromAbsoluteIndex];
  if (!movedItem) return konfig;

  const repositioned = {
    ...movedItem,
    parent_instance_id: newParentInstanceId ?? null,
  };

  const next = sektoren.map((s) => {
    if (fromSektorId === toSektorId && s.sektor_id === fromSektorId) {
      const items = [...s.items];
      items.splice(fromAbsoluteIndex, 1);
      const insertAt = Math.max(0, Math.min(absoluteToIndex ?? items.length, items.length));
      items.splice(insertAt, 0, repositioned);
      return { ...s, items };
    }
    if (s.sektor_id === fromSektorId) {
      const items = [...s.items];
      items.splice(fromAbsoluteIndex, 1);
      return { ...s, items };
    }
    if (s.sektor_id === toSektorId) {
      const items = [...s.items];
      const insertAt = Math.max(0, Math.min(absoluteToIndex ?? items.length, items.length));
      items.splice(insertAt, 0, repositioned);
      return { ...s, items };
    }
    return s;
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Item innerhalb eines Sektors umsortieren oder zwischen zwei Sektoren des
 * gleichen Lerntyps verschieben. Reine Reihenfolge-Operation – führt keine
 * Duplikat-Prüfung durch (es wird ja kein neues Item hinzugefügt).
 *
 * Funktioniert für Aufgaben- UND System-Items gleichermaßen.
 *
 * Phase 3.4-Hinweis: Diese Funktion arbeitet noch auf flachen Indizes ohne
 * parent_instance_id-Update. Für Bündel-DnD nutzt das Cockpit jetzt
 * `moveItemAbsolute`. `moveAufgabe` bleibt für Legacy-Reorder ohne Hierarchie
 * erhalten (z. B. wenn nur Roots umsortiert werden, ohne Bündel-Wechsel).
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