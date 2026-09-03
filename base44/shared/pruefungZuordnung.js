/**
 * pruefungZuordnung.js
 *
 * Kategorie 6 der Vollständigkeitsprüfung: verwaiste Struktur.
 *
 * Wird ein Themenfeld gelöscht, bleiben seine Lernpakete und Aufgaben in der
 * Einheit stehen — mit einer themenfeld_id, die auf nichts mehr zeigt. In den
 * Arbeitsreitern sind sie dadurch schwer zu finden, im Export-Payload reisen
 * sie aber mit, und der Bau kann sie nirgends einhängen. Deshalb werden sie
 * hier gemeldet, damit die Lehrkraft sie neu zuordnen oder löschen kann.
 */

/** true, wenn die Zuordnung fehlt ODER auf ein gelöschtes Themenfeld zeigt. */
function istVerwaist(record, themenfeldIds) {
  const id = record?.themenfeld_id;
  return !id || !themenfeldIds.has(id);
}

export function findeVerwaisteZuordnungen({ lernpakete = [], aufgaben = [], themenfelder = [] }) {
  const ids = new Set((themenfelder || []).map((tf) => tf.id));
  // Ohne jedes Themenfeld ist die Einheit einfach noch nicht strukturiert —
  // das ist kein verwaister Rest und soll nicht als Befund erscheinen.
  if (ids.size === 0) return [];

  const treffer = [];

  for (const lp of lernpakete) {
    if (lp?.sync_status === 'to_delete' || !istVerwaist(lp, ids)) continue;
    treffer.push({
      ziel_typ: 'lernpaket',
      ziel_id: lp.id,
      ziel_titel: lp.titel_des_pakets || 'Lernpaket ohne Titel',
      lernpaket_id: lp.id,
      lernpaket_titel: lp.titel_des_pakets || '',
      kandidat: {
        kategorie: 6,
        schwere: 'stoert',
        befund: lp.themenfeld_id
          ? 'Dieses Lernpaket hängt an einem Themenfeld, das es nicht mehr gibt.'
          : 'Dieses Lernpaket ist keinem Themenfeld zugeordnet.',
        vorschlag: 'In der Struktur der Einheit einem Themenfeld zuordnen – oder das Lernpaket löschen, wenn es nicht mehr gebraucht wird.',
      },
    });
  }

  for (const a of aufgaben) {
    if (a?.sync_status === 'to_delete' || !istVerwaist(a, ids)) continue;
    treffer.push({
      ziel_typ: 'allgemeine_aufgabe',
      ziel_id: a.id,
      ziel_titel: a.titel || 'Aufgabe ohne Titel',
      kandidat: {
        kategorie: 6,
        schwere: 'stoert',
        befund: a.themenfeld_id
          ? 'Diese Aufgabe hängt an einem Themenfeld, das es nicht mehr gibt.'
          : 'Diese Aufgabe ist keinem Themenfeld zugeordnet.',
        vorschlag: 'Im Aufgaben-Reiter unter „Ohne Themenfeld" öffnen und einem Themenfeld zuordnen – oder löschen.',
      },
    });
  }

  return treffer;
}