/**
 * airGapBundleGroups.js
 *
 * Reine Gruppierungs-Logik für die UI-Bundles in Block 3 (Task-Content)
 * und Block 4 (Micro-Briefings) des Air-Gap-Übergabe-Centers.
 *
 * **Wichtig:** Diese Bundles sind ein UI-Konstrukt — sie verändern weder
 * das Datenmodell noch die ExportPrompts-Persistenz. Pro Item in `items`
 * existiert weiterhin genau ein Air-Gap-Record in der DB. Die Gruppen
 * dienen nur dazu, dem Operator eine sinnvolle Vor-Sortierung beim
 * Copy/Download zu geben.
 *
 * Beschlossene Bündelungsregeln (Spec Ticket 1):
 *   - Regel A:  Lernpaket-Bundle (Ebene 3)
 *               → ein Bundle pro Lernpaket. Enthält das Lernpaket-Item
 *                 selbst (Block 3) bzw. alle KI-Aktivitäten dieses
 *                 Pakets (Block 4).
 *   - Regel C:  Projekt-Bundle
 *               → ein Bundle pro AllgemeineAufgabe mit
 *                 aufgaben_typ='projekt_anker'. Enthält die Aufgabe
 *                 selbst (Block 3) bzw. ihr Micro-Briefing (Block 4,
 *                 falls KI-Modus).
 *   - Regel B:  Themenfeld-Bundle
 *               → ein Bundle pro Themenfeld für alle anderen
 *                 AllgemeineAufgaben der Ebene 2/3.
 *   - Regel B-Fallback: Orphan-Bundle
 *               → Sammelbecken für AllgemeineAufgaben ohne
 *                 themenfeld_id.
 *
 * Output-Shape (identisch für Task + Micro):
 *   [
 *     {
 *       key:   string,            // stabiler Identifier (für React keys)
 *       label: string,            // anzeigbarer Titel
 *       kind:  'lernpaket' | 'projekt' | 'themenfeld' | 'orphan',
 *       items: AirGapItem[],      // unverändert durchgereicht
 *     },
 *     ...
 *   ]
 *
 * Die Reihenfolge ist deterministisch: Lernpakete (nach reihenfolge_nummer),
 * dann Projekt-Anker (nach Titel), dann Themenfelder (nach reihenfolge),
 * zuletzt das Orphan-Bundle.
 */

const KIND = {
  LERNPAKET: 'lernpaket',
  PROJEKT: 'projekt',
  THEMENFELD: 'themenfeld',
  ORPHAN: 'orphan',
};

/**
 * Hilfs-Index, der aus den Roh-Entitäten alles aufbaut, was beide
 * Gruppierer brauchen. Trennt die Lookup-Aufbereitung von der
 * eigentlichen Gruppierung — so bleiben die Gruppierer pure und testbar.
 */
function buildLookups({ themenfelder = [], lernpakete = [], allgemeineAufgaben = [] }) {
  const themenfeldById = new Map();
  for (const tf of themenfelder) themenfeldById.set(tf.id, tf);

  const lernpaketById = new Map();
  for (const lp of lernpakete) lernpaketById.set(lp.id, lp);

  const allgemeineAufgabeById = new Map();
  for (const aa of allgemeineAufgaben) allgemeineAufgabeById.set(aa.id, aa);

  return { themenfeldById, lernpaketById, allgemeineAufgabeById };
}

/**
 * Sortiert die finale Gruppen-Liste gemäß Spec:
 *   1. Lernpakete (Regel A)        — nach reihenfolge_nummer
 *   2. Projekt-Anker (Regel C)     — nach Titel
 *   3. Themenfelder (Regel B)      — nach themenfeld.reihenfolge
 *   4. Orphans (Regel B-Fallback)  — am Ende
 *
 * Gruppen ohne Items werden vor dem Sortieren aussortiert.
 */
function sortGroups(groups) {
  const order = { [KIND.LERNPAKET]: 0, [KIND.PROJEKT]: 1, [KIND.THEMENFELD]: 2, [KIND.ORPHAN]: 3 };
  return groups
    .filter((g) => g.items.length > 0)
    .sort((a, b) => {
      const ka = order[a.kind] ?? 99;
      const kb = order[b.kind] ?? 99;
      if (ka !== kb) return ka - kb;
      // innerhalb der Gruppe: nach sortKey (numerisch oder alphabetisch)
      const sa = a.sortKey ?? '';
      const sb = b.sortKey ?? '';
      if (typeof sa === 'number' && typeof sb === 'number') return sa - sb;
      return String(sa).localeCompare(String(sb));
    })
    .map(({ sortKey, ...g }) => g); // sortKey ist intern, nicht Teil des Outputs
}

