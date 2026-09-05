/**
 * lernlandkarteGraph.js
 *
 * Baut aus den vorhandenen Strukturen der Einheit den Graphen der
 * Lernlandkarte — und rechnet die radiale Anordnung aus.
 *
 * Es gibt bewusst KEINE eigene Graph-Entity: Die Karte entsteht zur
 * Laufzeit aus Themenfeldern, Lernpaketen, Lernzielen, allgemeinen Aufgaben
 * und den verknüpften Basispaketen (Vorwissen).
 *
 * Knotenarten:
 *   einheit        — Wurzel
 *   themenfeld     — Leitfrage des Themenfelds
 *   lernpaket      — Leitfrage eines Lernziels (Sprung: Wissensspeicher)
 *   wissensspeicher— Kompaktwissen des Lernpakets
 *   aufgaben       — Sammelknoten AM THEMENFELD (Aufgaben hängen bewusst dort)
 *   vorwissen      — Rückwärtsknoten
 *   basispaket     — verknüpftes Basispaket (nur eine Ebene tief)
 */

const RADIEN = [0, 330, 620, 830];

/** Sortiert stabil nach einem Zahlenfeld. */
const nachZahl = (feld) => (a, b) => (a[feld] || 0) - (b[feld] || 0);

export function buildLernlandkarte({
  einheitTitel,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  aufgaben = [],
  vorwissenPakete = [],
}) {
  const nodes = [];
  const push = (n) => {
    nodes.push(n);
    return n;
  };

  push({
    id: 'root',
    typ: 'einheit',
    parentId: null,
    titel: einheitTitel || 'Deine Einheit',
    kurz: 'Das ist deine Einheit. Klick dich Schritt für Schritt weiter — jeder Zweig deckt neue Bereiche auf.',
  });

  const pakete = [...lernpakete]
    .filter((p) => p.sync_status !== 'to_delete')
    .sort(nachZahl('reihenfolge_nummer'));

  const zieleByPaket = new Map();
  for (const z of lernziele) {
    if (!zieleByPaket.has(z.lernpaket_id)) zieleByPaket.set(z.lernpaket_id, []);
    zieleByPaket.get(z.lernpaket_id).push(z);
  }

  const felder = [...themenfelder].sort(nachZahl('reihenfolge'));
  const gruppen = felder.map((tf) => ({
    id: tf.id,
    titel: tf.leitfrage?.trim() || tf.titel,
    kurz: tf.beschreibung || '',
    pakete: pakete.filter((p) => p.themenfeld_id === tf.id),
  }));

  const ohneFeld = pakete.filter((p) => !felder.some((tf) => tf.id === p.themenfeld_id));
  if (ohneFeld.length > 0) {
    gruppen.push({ id: '_rest', titel: 'Weitere Themen', kurz: '', pakete: ohneFeld });
  }

  for (const gruppe of gruppen) {
    const tfNodeId = `tf:${gruppe.id}`;
    push({
      id: tfNodeId,
      typ: 'themenfeld',
      parentId: 'root',
      titel: gruppe.titel,
      kurz: gruppe.kurz,
      refs: { themenfeldId: gruppe.id },
    });

    for (const paket of gruppe.pakete) {
      for (const ziel of zieleByPaket.get(paket.id) || []) {
        const lpNodeId = `lz:${ziel.id}`;
        push({
          id: lpNodeId,
          typ: 'lernpaket',
          parentId: tfNodeId,
          titel: ziel.schueler_uebersetzung?.trim() || ziel.formulierung_fachsprache,
          kurz: `Gehört zum Lernpaket „${paket.titel_des_pakets}".`,
          refs: {
            lernzielId: ziel.id,
            lernpaketId: paket.id,
            lernpaketTitel: paket.titel_des_pakets,
            themenfeldId: gruppe.id,
          },
        });
        push({
          id: `ws:${ziel.id}`,
          typ: 'wissensspeicher',
          parentId: lpNodeId,
          titel: 'Wissensspeicher',
          kurz: 'Hier steht das Wichtigste kurz zusammengefasst — gut zum Nachschlagen.',
          refs: { lernpaketId: paket.id, lernpaketTitel: paket.titel_des_pakets },
        });
      }
    }

    const tfAufgaben = aufgaben.filter(
      (a) => a.themenfeld_id === gruppe.id && a.sync_status !== 'to_delete'
    );
    if (tfAufgaben.length > 0) {
      push({
        id: `auf:${gruppe.id}`,
        typ: 'aufgaben',
        parentId: tfNodeId,
        titel: 'Zu den Aufgaben',
        kurz: `Hier findest du ${tfAufgaben.length} ${
          tfAufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'
        } zu diesem Thema. Sie können mehrere Lernpakete gleichzeitig betreffen.`,
        refs: {
          themenfeldId: gruppe.id,
          aufgabenIds: tfAufgaben.map((a) => a.id),
        },
      });
    }
  }

  if (vorwissenPakete.length > 0) {
    push({
      id: 'vorwissen',
      typ: 'vorwissen',
      parentId: 'root',
      titel: 'Vorwissen',
      kurz: 'Das solltest du schon können. Wenn dir etwas fehlt, schau hier nach.',
    });
    for (const paket of vorwissenPakete) {
      push({
        id: `bp:${paket.id}`,
        typ: 'basispaket',
        parentId: 'vorwissen',
        titel: paket.titel_des_pakets || paket.titel,
        kurz: 'Führt dich direkt zum Wissensspeicher dieses Basispakets.',
        refs: { lernpaketId: paket.id, lernpaketTitel: paket.titel_des_pakets || paket.titel },
      });
    }
  }

  return { nodes, positionen: radialLayout(nodes) };
}

