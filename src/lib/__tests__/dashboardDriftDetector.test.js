/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * dashboardDriftDetector.test.js
 *
 * Tests für die vier Drift-Klassen + Edge-Cases.
 */

import { detectDashboardDrift } from '@/lib/dashboardDriftDetector';
import { SEKTOR_TYP } from '@/lib/sektorTypen';

const LT = 'pragmatiker';

const makeKonfig = (sektoren = []) => ({
  minimalist: [],
  pragmatiker: sektoren,
  ehrgeizig: [],
  passioniert: [],
});

describe('detectDashboardDrift – leere Eingaben', () => {
  it('liefert leeren Report bei fehlender Konfiguration', () => {
    const r = detectDashboardDrift({});
    expect(r.totalDrifts).toBe(0);
    expect(r.pragmatiker.totalDrifts).toBe(0);
  });

  it('liefert leeren Report, wenn nichts existiert und nichts referenziert wird', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([]),
      themenfelder: [],
      aufgaben: [],
      lernpakete: [],
    });
    expect(r.totalDrifts).toBe(0);
  });
});

describe('A) missing_themenfelder', () => {
  it('erkennt ein Themenfeld ohne zugehörigen Arbeitsphase-Sektor', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([]),
      themenfelder: [{ id: 'tf1', titel: 'Vulkanismus' }],
    });
    expect(r[LT].missing_themenfelder).toEqual([{ id: 'tf1', titel: 'Vulkanismus' }]);
    expect(r[LT].totalDrifts).toBe(1);
  });

  it('ignoriert Themenfelder, die bereits einen Arbeitsphase-Sektor haben', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          titel: 'Vulkanismus',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf1',
          items: [],
        },
      ]),
      themenfelder: [{ id: 'tf1', titel: 'Vulkanismus' }],
    });
    expect(r[LT].missing_themenfelder).toHaveLength(0);
    expect(r[LT].totalDrifts).toBe(0);
  });

  it('zählt missing_themenfelder pro Lerntyp separat', () => {
    const konf = {
      minimalist: [],
      pragmatiker: [
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf1',
          items: [],
        },
      ],
      ehrgeizig: [],
      passioniert: [],
    };
    const r = detectDashboardDrift({
      konfiguration: konf,
      themenfelder: [{ id: 'tf1', titel: 'A' }],
    });
    // Pragmatiker hat tf1 → kein Drift. Andere drei haben tf1 NICHT → je 1 missing.
    expect(r.pragmatiker.missing_themenfelder).toHaveLength(0);
    expect(r.minimalist.missing_themenfelder).toHaveLength(1);
    expect(r.ehrgeizig.missing_themenfelder).toHaveLength(1);
    expect(r.passioniert.missing_themenfelder).toHaveLength(1);
    expect(r.totalDrifts).toBe(3);
  });
});

describe('B) orphaned_sektoren', () => {
  it('erkennt Sektor, der auf nicht existierendes Themenfeld zeigt', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          titel: 'Erdbeben',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf_gone',
          items: [],
        },
      ]),
      themenfelder: [],
    });
    expect(r[LT].orphaned_sektoren).toEqual([
      { sektor_id: 's1', titel: 'Erdbeben', themenfeld_id: 'tf_gone' },
    ]);
  });

  it('verwendet titel_snapshot, falls vorhanden', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          titel: 'liver title',
          titel_snapshot: 'Snapshot-Titel',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf_gone',
          items: [],
        },
      ]),
      themenfelder: [],
    });
    expect(r[LT].orphaned_sektoren[0].titel).toBe('Snapshot-Titel');
  });

  it('ignoriert Nicht-Arbeitsphase-Sektoren', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          titel: 'Test',
          sektor_typ: SEKTOR_TYP.ZWISCHENTEST,
          themenfeld_id: 'tf_gone', // sollte hier eh nicht stehen, aber zur Sicherheit
          items: [],
        },
      ]),
      themenfelder: [],
    });
    expect(r[LT].orphaned_sektoren).toHaveLength(0);
  });
});