/**
 * Groupiert Block-3-Items (Task-Content).
 *
 * Erwartete Item-Shape (aus MBKAirGapPanel.taskItems):
 *   {
 *     key: 'lp-<lernpaketId>' | 'aa-<aufgabeId>',
 *     label, subLabel, slug, build()
 *   }
 *
 * Die Klassifikation pro Item:
 *   - key beginnt mit 'lp-' → Lernpaket-Bundle (Regel A)
 *   - key beginnt mit 'aa-' und Aufgabe.aufgaben_typ === 'projekt_anker'
 *       → Projekt-Bundle (Regel C)
 *   - key beginnt mit 'aa-' und Aufgabe.themenfeld_id gesetzt
 *       → Themenfeld-Bundle (Regel B)
 *   - key beginnt mit 'aa-' ohne themenfeld_id
 *       → Orphan-Bundle (Regel B-Fallback)
 */
export function groupTaskItems(items, ctx = {}) {
  const lookups = buildLookups(ctx);
  const { themenfeldById, lernpaketById, allgemeineAufgabeById } = lookups;

  // Pro lernpaket_id eine Gruppe (Regel A).
  const lpGroups = new Map();
  // Pro aufgabe_id (Projekt-Anker) eine Gruppe (Regel C).
  const projektGroups = new Map();
  // Pro themenfeld_id eine Gruppe (Regel B).
  const tfGroups = new Map();
  // Sammler für Orphans (Regel B-Fallback).
  const orphan = { key: 'orphan', label: 'Ohne Themenfeld', kind: KIND.ORPHAN, items: [], sortKey: 'zzz' };

  for (const item of items) {
    if (typeof item?.key !== 'string') continue;

    // Item-Keys aus dem Panel: 'mbk-task-lp::<id>' bzw. 'mbk-task-aa::<id>'.
    // Wir extrahieren die ID nach dem '::' und leiten den Typ aus dem
    // Präfix vor dem '::' ab.
    const parts = item.key.split('::');
    if (parts.length < 2) continue;
    const prefix = parts[0]; // z. B. 'mbk-task-lp' oder 'mbk-task-aa'
    const refId = parts.slice(1).join('::');

    if (prefix.endsWith('-lp')) {
      const lpId = refId;
      const lp = lernpaketById.get(lpId);
      if (!lpGroups.has(lpId)) {
        lpGroups.set(lpId, {
          key: `lp::${lpId}`,
          label: `📦 ${lp?.titel_des_pakets || '(Lernpaket)'}`,
          kind: KIND.LERNPAKET,
          items: [],
          sortKey: lp?.reihenfolge_nummer ?? 9999,
        });
      }
      lpGroups.get(lpId).items.push(item);
      continue;
    }

    if (prefix.endsWith('-aa')) {
      const aaId = refId;
      const aa = allgemeineAufgabeById.get(aaId);

      // Regel C: Projekt-Anker hat Vorrang vor B/Fallback.
      if (aa?.aufgaben_typ === 'projekt_anker') {
        if (!projektGroups.has(aaId)) {
          projektGroups.set(aaId, {
            key: `projekt::${aaId}`,
            label: `🚀 Projekt: ${aa?.titel || '(ohne Titel)'}`,
            kind: KIND.PROJEKT,
            items: [],
            sortKey: aa?.titel || '',
          });
        }
        projektGroups.get(aaId).items.push(item);
        continue;
      }

      // Regel B: Themenfeld-Bundle.
      const tfId = aa?.themenfeld_id || null;
      if (tfId && themenfeldById.has(tfId)) {
        const tf = themenfeldById.get(tfId);
        if (!tfGroups.has(tfId)) {
          tfGroups.set(tfId, {
            key: `tf::${tfId}`,
            label: `📚 Themenfeld: ${tf?.titel || '(ohne Titel)'}`,
            kind: KIND.THEMENFELD,
            items: [],
            sortKey: tf?.reihenfolge ?? 9999,
          });
        }
        tfGroups.get(tfId).items.push(item);
        continue;
      }

      // Regel B-Fallback: Orphan.
      orphan.items.push(item);
    }
  }

  return sortGroups([
    ...lpGroups.values(),
    ...projektGroups.values(),
    ...tfGroups.values(),
    orphan,
  ]);
}

