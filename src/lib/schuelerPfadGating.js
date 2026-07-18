/**
 * schuelerPfadGating.js
 *
 * Reine, side-effect-freie Ableitungs-Logik für die SCHÜLERANSICHT eines
 * Lernpfads. Verheiratet die statische `lernpfade_konfiguration[lerntyp]`
 * (Sektoren + Items + Gating-Regeln) mit dem persönlichen Fortschritt des
 * Schülers (Map<instance_id, status>) und leitet daraus ab:
 *
 *   - pro Sektor:  ob er freigeschaltet oder (per freischalt_bedingung) gesperrt ist
 *   - pro Item:    ob es freigeschaltet, gesperrt oder erledigt ist
 *
 * Entspricht 1:1 den Regeln aus DASHBOARD_GATING_ENGINE (lib/dashboardGating.js)
 * + sektorFreischaltung.js. Keine I/O — voll testbar.
 *
 * Datengrundlage: die Sektoren MÜSSEN bereits normalisiert sein
 * (normalizeSektor aus lernpfadeUtils), damit modus / freischalt_bedingung /
 * items konsistent vorliegen.
 */

import { normalizeSektorModus, normalizeBundleModus, isBundleContainer } from '@/lib/dashboardGating';
import { normalizeFreischaltBedingung, FREISCHALT_MODUS } from '@/lib/sektorFreischaltung';

export const ITEM_GATE = Object.freeze({
  ERLEDIGT: 'erledigt',
  AKTIV: 'aktiv', // freigeschaltet & bearbeitbar
  GESPERRT: 'gesperrt', // sichtbar, aber noch nicht dran
});

/**
 * Etappe 2 (Auto-Assembly): „Deaktivieren statt Löschen". Entfernt alle
 * Items mit aktiv=false — und alle Kinder, deren Eltern-Bündel deaktiviert
 * ist. Deaktivierte Items existieren für Schüler schlicht nicht (kein
 * Gating, keine Anzeige, kein Fortschritts-Soll).
 */
export function filterAktiveItems(items) {
  const list = Array.isArray(items) ? items : [];
  const inaktiveParents = new Set(
    list.filter((it) => it?.aktiv === false && it?.instance_id).map((it) => it.instance_id)
  );
  return list.filter(
    (it) =>
      it?.aktiv !== false &&
      !(it?.parent_instance_id && inaktiveParents.has(it.parent_instance_id))
  );
}

/**
 * Liefert den persönlichen Status eines Items (offen|in_bearbeitung|erledigt)
 * aus der Fortschritts-Map. Default 'offen'.
 */
function itemStatus(fortschrittByInstance, instanceId) {
  return fortschrittByInstance?.get?.(instanceId) || 'offen';
}

function istErledigt(fortschrittByInstance, instanceId) {
  return itemStatus(fortschrittByInstance, instanceId) === 'erledigt';
}

/**
 * Berechnet den Gate-Status (erledigt|aktiv|gesperrt) für jedes Item eines
 * Sektors – flache, render-fertige Liste in Original-Reihenfolge.
 *
 * Regeln:
 *   - Sektor 'frei'        → alle Wurzel-Items sind 'aktiv' (sofern nicht erledigt).
 *   - Sektor 'sequenziell' → immer das erste nicht-erledigte Wurzel-Item ist
 *                            'aktiv', spätere sind 'gesperrt'. Erledigte bleiben
 *                            'erledigt' (re-anklickbar).
 *   - Bündel-Kinder folgen dem Bündel-Modus (override): sequenziell → ein Kind
 *     nach dem anderen; frei → alle aktiv.
 *
 * @param {object} sektor                     normalisierter Sektor
 * @param {Map}    fortschrittByInstance       Map<instance_id, status>
 * @param {Map}    bausteinById                Map<ref_id, SystemBaustein> (für Bündel-Erkennung)
 * @returns {Array} Items mit zusätzlichem Feld `gate` (ITEM_GATE) und `status`
 */
