/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * autoFillBundle.test.js
 *
 * Phase D des Epic „Semantische Dashboard-Sektoren":
 *   - getAutoFillCandidates filtert je BundleKind korrekt.
 *   - bulkAddItemsToBundle hängt Children mit korrekter parent_instance_id an.
 *   - Anti-Duplikat-Schutz greift sowohl beim Filter als auch beim Bulk-Insert.
 */

import {
  getAutoFillCandidates,
  bulkAddItemsToBundle,
  getUsedAufgabenIds,
} from '@/lib/lernpfadeUtils';

const aufgaben = [
  { id: 'a1', themenfeld_id: 'tf-1', aufgaben_typ: 'inhalt' },
  { id: 'a2', themenfeld_id: 'tf-1', aufgaben_typ: 'auswahl_buendel' },
  { id: 'a3', themenfeld_id: 'tf-2', aufgaben_typ: 'inhalt' },
  { id: 'a4', themenfeld_id: 'tf-1', aufgaben_typ: 'inhalt', anforderungsebene: '3 - Projekt' },
  { id: 'p1', themenfeld_id: 'tf-1', aufgaben_typ: 'projekt_anker' },
  { id: 'p2', themenfeld_id: 'tf-2', anforderungsebene: '3 - Projekt' },
];
const lernpakete = [
  { id: 'lp1', themenfeld_id: 'tf-1' },
  { id: 'lp2', themenfeld_id: 'tf-1' },
  { id: 'lp3', themenfeld_id: 'tf-2' },
];

describe('getAutoFillCandidates', () => {
  it('Lernpakete-Bündel: filtert nach themenfeld_id, schließt platzierte aus', () => {
    const used = new Set(['lp2']);
    const result = getAutoFillCandidates({
      bundleKind: 'lernpakete',
      themenfeldId: 'tf-1',
      lernpakete,
      aufgaben,
      usedAufgabenIds: used,
    });
    expect(result).toEqual(['lp1']);
  });

  it('Lernpakete-Bündel ohne themenfeld_id liefert leeres Array', () => {
    const result = getAutoFillCandidates({
      bundleKind: 'lernpakete',
      themenfeldId: null,
      lernpakete,
      aufgaben,
      usedAufgabenIds: new Set(),
    });
    expect(result).toEqual([]);
  });

  it('Aufgaben-Bündel: filtert nach themenfeld_id, schließt Projekte aus', () => {
    const result = getAutoFillCandidates({
      bundleKind: 'aufgaben',
      themenfeldId: 'tf-1',
      aufgaben,
      lernpakete,
      usedAufgabenIds: new Set(),
    });
    // a1 (inhalt) + a2 (auswahl_buendel). a4 ist Projekt, p1 ist projekt_anker.
    expect(result.sort()).toEqual(['a1', 'a2']);
  });

  it('Aufgaben-Bündel: schließt platzierte Aufgaben aus', () => {
    const result = getAutoFillCandidates({
      bundleKind: 'aufgaben',
      themenfeldId: 'tf-1',
      aufgaben,
      lernpakete,
      usedAufgabenIds: new Set(['a1']),
    });
    expect(result).toEqual(['a2']);
  });

  it('Projekt-Bündel: themenfeld-unabhängig, nimmt Ebene-3 + projekt_anker', () => {
    const result = getAutoFillCandidates({
      bundleKind: 'projekte',
      themenfeldId: 'tf-1', // wird ignoriert
      aufgaben,
      lernpakete,
      usedAufgabenIds: new Set(),
    });
    expect(result.sort()).toEqual(['a4', 'p1', 'p2']);
  });

  it('Projekt-Bündel: schließt platzierte Projekte aus', () => {
    const result = getAutoFillCandidates({
      bundleKind: 'projekte',
      themenfeldId: null,
      aufgaben,
      lernpakete,
      usedAufgabenIds: new Set(['p1']),
    });
    expect(result.sort()).toEqual(['a4', 'p2']);
  });

  it('Unbekannter bundleKind liefert leeres Array', () => {
    expect(getAutoFillCandidates({ bundleKind: null })).toEqual([]);
    expect(getAutoFillCandidates({ bundleKind: 'quatsch' })).toEqual([]);
  });
});

describe('bulkAddItemsToBundle', () => {
  const baseKonfig = () => ({
    minimalist: [],
    pragmatiker: [
      {
        sektor_id: 'sec_1',
        titel: 'A',
        modus: 'sequenziell',
        sektor_typ: 'arbeitsphase_themenfeld',
        themenfeld_id: 'tf-1',
        items: [
          {
            instance_id: 'inst_bundle_1',
            type: 'system',
            ref_id: 'sys_platzhalter_brian_buendel',
            parent_instance_id: null,
          },
        ],
      },
    ],
    ehrgeizig: [],
    passioniert: [],
  });

  it('hängt Children ans Bündel an, mit korrekter parent_instance_id', () => {
    const result = bulkAddItemsToBundle(
      baseKonfig(),
      'pragmatiker',
      'sec_1',
      'inst_bundle_1',
      ['a1', 'a2']
    );
    expect(result.addedCount).toBe(2);
    expect(result.skippedCount).toBe(0);
    const items = result.konfig.pragmatiker[0].items;
    expect(items).toHaveLength(3);
    expect(items[1].ref_id).toBe('a1');
    expect(items[1].parent_instance_id).toBe('inst_bundle_1');
    expect(items[2].ref_id).toBe('a2');
    expect(items[2].parent_instance_id).toBe('inst_bundle_1');
  });

  it('überspringt bereits platzierte Aufgaben', () => {
    const konfig = baseKonfig();
    konfig.pragmatiker[0].items.push({
      instance_id: 'inst_x',
      type: 'aufgabe',
      ref_id: 'a1',
      parent_instance_id: null,
    });
    const result = bulkAddItemsToBundle(konfig, 'pragmatiker', 'sec_1', 'inst_bundle_1', [
      'a1',
      'a2',
    ]);
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    const newChild = result.konfig.pragmatiker[0].items.find(
      (it) => it.parent_instance_id === 'inst_bundle_1'
    );
    expect(newChild.ref_id).toBe('a2');
  });

  it('dedupliziert innerhalb eines Batches', () => {
    const result = bulkAddItemsToBundle(
      baseKonfig(),
      'pragmatiker',
      'sec_1',
      'inst_bundle_1',
      ['a1', 'a1', 'a2']
    );
    expect(result.addedCount).toBe(2);
    expect(result.skippedCount).toBe(1);
  });

  it('liefert die ursprüngliche Konfig zurück, wenn nichts einzufügen ist', () => {
    const konfig = baseKonfig();
    const result = bulkAddItemsToBundle(konfig, 'pragmatiker', 'sec_1', 'inst_bundle_1', []);
    expect(result.konfig).toBe(konfig);
    expect(result.addedCount).toBe(0);
  });

  it('nach bulk-add zählt die Aufgabe in getUsedAufgabenIds', () => {
    const result = bulkAddItemsToBundle(
      baseKonfig(),
      'pragmatiker',
      'sec_1',
      'inst_bundle_1',
      ['a1']
    );
    const used = getUsedAufgabenIds(result.konfig, 'pragmatiker');
    expect(used.has('a1')).toBe(true);
  });
});