/**
 * Radiale Anordnung: Wurzel in der Mitte, Kinder verteilen sich im Kreissektor
 * um ihren Elternknoten. Der Vorwissen-Ast zeigt bewusst „rückwärts" (links).
 */
export function radialLayout(nodes) {
  const kinder = new Map();
  for (const n of nodes) {
    if (!n.parentId) continue;
    if (!kinder.has(n.parentId)) kinder.set(n.parentId, []);
    kinder.get(n.parentId).push(n);
  }

  const pos = {};
  const setze = (node, winkel, spanne, tiefe) => {
    const r = RADIEN[Math.min(tiefe, RADIEN.length - 1)];
    pos[node.id] = { x: Math.cos(winkel) * r, y: Math.sin(winkel) * r, winkel, tiefe };

    const list = kinder.get(node.id) || [];
    if (list.length === 0) return;

    const istWurzel = tiefe === 0;
    const vorwissen = list.filter((c) => c.typ === 'vorwissen');
    const rest = list.filter((c) => c.typ !== 'vorwissen');

    if (istWurzel && vorwissen.length > 0) {
      setze(vorwissen[0], Math.PI, Math.PI / 2, 1);
    }

    const nutzbar = istWurzel && vorwissen.length > 0 ? Math.PI * 1.35 : spanne;
    const start = istWurzel
      ? -Math.PI * 0.5 - nutzbar / 2 + nutzbar / (rest.length * 2 || 1)
      : winkel - nutzbar / 2 + nutzbar / (rest.length * 2 || 1);
    const schritt = rest.length > 1 ? nutzbar / rest.length : 0;

    rest.forEach((kind, i) => {
      const kindWinkel = rest.length === 1 && !istWurzel ? winkel : start + i * schritt;
      setze(kind, kindWinkel, Math.max(schritt * 0.85, Math.PI / 9), tiefe + 1);
    });
  };

  const wurzel = nodes.find((n) => !n.parentId);
  if (wurzel) setze(wurzel, 0, Math.PI * 2, 0);
  return pos;
}

/** Kinder eines Knotens (für Aufdeck-Logik). */
export function kinderVon(nodes, id) {
  return nodes.filter((n) => n.parentId === id);
}