/**
 * lernpfadItemArt.js
 *
 * Erkennt, WAS ein Lernpfad-Item eigentlich ist (airgap-1.19.0).
 *
 * Die gespeicherte Struktur kennt nur zwei Item-Typen: 'system' und 'aufgabe'.
 * „Aufgabe" ist dabei ein Sammelbegriff — dahinter steckt entweder eine
 * AllgemeineAufgabe ODER ein Lernpaket (Lernpakete stehen mit ihrer
 * lernpaket_id als ref_id im Pfad, siehe lernpaketAdapter). Für die App war
 * das nie ein Problem, weil sie beide Quellen ohnehin lädt; für den Export
 * schon: Die MBK bekam eine Liste, in der Lernpakete und Aufgaben nicht zu
 * unterscheiden waren, und hat Lernpakete deshalb pauschal vorangestellt —
 * die von der Lehrkraft gebaute Reihenfolge war damit verloren.
 *
 * Reine Ableitung, keine I/O.
 */

import { isBundleContainer, resolveLernpaketInnenModus } from '@/lib/dashboardGating';

export const ITEM_ART = Object.freeze({
  LERNPAKET: 'lernpaket',
  ALLGEMEINE_AUFGABE: 'allgemeine_aufgabe',
  BUENDEL: 'buendel',
  SYSTEMBAUSTEIN: 'systembaustein',
});

function get(map, key) {
  if (!map || !key) return null;
  return typeof map.get === 'function' ? map.get(key) || null : null;
}

/**
 * Bestimmt Art und Anzeigetitel EINES Items.
 * @returns {{item_kind: string|null, ref_titel: string|null}}
 */
export function resolveItemArt(item, { bausteinById, lernpaketById, aufgabeById } = {}) {
  if (!item?.ref_id) return { item_kind: null, ref_titel: null };

  if (item.type === 'system') {
    const baustein = get(bausteinById, item.ref_id);
    return {
      item_kind: isBundleContainer(baustein) ? ITEM_ART.BUENDEL : ITEM_ART.SYSTEMBAUSTEIN,
      ref_titel: baustein?.titel || null,
    };
  }

  const lernpaket = get(lernpaketById, item.ref_id);
  if (lernpaket) {
    return { item_kind: ITEM_ART.LERNPAKET, ref_titel: lernpaket.titel_des_pakets || null };
  }
  const aufgabe = get(aufgabeById, item.ref_id);
  if (aufgabe) {
    return { item_kind: ITEM_ART.ALLGEMEINE_AUFGABE, ref_titel: aufgabe.titel || null };
  }
  // Verwaiste Referenz (Lernpaket/Aufgabe gelöscht) — bewusst null, damit die
  // MBK die Stelle nicht als vollwertiges Element baut.
  return { item_kind: null, ref_titel: null };
}

/**
 * Reichert eine flache Item-Liste (Wurzel gefolgt von ihren Kindern) um
 * `item_kind`, `ref_titel` und — bei Lernpaketen — `lernpaket_innen_modus` an.
 *
 * Der Innen-Modus wird am Lernpaketebündel gepflegt
 * (`bundle_config.lernpaket_modus`) und hier auf jedes Lernpaket-Kind
 * aufgelöst. Lernpakete, die ohne Bündel direkt im Abschnitt stehen, erhalten
 * den Default 'sequenziell'.
 */
export function annotateItemArten(items = [], indices = {}) {
  const lernpaketModusByBundle = new Map();
  for (const it of items) {
    if (it?.type === 'system' && it.instance_id) {
      lernpaketModusByBundle.set(it.instance_id, it?.bundle_config?.lernpaket_modus);
    }
  }

  return items.map((it) => {
    const art = resolveItemArt(it, indices);
    const next = { ...it, ...art };
    if (art.item_kind === ITEM_ART.LERNPAKET) {
      next.lernpaket_innen_modus = resolveLernpaketInnenModus(
        it?.parent_instance_id ? lernpaketModusByBundle.get(it.parent_instance_id) : undefined
      );
    }
    return next;
  });
}