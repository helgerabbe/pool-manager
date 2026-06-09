/**
 * schuelerItemMeta.js
 *
 * Reine Helfer, um einem Lernpfad-Item (in der Schüleransicht) einen
 * menschenlesbaren Titel + Untertitel + Icon-Key zu geben. Bewusst getrennt
 * von der Gating-Logik gehalten.
 */

/**
 * Liefert Anzeige-Metadaten für ein Item.
 *
 * @param {object} item               Lernpfad-Item ({ type, ref_id, ... })
 * @param {Map}    aufgabenById        Map<id, Aufgabe/Lernpaket-Shape mit .titel>
 * @param {Map}    bausteinById        Map<baustein_id, SystemBaustein>
 * @returns {{ titel: string, untertitel: string, iconKey: string, platzhalter: string }}
 */
export function getItemMeta(item, aufgabenById = new Map(), bausteinById = new Map()) {
  if (item?.type === 'system') {
    const b = bausteinById.get?.(item.ref_id);
    return {
      titel: b?.titel || 'Baustein',
      untertitel: b?.admin_beschreibung || '',
      iconKey: b?.icon || 'info',
      platzhalter: b?.admin_beschreibung
        ? `Hier erscheint: ${b.titel}`
        : `Hier erscheint der Baustein „${b?.titel || 'Baustein'}“.`,
    };
  }
  // Aufgabe / Lernpaket.
  const a = aufgabenById.get?.(item?.ref_id);
  const titel = a?.titel || a?.titel_des_pakets || 'Aufgabe';
  const typLabel = aufgabeTypLabel(a);
  return {
    titel,
    untertitel: typLabel,
    iconKey: aufgabeIconKey(a),
    platzhalter: `Hier erscheint gleich ${typLabel ? `: ${typLabel}` : 'die Aufgabe'} „${titel}“.`,
  };
}

/**
 * Icon-Key passend zum Aufgaben-/Lernpaket-Typ, damit der Schüler im Menü
 * Lernpaket, Projekt, Übung etc. auf einen Blick unterscheiden kann.
 */
function aufgabeIconKey(a) {
  if (!a) return 'file-text';
  if (a.aufgaben_typ === 'buendel') return 'package';
  if (a.aufgaben_typ === 'projekt_anker' || a.anforderungsebene === '3 - Projekt') return 'rocket';
  if (a.aufgaben_typ === 'prozess') return 'dumbbell';
  if (a.aufgaben_typ === 'handlung') return 'hand';
  return 'file-text';
}

/**
 * Grobe, schülerfreundliche Typ-Bezeichnung einer Aufgabe/eines Lernpakets.
 */
function aufgabeTypLabel(a) {
  if (!a) return 'Aufgabe';
  if (a.aufgaben_typ === 'buendel') return 'Lernpaket';
  if (a.aufgaben_typ === 'projekt_anker' || a.anforderungsebene === '3 - Projekt') return 'Projekt';
  if (a.aufgaben_typ === 'prozess') return 'Übung';
  if (a.aufgaben_typ === 'handlung') return 'Handlungsaufgabe';
  return 'Aufgabe';
}