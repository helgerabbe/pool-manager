/**
 * airGapBundleGroups.test.js
 *
 * Strukturtests für die UI-Bündelungs-Logik (Ticket 1).
 * Wir prüfen, dass die vier Regeln (A: Lernpaket, C: Projekt, B:
 * Themenfeld, B-Fallback: Orphan) korrekt greifen, dass die
 * Reihenfolge deterministisch ist und dass die Items 1:1 weitergereicht
 * werden.
 */
import { describe, it, expect } from 'vitest';
import { groupTaskItems, groupMicroItems, AIR_GAP_BUNDLE_KIND } from '../airGapBundleGroups';

const themenfelder = [
  { id: 'tf1', titel: 'Grundlagen', reihenfolge: 1 },
  { id: 'tf2', titel: 'Vertiefung', reihenfolge: 2 },
];
const lernpakete = [
  { id: 'lpA', titel_des_pakets: 'Paket A', reihenfolge_nummer: 2 },
  { id: 'lpB', titel_des_pakets: 'Paket B', reihenfolge_nummer: 1 },
];
const allgemeineAufgaben = [
  { id: 'aa-projekt1', titel: 'Klima-Projekt', aufgaben_typ: 'projekt_anker', themenfeld_id: 'tf1' },
  { id: 'aa-tf1',      titel: 'Aufgabe in TF1', aufgaben_typ: 'inhalt', themenfeld_id: 'tf1' },
  { id: 'aa-tf2',      titel: 'Aufgabe in TF2', aufgaben_typ: 'inhalt', themenfeld_id: 'tf2' },
  { id: 'aa-orphan',   titel: 'Aufgabe ohne TF', aufgaben_typ: 'inhalt', themenfeld_id: null },
];

// Item-Keys spiegeln das Format wider, das das Panel tatsächlich erzeugt:
// 'mbk-task-lp::<lernpaketId>' bzw. 'mbk-task-aa::<aufgabeId>'.
const taskItems = [
  { key: 'mbk-task-lp::lpA', label: 'Paket A' },
  { key: 'mbk-task-lp::lpB', label: 'Paket B' },
  { key: 'mbk-task-aa::aa-projekt1', label: 'Klima-Projekt' },
  { key: 'mbk-task-aa::aa-tf1', label: 'TF1-Aufgabe' },
  { key: 'mbk-task-aa::aa-tf2', label: 'TF2-Aufgabe' },
  { key: 'mbk-task-aa::aa-orphan', label: 'Orphan' },
];

describe('groupTaskItems (Block 3)', () => {
  it('bündelt Lernpakete zu Regel-A-Gruppen, sortiert nach reihenfolge_nummer', () => {
    const groups = groupTaskItems(taskItems, { themenfelder, lernpakete, allgemeineAufgaben });
    const lpGroups = groups.filter((g) => g.kind === AIR_GAP_BUNDLE_KIND.LERNPAKET);
    expect(lpGroups).toHaveLength(2);
    // lpB hat reihenfolge 1, lpA hat reihenfolge 2 → lpB zuerst
    expect(lpGroups[0].key).toBe('lp::lpB');
    expect(lpGroups[1].key).toBe('lp::lpA');
    expect(lpGroups[0].items).toHaveLength(1);
  });

  it('erkennt Projekt-Anker als eigenes Bundle (Regel C, vor Regel B)', () => {
    const groups = groupTaskItems(taskItems, { themenfelder, lernpakete, allgemeineAufgaben });
    const projekt = groups.filter((g) => g.kind === AIR_GAP_BUNDLE_KIND.PROJEKT);
    expect(projekt).toHaveLength(1);
    expect(projekt[0].items[0].key).toBe('mbk-task-aa::aa-projekt1');
    // Der Projekt-Anker darf NICHT zusätzlich im TF1-Bundle landen.
    const tf1 = groups.find((g) => g.key === 'tf::tf1');
    expect(tf1.items.find((i) => i.key === 'mbk-task-aa::aa-projekt1')).toBeUndefined();
  });

  it('bündelt restliche Aufgaben pro Themenfeld (Regel B), sortiert nach themenfeld.reihenfolge', () => {
    const groups = groupTaskItems(taskItems, { themenfelder, lernpakete, allgemeineAufgaben });
    const tfGroups = groups.filter((g) => g.kind === AIR_GAP_BUNDLE_KIND.THEMENFELD);
    expect(tfGroups).toHaveLength(2);
    expect(tfGroups[0].key).toBe('tf::tf1');
    expect(tfGroups[1].key).toBe('tf::tf2');
    expect(tfGroups[0].items.map((i) => i.key)).toEqual(['mbk-task-aa::aa-tf1']);
  });

  it('sammelt themenfeldlose Aufgaben in einem Orphan-Bundle (Regel B-Fallback)', () => {
    const groups = groupTaskItems(taskItems, { themenfelder, lernpakete, allgemeineAufgaben });
    const orphan = groups.find((g) => g.kind === AIR_GAP_BUNDLE_KIND.ORPHAN);
    expect(orphan).toBeDefined();
    expect(orphan.items.map((i) => i.key)).toEqual(['mbk-task-aa::aa-orphan']);
  });

  it('liefert Gruppen in der Reihenfolge: Lernpakete → Projekte → Themenfelder → Orphans', () => {
    const groups = groupTaskItems(taskItems, { themenfelder, lernpakete, allgemeineAufgaben });
    const kinds = groups.map((g) => g.kind);
    // Erst alle 'lernpaket', dann 'projekt', dann 'themenfeld', dann 'orphan'.
    const idx = (k) => kinds.indexOf(k);
    expect(idx(AIR_GAP_BUNDLE_KIND.LERNPAKET)).toBeLessThan(idx(AIR_GAP_BUNDLE_KIND.PROJEKT));
    expect(idx(AIR_GAP_BUNDLE_KIND.PROJEKT)).toBeLessThan(idx(AIR_GAP_BUNDLE_KIND.THEMENFELD));
    expect(idx(AIR_GAP_BUNDLE_KIND.THEMENFELD)).toBeLessThan(idx(AIR_GAP_BUNDLE_KIND.ORPHAN));
  });

  it('lässt leere Gruppen weg', () => {
    const groups = groupTaskItems(
      [{ key: 'mbk-task-lp::lpA', label: 'Paket A' }],
      { themenfelder, lernpakete, allgemeineAufgaben }
    );
    // Nur das eine Lernpaket-Bundle.
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe(AIR_GAP_BUNDLE_KIND.LERNPAKET);
  });

  it('reicht Items unverändert durch (kein Mutate)', () => {
    const original = [{ key: 'mbk-task-lp::lpA', label: 'Paket A', custom: 42 }];
    const groups = groupTaskItems(original, { themenfelder, lernpakete, allgemeineAufgaben });
    expect(groups[0].items[0]).toBe(original[0]); // gleiche Referenz
    expect(groups[0].items[0].custom).toBe(42);
  });
});

