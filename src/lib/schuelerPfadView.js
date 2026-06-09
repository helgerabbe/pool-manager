/**
 * schuelerPfadView.js
 *
 * Anzeige-Aufbereitung der Schüleransicht. Trennt die reine Gating-Logik
 * (schuelerPfadGating.js) von der Frage, WAS dem Schüler als Liste angezeigt
 * wird.
 *
 * Kernregel (vom Fachkonzept): Ein BÜNDEL-Container (Lernpaket-, Aufgaben-
 * oder Projektbündel) ist KEIN eigener Punkt im Schüler-Dashboard. Er ist nur
 * eine organisatorische Klammer. Im Pfad erscheinen ausschließlich die DARIN
 * enthaltenen Lernpakete/Aufgaben/Projekte – gleichrangig mit den übrigen
 * Wurzel-Items des Sektors. Die Reihenfolge-/Freigabe-Regel des Bündels
 * (sequenziell|frei) wirkt weiterhin auf seine Kinder; das übernimmt die
 * Gating-Engine über das `gate`-Feld.
 *
 * Diese Datei nimmt die bereits annotierten Items (mit `gate`) und liefert
 * eine flache, render-fertige Liste OHNE Bündel-Container, dafür mit den
 * Kindern an deren Stelle. Zusätzlich wird pro gesperrtem Item ein
 * menschenlesbarer Grund (`lockReason`) berechnet (für das Schloss-Tooltip).
 */

import { ITEM_GATE } from '@/lib/schuelerPfadGating';
import { isBundleContainer, normalizeBundleModus, normalizeSektorModus } from '@/lib/dashboardGating';
import { getItemMeta } from '@/lib/schuelerItemMeta';

function istBundleItem(item, bausteinById) {
  if (item?.type !== 'system') return false;
  return isBundleContainer(bausteinById?.get?.(item.ref_id));
}

/**
 * Wandelt eine annotierte Sektor-Item-Liste in die Anzeige-Liste um:
 * Bündel-Container werden entfernt, ihre Kinder bleiben (in Reihenfolge,
 * direkt an der Position des Containers). Jedes sichtbare Item bekommt
 * `lockReason` (string|null) für das Schloss-Tooltip.
 *
 * @param {object} sektor               normalisierter Sektor
 * @param {Array}  annotatedItems       Items mit `gate` (aus annotateSektorForSchueler)
 * @param {Map}    aufgabenById         Map<id, Aufgabe/Lernpaket>
 * @param {Map}    bausteinById         Map<baustein_id, SystemBaustein>
 * @param {boolean} sektorFreigeschaltet ob der Sektor selbst frei ist
 * @param {string|null} voraussetzungTitel Titel des Voraussetzungs-Sektors
 * @returns {Array} sichtbare Items: { ...item, gate, meta, lockReason }
 */
export function buildSichtbarePfadItems(
  sektor,
  annotatedItems,
  aufgabenById,
  bausteinById,
  sektorFreigeschaltet,
  voraussetzungTitel
) {
  const byInstance = new Map(annotatedItems.map((it) => [it.instance_id, it]));
  const sektorModus = normalizeSektorModus(sektor?.modus);

  // Container-instance_id → { titel, modus, kinder[] } für Lock-Begründungen.
  const containerInfo = new Map();
  for (const it of annotatedItems) {
    if (istBundleItem(it, bausteinById)) {
      containerInfo.set(it.instance_id, {
        modus: normalizeBundleModus(it?.bundle_config?.modus),
        kinder: annotatedItems.filter((k) => k.parent_instance_id === it.instance_id),
      });
    }
  }

  // Sichtbare Items in Original-Reihenfolge, Container ausgelassen.
  const sichtbar = annotatedItems.filter((it) => !istBundleItem(it, bausteinById));

  return sichtbar.map((it) => {
    const meta = getItemMeta(it, aufgabenById, bausteinById);
    const lockReason =
      it.gate === ITEM_GATE.GESPERRT
        ? computeLockReason(it, byInstance, containerInfo, aufgabenById, bausteinById, sektorModus, sektorFreigeschaltet, voraussetzungTitel)
        : null;
    return { ...it, meta, lockReason };
  });
}

/**
 * Ermittelt einen schülerfreundlichen Grund, warum ein Item gesperrt ist.
 */
function computeLockReason(
  item,
  byInstance,
  containerInfo,
  aufgabenById,
  bausteinById,
  sektorModus,
  sektorFreigeschaltet,
  voraussetzungTitel
) {
  // 1) Ganzer Sektor gesperrt.
  if (!sektorFreigeschaltet) {
    return voraussetzungTitel
      ? `Das kannst du erst bearbeiten, wenn der Abschnitt „${voraussetzungTitel}“ abgeschlossen ist.`
      : 'Dieser Abschnitt ist noch nicht freigeschaltet.';
  }

  // 2) Bündel-Kind, das in einem sequenziellen Bündel auf ein Geschwister wartet.
  if (item.parent_instance_id && containerInfo.has(item.parent_instance_id)) {
    const info = containerInfo.get(item.parent_instance_id);
    if (info.modus === 'sequenziell') {
      const idx = info.kinder.findIndex((k) => k.instance_id === item.instance_id);
      const vorher = info.kinder[idx - 1];
      if (vorher) {
        const vMeta = getItemMeta(vorher, aufgabenById, bausteinById);
        return `Du musst zuerst „${vMeta.titel}“ erledigen.`;
      }
    }
  }

  // 3) Sequenzielles Sektor-Gating: auf das vorige Wurzel-Item warten.
  if (!item.parent_instance_id && sektorModus === 'sequenziell') {
    const roots = [...byInstance.values()].filter((it) => !it.parent_instance_id);
    const idx = roots.findIndex((r) => r.instance_id === item.instance_id);
    const vorher = roots[idx - 1];
    if (vorher) {
      const vMeta = getItemMeta(vorher, aufgabenById, bausteinById);
      return `Du musst zuerst „${vMeta.titel}“ erledigen.`;
    }
  }

  return 'Das kannst du gerade noch nicht bearbeiten.';
}