export function annotateSektorForSchueler(sektor, fortschrittByInstance, bausteinById = new Map()) {
  // Deaktivierte Items (aktiv=false) sind für Schüler unsichtbar und
  // fließen auch nicht ins sequenzielle Gating ein.
  const items = filterAktiveItems(sektor?.items);
  const sektorModus = normalizeSektorModus(sektor?.modus);

  // Bündel-Modus pro Bündel-instance_id vormerken.
  const bundleModusByInstance = new Map();
  for (const it of items) {
    if (it?.type === 'system' && it.instance_id) {
      const baustein = bausteinById.get?.(it.ref_id);
      if (isBundleContainer(baustein)) {
        bundleModusByInstance.set(it.instance_id, normalizeBundleModus(it?.bundle_config?.modus));
      }
    }
  }

  // Wurzel-Items in Reihenfolge (für sequenzielles Sektor-Gating).
  const rootItems = items.filter((it) => !it?.parent_instance_id);
  let ersterOffenerRootGesetzt = false;

  // Kinder gruppieren (für sequenzielles Bündel-Gating).
  const childrenByParent = new Map();
  for (const it of items) {
    if (it?.parent_instance_id) {
      if (!childrenByParent.has(it.parent_instance_id)) childrenByParent.set(it.parent_instance_id, []);
      childrenByParent.get(it.parent_instance_id).push(it);
    }
  }
  // Pro Bündel: erstes offenes Kind merken.
  const ersterOffenerChildByBundle = new Map();
  for (const [bundleId, kinder] of childrenByParent.entries()) {
    if (normalizeBundleModus(bundleModusByInstance.get(bundleId)) !== 'sequenziell') continue;
    const offen = kinder.find((k) => !istErledigt(fortschrittByInstance, k.instance_id));
    if (offen) ersterOffenerChildByBundle.set(bundleId, offen.instance_id);
  }

  // Status für Wurzel-Items berechnen (sequenziell: nur das erste offene ist aktiv).
  const rootGate = new Map();
  for (const root of rootItems) {
    if (istErledigt(fortschrittByInstance, root.instance_id)) {
      rootGate.set(root.instance_id, ITEM_GATE.ERLEDIGT);
      continue;
    }
    if (sektorModus === 'frei') {
      rootGate.set(root.instance_id, ITEM_GATE.AKTIV);
    } else if (!ersterOffenerRootGesetzt) {
      rootGate.set(root.instance_id, ITEM_GATE.AKTIV);
      ersterOffenerRootGesetzt = true;
    } else {
      rootGate.set(root.instance_id, ITEM_GATE.GESPERRT);
    }
  }

  return items.map((it) => {
    const status = itemStatus(fortschrittByInstance, it.instance_id);
    const istKind = !!it?.parent_instance_id;

    let gate;
    if (status === 'erledigt') {
      gate = ITEM_GATE.ERLEDIGT;
    } else if (!istKind) {
      gate = rootGate.get(it.instance_id) || ITEM_GATE.GESPERRT;
    } else {
      // Bündel-Kind.
      const bundleModus = normalizeBundleModus(bundleModusByInstance.get(it.parent_instance_id));
      // Das Bündel selbst muss aktiv sein, damit Kinder bearbeitbar sind.
      const bundleAktiv = rootGate.get(it.parent_instance_id) !== ITEM_GATE.GESPERRT;
      if (!bundleAktiv) {
        gate = ITEM_GATE.GESPERRT;
      } else if (bundleModus === 'frei') {
        gate = ITEM_GATE.AKTIV;
      } else {
        gate = ersterOffenerChildByBundle.get(it.parent_instance_id) === it.instance_id
          ? ITEM_GATE.AKTIV
          : ITEM_GATE.GESPERRT;
      }
    }

    return { ...it, status, gate };
  });
}

/**
 * Ist ein Sektor vollständig erledigt? (alle Wurzel-Items erledigt)
 */
export function istSektorErledigt(sektor, fortschrittByInstance) {
  const roots = filterAktiveItems(sektor?.items).filter((it) => !it?.parent_instance_id);
  if (roots.length === 0) return false;
  return roots.every((it) => istErledigt(fortschrittByInstance, it.instance_id));
}

/**
 * Leitet pro Sektor ab, ob er freigeschaltet ist (freischalt_bedingung).
 * 'sofort' → immer frei. 'nach_sektor' → frei, sobald der Voraussetzungs-
 * Sektor vollständig erledigt ist.
 *
 * @returns {Map<sektor_id, { freigeschaltet: boolean, voraussetzungTitel: string|null }>}
 */
export function deriveSektorFreischaltung(sektoren, fortschrittByInstance) {
  const list = Array.isArray(sektoren) ? sektoren : [];
  const byId = new Map(list.map((s) => [s.sektor_id, s]));
  const result = new Map();

  for (const sektor of list) {
    const fb = normalizeFreischaltBedingung(sektor?.freischalt_bedingung);
    if (fb.modus !== FREISCHALT_MODUS.NACH_SEKTOR || !fb.voraussetzung_sektor_id) {
      result.set(sektor.sektor_id, { freigeschaltet: true, voraussetzungTitel: null });
      continue;
    }
    const vorauss = byId.get(fb.voraussetzung_sektor_id);
    const freigeschaltet = vorauss ? istSektorErledigt(vorauss, fortschrittByInstance) : true;
    result.set(sektor.sektor_id, {
      freigeschaltet,
      voraussetzungTitel: vorauss?.titel || null,
    });
  }
  return result;
}