describe('groupMicroItems (Block 4)', () => {
  const phaseAktivitaeten = [
    { id: 'paA1', lernpaket_id: 'lpA', erstellungs_modus: 'ki' },
    { id: 'paB1', lernpaket_id: 'lpB', erstellungs_modus: 'ki' },
    { id: 'paOrphan', lernpaket_id: null, erstellungs_modus: 'ki' },
  ];

  it('mappt KI-Aktivitäten via lernpaket_id auf das Lernpaket-Bundle (Regel A)', () => {
    const groups = groupMicroItems(
      [
        { key: 'mbk-micro-pa::paA1', label: 'Aktivität in A' },
        { key: 'mbk-micro-pa::paB1', label: 'Aktivität in B' },
      ],
      { themenfelder, lernpakete, allgemeineAufgaben, phaseAktivitaeten }
    );
    const lpGroups = groups.filter((g) => g.kind === AIR_GAP_BUNDLE_KIND.LERNPAKET);
    expect(lpGroups).toHaveLength(2);
    const lpA = lpGroups.find((g) => g.key === 'lp::lpA');
    expect(lpA.items[0].key).toBe('mbk-micro-pa::paA1');
  });

  it('packt KI-AllgemeineAufgaben analog zu Block 3 in Projekt/Themenfeld/Orphan', () => {
    const groups = groupMicroItems(
      [
        { key: 'mbk-micro-aa::aa-projekt1', label: 'Projekt-Briefing' },
        { key: 'mbk-micro-aa::aa-tf1', label: 'TF1-Briefing' },
        { key: 'mbk-micro-aa::aa-orphan', label: 'Orphan-Briefing' },
      ],
      { themenfelder, lernpakete, allgemeineAufgaben, phaseAktivitaeten: [] }
    );
    expect(groups.find((g) => g.kind === AIR_GAP_BUNDLE_KIND.PROJEKT)).toBeDefined();
    expect(groups.find((g) => g.key === 'tf::tf1')).toBeDefined();
    expect(groups.find((g) => g.kind === AIR_GAP_BUNDLE_KIND.ORPHAN)).toBeDefined();
  });

  it('packt Aktivitäten ohne lernpaket_id ins Orphan-Bundle', () => {
    const groups = groupMicroItems(
      [{ key: 'mbk-micro-pa::paOrphan', label: 'verwaiste Aktivität' }],
      { themenfelder, lernpakete, allgemeineAufgaben, phaseAktivitaeten }
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe(AIR_GAP_BUNDLE_KIND.ORPHAN);
    expect(groups[0].items[0].key).toBe('mbk-micro-pa::paOrphan');
  });
});