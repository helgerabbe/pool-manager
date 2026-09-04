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
import { normalizeFreischaltBedingung } from '@/lib/sektorFreischaltung';

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
      // bundle_config.lernpaket_modus (2026-07-18): Nur an Lernpaketebündeln
      // relevant — steuert, wie die Aktivitäten INNERHALB eines einzelnen
      // Lernpakets bearbeitet werden (sequenziell | frei). Default fehlend
      // = sequenziell.
      const lm = item.bundle_config.lernpaket_modus;
      if (lm === 'sequenziell' || lm === 'frei') {
        bc.lernpaket_modus = lm;
      }
      if (Object.keys(bc).length > 0) {
        normalized.bundle_config = bc;
      }
    }
    // Lernpaket-Zugang (2026-08-22): Pro Lernpaket im Dashboard überschreibbar
    // ('standard' | 'fast_track' | 'wissensspeicher'). Fehlend = Default des
    // Lerntyps (siehe lib/lernpaketZugang.js).
    if (
      item.lernpaket_zugang === 'standard' ||
      item.lernpaket_zugang === 'fast_track' ||
      item.lernpaket_zugang === 'wissensspeicher'
    ) {
      normalized.lernpaket_zugang = item.lernpaket_zugang;
    }
    // Etappe 2 (Auto-Assembly): „Deaktivieren statt Löschen". Nur der
    // Ausnahme-Zustand wird persistiert (aktiv=false); fehlend = aktiv.
    if (item.aktiv === false) {
      normalized.aktiv = false;
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

  // Sektor-Modus ist wieder nutzerveränderlich (sequenziell|frei).
  // Default = 'sequenziell'. Ungültige Werte fallen defensiv auf 'sequenziell'.
  const sektorModus = rest.modus === 'frei' ? 'frei' : 'sequenziell';

  return {
    ...rest,
    sektor_typ: sektorTyp,
    themenfeld_id: themenfeldId,
    titel_snapshot: titelSnapshot,
    modus: sektorModus,
    freischalt_bedingung: normalizeFreischaltBedingung(rest.freischalt_bedingung),
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
 * Stellt sicher, dass ein eventuell vorhandener Feedback-Sektor (sektor_typ='feedback')
 * IMMER an letzter Stelle einer Sektor-Liste steht. Reine Sortier-Operation –
 * berührt keine anderen Sektoren in ihrer relativen Reihenfolge.
 *
 * Wird von addSektor und moveSektor aufgerufen, sodass:
 *   - neue Sektoren immer VOR Feedback eingefügt werden,
 *   - Feedback nicht über andere Sektoren bewegt werden kann (no-op),
 *   - andere Sektoren nicht hinter Feedback rutschen können.
 */
function pinFeedbackSektorToEnd(sektoren) {
  const list = Array.isArray(sektoren) ? sektoren : [];
  const feedbackIdx = list.findIndex((s) => s?.sektor_typ === SEKTOR_TYP.FEEDBACK);
  if (feedbackIdx === -1 || feedbackIdx === list.length - 1) return list;
  const next = [...list];
  const [feedback] = next.splice(feedbackIdx, 1);
  next.push(feedback);
  return next;
}

/**
 * Sektor anhängen. Feedback-Sektor wird automatisch ans Ende gepinnt –
 * neue Sektoren landen also immer DAVOR, falls ein Feedback existiert.
 */
export function addSektor(konfig, lernTyp, sektor = createNewSektor()) {
  const next = [...getSektoren(konfig, lernTyp), normalizeSektor(sektor)];
  return setSektoren(konfig, lernTyp, pinFeedbackSektorToEnd(next));
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
 * Sektor in der Liste eines Lerntyps um eine Position nach oben oder unten
 * verschieben. `direction` = -1 (hoch) | +1 (runter). Out-of-bounds wird
 * defensiv ignoriert (no-op). Reine Reihenfolge-Operation.
 */
export function moveSektor(konfig, lernTyp, sektorId, direction) {
  if (direction !== -1 && direction !== 1) return konfig;
  const sektoren = getSektoren(konfig, lernTyp);
  const idx = sektoren.findIndex((s) => s.sektor_id === sektorId);
  if (idx === -1) return konfig;
  const target = idx + direction;
  if (target < 0 || target >= sektoren.length) return konfig;
  // Feedback-Sektor selbst darf nicht bewegt werden, und kein anderer Sektor
  // darf über einen Feedback-Sektor hinaus tauschen.
  if (sektoren[idx]?.sektor_typ === SEKTOR_TYP.FEEDBACK) return konfig;
  if (sektoren[target]?.sektor_typ === SEKTOR_TYP.FEEDBACK) return konfig;
  const next = [...sektoren];
  [next[idx], next[target]] = [next[target], next[idx]];
  return setSektoren(konfig, lernTyp, pinFeedbackSektorToEnd(next));
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

      // WICHTIG: Die übrigen Bündel-Einstellungen (modus, lernpaket_modus)
      // müssen erhalten bleiben – sonst setzt eine Änderung der Pflichtmenge
      // den Bearbeitungsmodus des Bündels still zurück (Fix 2026-08-22).
      const { bundle_config: prevConfig, ...rest } = it;
      const { erforderliche_anzahl: _prevAnzahl, ...restConfig } = prevConfig || {};
      const num = Number(erforderlicheAnzahl);
      const clearAnzahl =
        erforderlicheAnzahl == null ||
        !Number.isFinite(num) ||
        num < 1 ||
        childCount === 0;
      const nextConfig = clearAnzahl
        ? { ...restConfig }
        : {
            ...restConfig,
            erforderliche_anzahl: Math.min(Math.max(1, Math.floor(num)), childCount),
          };
      if (Object.keys(nextConfig).length === 0) return rest;
      return { ...rest, bundle_config: nextConfig };
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
 * Etappe 2 (Auto-Assembly): Item aktivieren/deaktivieren („Deaktivieren
 * statt Löschen"). Deaktivierte Items bleiben in der Konfiguration erhalten
 * (der Auto-Sync legt sie also nicht erneut an), werden aber in der
 * Schüleransicht ausgeblendet (siehe filterAktiveItems in schuelerPfadGating).
 *
 * Es wird nur der Ausnahme-Zustand gespeichert: aktiv=true entfernt das
 * Feld wieder. Operiert idempotent und immutable.
 */
export function setItemLernpaketZugang(konfig, lernTyp, sektorId, instanceId, zugang) {
  if (!instanceId) return konfig;
  const gueltig =
    zugang === 'standard' || zugang === 'fast_track' || zugang === 'wissensspeicher';
  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const items = s.items.map((it) => {
      if (it.instance_id !== instanceId) return it;
      if (!gueltig) {
        const { lernpaket_zugang: _ignored, ...rest } = it;
        return rest; // zurück auf Lerntyp-Default
      }
      return { ...it, lernpaket_zugang: zugang };
    });
    return { ...s, items };
  });
  return setSektoren(konfig, lernTyp, next);
}

export function setItemAktiv(konfig, lernTyp, sektorId, instanceId, aktiv) {
  if (!instanceId) return konfig;
  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const items = s.items.map((it) => {
      if (it.instance_id !== instanceId) return it;
      if (aktiv === false) return { ...it, aktiv: false };
      const { aktiv: _ignored, ...rest } = it;
      return rest;
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
 * Phase E: Wenn `themenfelder` mitgegeben wird, expandiert die Funktion
 * jeden Arbeitsphase-Template-Sektor in N parallele Arbeitsphase-Sektoren —
 * einen pro Themenfeld der Einheit. Jeder dieser Sektoren bekommt
 *   - `themenfeld_id` direkt gesetzt,
 *   - `titel` = Themenfeld-Titel (Live-Titel-Binding übernimmt das Cockpit),
 *   - dieselben Bausteine (z. B. Themenfeld-Intro + Lernpaketebündel) wie das
 *     Template-Sektor — nur mit frischen instance_ids.
 * Ohne Themenfeld-Liste oder bei leerer Liste fällt das Verhalten auf den
 * alten Pfad zurück (1 Arbeitsphase-Sektor ohne themenfeld_id).
 *
 * @param {object} aktuelleKonfig - Die komplette lernpfade_konfiguration.
 * @param {string} lerntyp - 'minimalist' | 'pragmatiker' | 'ehrgeizig' | 'passioniert'.
 * @param {Array}  templateData - Array of Sektoren aus DASHBOARD_TEMPLATES[lerntyp].
 * @param {Array}  [themenfelder] - Optionale Liste {id, titel, reihenfolge}
 *                                  zur Expansion der Arbeitsphase-Sektoren.
 * @returns {object} Neue Konfiguration (immutable) mit überschriebenem Lerntyp.
 */
export function applyDashboardTemplate(aktuelleKonfig, lerntyp, templateData, themenfelder = null) {
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

  // Themenfelder sortiert (per reihenfolge, dann titel) — bestimmt die
  // Reihenfolge der Arbeitsphase-Sektoren im Lernpfad.
  const sortedTfs = Array.isArray(themenfelder) && themenfelder.length > 0
    ? [...themenfelder].sort((a, b) => {
        const ra = Number.isFinite(a?.reihenfolge) ? a.reihenfolge : 9999;
        const rb = Number.isFinite(b?.reihenfolge) ? b.reihenfolge : 9999;
        if (ra !== rb) return ra - rb;
        return String(a?.titel || '').localeCompare(String(b?.titel || ''));
      })
    : null;

  const buildItemsFromTemplate = (sektor) =>
    Array.isArray(sektor?.items)
      ? sektor.items.map(normalizeItem).filter(Boolean).map(aliasItem)
      : [];

  const buildSektor = (sektor, overrides = {}) => ({
    sektor_id: `sec_${uuid()}`,
    titel: sektor?.titel || 'Neuer Sektor',
    // Sektor-Modus aus dem Template übernehmen (Default 'sequenziell').
    modus: sektor?.modus === 'frei' ? 'frei' : 'sequenziell',
    sektor_typ: isValidSektorTyp(sektor?.sektor_typ) ? sektor.sektor_typ : DEFAULT_SEKTOR_TYP,
    themenfeld_id: null, // Templates haben keine Themenfeld-Bindung.
    titel_snapshot: null,
    // Freischalt-Regel der Vorlage übernehmen. Da die sektor_ids beim
    // Anwenden NEU vergeben werden, sind konkrete Vorlagen-IDs ('nach_sektor')
    // hier immer ungültig — jede Gating-Regel wird deshalb positionsbezogen
    // als 'nach_vorgaenger' übernommen; nur 'sofort' bleibt 'sofort'.
    freischalt_bedingung: (() => {
      const fb = normalizeFreischaltBedingung(sektor?.freischalt_bedingung);
      return fb.modus === 'sofort'
        ? fb
        : { modus: 'nach_vorgaenger', voraussetzung_sektor_id: null };
    })(),
    items: buildItemsFromTemplate(sektor),
    ...overrides,
  });

  const freshSektoren = [];
  for (const sektor of templateData) {
    const isArbeitsphase = sektor?.sektor_typ === SEKTOR_TYP.ARBEITSPHASE;
    if (isArbeitsphase && sortedTfs) {
      // Phase E: pro Themenfeld einen eigenen Arbeitsphase-Sektor erzeugen.
      // Items werden pro Klon frisch gebaut (frische instance_ids).
      for (const tf of sortedTfs) {
        freshSektoren.push(
          buildSektor(sektor, {
            titel: tf?.titel || sektor?.titel || 'Themenfeld',
            themenfeld_id: tf?.id || null,
            items: buildItemsFromTemplate(sektor),
          })
        );
      }
    } else {
      freshSektoren.push(buildSektor(sektor));
    }
  }

  return setSektoren(aktuelleKonfig || {}, lerntyp, freshSektoren);
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
    // MBK-Hinweis 2026-09-04: Die Bündel-Reihenfolge muss der Reihenfolge im
    // Themenfeld (reihenfolge_nummer) folgen – nicht der Ladereihenfolge.
    return lernpakete
      .filter((lp) => lp.themenfeld_id === themenfeldId && !usedAufgabenIds.has(lp.id))
      .sort((a, b) => (a.reihenfolge_nummer ?? 9999) - (b.reihenfolge_nummer ?? 9999))
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
export function bulkAddItemsToBundle(konfig, lernTyp, sektorId, bundleInstanceId, aufgabeIds, options = {}) {
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
        // Etappe 2: Nach Bestätigung nachgezogene Inhalte starten inaktiv.
        ...(options.inaktiv ? { aktiv: false } : {}),
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