/**
 * Groupiert Block-4-Items (Micro-Briefings, nur KI-Modus).
 *
 * Erwartete Item-Shape (aus MBKAirGapPanel.microItems):
 *   {
 *     key: 'pa-<aktivitaetId>' | 'aa-<aufgabeId>',
 *     label, subLabel, slug, build()
 *   }
 *
 * Klassifikation:
 *   - key beginnt mit 'pa-' → KI-Aktivität → wird via lernpaket_id der
 *       LernpaketPhaseAktivitaet dem zugehörigen Lernpaket-Bundle (A)
 *       zugeordnet.
 *   - key beginnt mit 'aa-' → analog zu Block 3 (Projekt / Themenfeld /
 *       Orphan).
 */
export function groupMicroItems(items, ctx = {}) {
  const { themenfelder = [], lernpakete = [], allgemeineAufgaben = [], phaseAktivitaeten = [] } = ctx;
  const { themenfeldById, lernpaketById, allgemeineAufgabeById } = buildLookups({
    themenfelder, lernpakete, allgemeineAufgaben,
  });
  const phaseAktivitaetById = new Map();
  for (const pa of phaseAktivitaeten) phaseAktivitaetById.set(pa.id, pa);

  const lpGroups = new Map();
  const projektGroups = new Map();
  const tfGroups = new Map();
  const orphan = { key: 'orphan', label: 'Ohne Themenfeld', kind: KIND.ORPHAN, items: [], sortKey: 'zzz' };

  for (const item of items) {
    if (typeof item?.key !== 'string') continue;

    // Item-Keys aus dem Panel: 'mbk-micro-pa::<id>' bzw. 'mbk-micro-aa::<id>'.
    const parts = item.key.split('::');
    if (parts.length < 2) continue;
    const prefix = parts[0];
    const refId = parts.slice(1).join('::');

    if (prefix.endsWith('-pa')) {
      const paId = refId;
      const pa = phaseAktivitaetById.get(paId);
      const lpId = pa?.lernpaket_id || null;
      if (lpId) {
        const lp = lernpaketById.get(lpId);
        if (!lpGroups.has(lpId)) {
          lpGroups.set(lpId, {
            key: `lp::${lpId}`,
            label: `📦 ${lp?.titel_des_pakets || '(Lernpaket)'}`,
            kind: KIND.LERNPAKET,
            items: [],
            sortKey: lp?.reihenfolge_nummer ?? 9999,
          });
        }
        lpGroups.get(lpId).items.push(item);
        continue;
      }
      // Aktivität ohne Lernpaket (sollte nicht vorkommen) → Orphan.
      orphan.items.push(item);
      continue;
    }

    if (prefix.endsWith('-aa')) {
      const aaId = refId;
      const aa = allgemeineAufgabeById.get(aaId);

      if (aa?.aufgaben_typ === 'projekt_anker') {
        if (!projektGroups.has(aaId)) {
          projektGroups.set(aaId, {
            key: `projekt::${aaId}`,
            label: `🚀 Projekt: ${aa?.titel || '(ohne Titel)'}`,
            kind: KIND.PROJEKT,
            items: [],
            sortKey: aa?.titel || '',
          });
        }
        projektGroups.get(aaId).items.push(item);
        continue;
      }

      const tfId = aa?.themenfeld_id || null;
      if (tfId && themenfeldById.has(tfId)) {
        const tf = themenfeldById.get(tfId);
        if (!tfGroups.has(tfId)) {
          tfGroups.set(tfId, {
            key: `tf::${tfId}`,
            label: `📚 Themenfeld: ${tf?.titel || '(ohne Titel)'}`,
            kind: KIND.THEMENFELD,
            items: [],
            sortKey: tf?.reihenfolge ?? 9999,
          });
        }
        tfGroups.get(tfId).items.push(item);
        continue;
      }

      orphan.items.push(item);
    }
  }

  return sortGroups([
    ...lpGroups.values(),
    ...projektGroups.values(),
    ...tfGroups.values(),
    orphan,
  ]);
}

export const AIR_GAP_BUNDLE_KIND = KIND;