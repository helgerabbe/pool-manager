/**
 * lernlandkarteStatus.js
 *
 * Rechnet pro Knoten der Lernlandkarte Fortschritt und Sperre aus.
 *
 * Fortschritt:
 *  - lernpaket-Knoten: Selbsteinschätzung des Lernziels ('sicher' = geschafft).
 *    Ehrgeizig/Passioniert dürfen genau das per Knopf selbst setzen.
 *  - aufgaben-Knoten: Anteil der Aufgaben, für die schon Fortschritt vorliegt.
 *  - themenfeld/vorwissen: Mittel der Kinder (aggregierter Ring).
 *
 * Sperre (Gating):
 *  - minimalist: Lernpaket-Knoten sind gesperrt, solange ein früheres im
 *    gleichen Themenfeld noch nicht geschafft ist (schrittweises Freischalten).
 *  - alle anderen Lerntypen: nichts gesperrt.
 */

import { anteilVon } from '@/lib/lernlandkarteEinschaetzung';

export const OFFENE_LERNTYPEN = ['ehrgeizig', 'passioniert'];

export function darfSelbstMarkieren(lerntyp) {
  return OFFENE_LERNTYPEN.includes(lerntyp);
}

export function berechneStatus({
  nodes,
  lerntyp,
  einschaetzungByZiel = {},
  bearbeiteteAufgabenIds = [],
}) {
  const bearbeitet = new Set(bearbeiteteAufgabenIds);
  const status = {};

  // 1. Blätter/Basiswerte
  for (const n of nodes) {
    if (n.typ === 'lernpaket') {
      const einschaetzung = einschaetzungByZiel[n.refs.lernzielId] || null;
      status[n.id] = {
        einschaetzung,
        geschafft: einschaetzung === 'sicher',
        anteil: anteilVon(einschaetzung),
        gesperrt: false,
      };
    } else if (n.typ === 'aufgaben') {
      const ids = n.refs.aufgabenIds || [];
      const fertig = ids.filter((id) => bearbeitet.has(id)).length;
      status[n.id] = {
        geschafft: ids.length > 0 && fertig === ids.length,
        anteil: ids.length > 0 ? fertig / ids.length : 0,
        gesperrt: false,
        zaehler: { fertig, gesamt: ids.length },
      };
    } else {
      status[n.id] = { geschafft: false, anteil: 0, gesperrt: false };
    }
  }

  // 2. Aggregation von unten nach oben (Themenfeld, Vorwissen, Wurzel)
  const kinder = new Map();
  for (const n of nodes) {
    if (!n.parentId) continue;
    if (!kinder.has(n.parentId)) kinder.set(n.parentId, []);
    kinder.get(n.parentId).push(n);
  }
  const aggregiere = (node) => {
    const list = kinder.get(node.id) || [];
    list.forEach(aggregiere);
    if (node.typ === 'lernpaket' || node.typ === 'aufgaben') return status[node.id].anteil;
    const relevant = list.filter((c) => c.typ === 'lernpaket' || c.typ === 'aufgaben');
    if (relevant.length === 0) return status[node.id].anteil;
    const anteil =
      relevant.reduce((s, c) => s + (status[c.id]?.anteil || 0), 0) / relevant.length;
    status[node.id] = {
      ...status[node.id],
      anteil,
      geschafft: anteil >= 1,
      zaehler: {
        fertig: relevant.filter((c) => status[c.id]?.geschafft).length,
        gesamt: relevant.length,
      },
    };
    return anteil;
  };
  const wurzel = nodes.find((n) => !n.parentId);
  if (wurzel) aggregiere(wurzel);

  // 3. Gating für Minimalisten: der nächste offene Knoten je Themenfeld ist frei
  if (lerntyp === 'minimalist') {
    for (const tf of nodes.filter((n) => n.typ === 'themenfeld')) {
      const reihe = nodes.filter((n) => n.parentId === tf.id && n.typ === 'lernpaket');
      let naechsterFrei = true;
      for (const lp of reihe) {
        if (status[lp.id].geschafft) continue;
        if (naechsterFrei) {
          naechsterFrei = false;
        } else {
          status[lp.id].gesperrt = true;
          for (const kind of nodes.filter((n) => n.parentId === lp.id)) {
            status[kind.id].gesperrt = true;
          }
        }
      }
    }
  }

  return status;
}