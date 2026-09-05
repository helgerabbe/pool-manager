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
          refs: {
            lernzielId: ziel.id,
            lernpaketId: paket.id,
            lernpaketTitel: paket.titel_des_pakets,
            themenfeldId: gruppe.id,
          },
        });
        // Der Wissensspeicher ist bewusst KEIN eigener Knoten mehr — er ist
        // ein Knopf am Lernziel im Inspektor (weniger Knoten, klarere Karte).
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

  return { nodes, positionen: fokusLayout(nodes, 'root') };
}

/**
 * Fokus-Anordnung: Der angeklickte Knoten steht IMMER in der Mitte, seine
 * Kinder legen sich als Kreis darum, der Elternknoten sitzt links daneben.
 *
 * Nur eine Ebene gleichzeitig sichtbar zu ordnen löst das Überlappungs-
 * problem des früheren Gesamt-Layouts: Der Kreisradius wächst mit der Anzahl
 * der Kinder, sodass zwischen zwei Karten immer genug Bogenlänge bleibt.
 */
export function fokusLayout(nodes, fokusId) {
  const pos = {};
  const fokus = nodes.find((n) => n.id === fokusId) || nodes.find((n) => !n.parentId);
  if (!fokus) return pos;

  pos[fokus.id] = { x: 0, y: 0 };

  const eltern = fokus.parentId ? nodes.find((n) => n.id === fokus.parentId) : null;
  if (eltern) pos[eltern.id] = { x: -560, y: 0 };

  const kinder = nodes.filter((n) => n.parentId === fokus.id);
  const anzahl = kinder.length;
  if (anzahl === 0) return pos;

  // Mindestabstand von 340 px Bogenlänge je Karte — daraus folgt der Radius.
  const spanne = eltern ? Math.PI * 1.25 : Math.PI * 2;
  const radius = Math.max(380, (anzahl * 340) / spanne);

  kinder.forEach((kind, i) => {
    let winkel;
    if (!eltern) {
      winkel = -Math.PI / 2 + (i * (Math.PI * 2)) / anzahl;
    } else if (anzahl === 1) {
      winkel = 0;
    } else {
      winkel = -spanne / 2 + (i * spanne) / (anzahl - 1);
    }
    pos[kind.id] = { x: Math.cos(winkel) * radius, y: Math.sin(winkel) * radius };
  });

  return pos;
}

/** Kinder eines Knotens (für Aufdeck-Logik). */
export function kinderVon(nodes, id) {
  return nodes.filter((n) => n.parentId === id);
}