describe('C) ghost_items', () => {
  it('erkennt Item, dessen ref_id weder Aufgabe noch Lernpaket ist', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          titel: 'A',
          sektor_typ: SEKTOR_TYP.INDIVIDUELL,
          items: [{ instance_id: 'i1', type: 'aufgabe', ref_id: 'gone' }],
        },
      ]),
      aufgaben: [],
      lernpakete: [],
    });
    expect(r[LT].ghost_items).toHaveLength(1);
    expect(r[LT].ghost_items[0].ref_id).toBe('gone');
  });

  it('akzeptiert Lernpakete als gültige Aufgaben-Items', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.INDIVIDUELL,
          items: [{ instance_id: 'i1', type: 'aufgabe', ref_id: 'lp1' }],
        },
      ]),
      lernpakete: [{ id: 'lp1', titel_des_pakets: 'Paket' }],
    });
    expect(r[LT].ghost_items).toHaveLength(0);
  });

  it('ignoriert System-Items komplett', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.INDIVIDUELL,
          items: [{ instance_id: 'i1', type: 'system', ref_id: 'sys_diagnose' }],
        },
      ]),
    });
    expect(r[LT].ghost_items).toHaveLength(0);
  });

  it('erkennt Ghost-Items auch innerhalb eines Bündels', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.INDIVIDUELL,
          items: [
            { instance_id: 'b1', type: 'system', ref_id: 'sys_bundle' },
            { instance_id: 'i1', type: 'aufgabe', ref_id: 'gone', parent_instance_id: 'b1' },
          ],
        },
      ]),
      aufgaben: [],
    });
    expect(r[LT].ghost_items).toHaveLength(1);
  });
});

describe('D) misplaced_aufgaben', () => {
  it('erkennt Aufgabe in falschem Themenfeld-Sektor', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          titel: 'Vulkanismus',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf1',
          items: [{ instance_id: 'i1', type: 'aufgabe', ref_id: 'a1' }],
        },
      ]),
      themenfelder: [
        { id: 'tf1', titel: 'Vulkanismus' },
        { id: 'tf2', titel: 'Erdbeben' },
      ],
      aufgaben: [{ id: 'a1', themenfeld_id: 'tf2' }],
    });
    expect(r[LT].misplaced_aufgaben).toHaveLength(1);
    expect(r[LT].misplaced_aufgaben[0].expected_themenfeld_titel).toBe('Erdbeben');
  });

  it('ignoriert Aufgaben ohne themenfeld_id', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf1',
          items: [{ instance_id: 'i1', type: 'aufgabe', ref_id: 'a1' }],
        },
      ]),
      themenfelder: [{ id: 'tf1', titel: 'A' }],
      aufgaben: [{ id: 'a1', themenfeld_id: null }],
    });
    expect(r[LT].misplaced_aufgaben).toHaveLength(0);
  });

  it('ignoriert Aufgaben in Nicht-Arbeitsphase-Sektoren (z. B. Projekte-Sektor)', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.PROJEKTE,
          items: [{ instance_id: 'i1', type: 'aufgabe', ref_id: 'a1' }],
        },
      ]),
      aufgaben: [{ id: 'a1', themenfeld_id: 'tf2' }],
      themenfelder: [{ id: 'tf2', titel: 'X' }],
    });
    expect(r[LT].misplaced_aufgaben).toHaveLength(0);
  });
});

describe('totalDrifts-Aggregation', () => {
  it('summiert über alle vier Drift-Klassen und alle Lerntypen', () => {
    const r = detectDashboardDrift({
      konfiguration: makeKonfig([
        // orphaned (TF tf_gone existiert nicht)
        {
          sektor_id: 's1',
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: 'tf_gone',
          items: [
            // ghost
            { instance_id: 'i1', type: 'aufgabe', ref_id: 'gone' },
          ],
        },
      ]),
      themenfelder: [{ id: 'tf1', titel: 'A' }], // missing in pragmatiker
      aufgaben: [],
    });
    // pragmatiker: 1 orphaned + 1 ghost + 1 missing = 3
    // andere 3 lerntypen: je 1 missing = 3
    expect(r.totalDrifts).toBe(6);
    expect(r.pragmatiker.totalDrifts).toBe(3);
  });
});