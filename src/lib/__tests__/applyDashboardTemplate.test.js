/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * applyDashboardTemplate.test.js
 *
 * Tests für die Apply-Logik (Dashboards V2). Verifiziert:
 *   - Frische UUIDs für jeden Sektor (keine Kollision mit Template-tpl_*-IDs).
 *   - Vollständige Überschreibung des Ziel-Lerntyps.
 *   - Andere Lerntypen bleiben unangetastet (Immutability).
 *   - Items werden korrekt durchgereicht (System-Items behalten ihren type).
 *   - Legacy-Alias: `sys_landkarte` wird beim Anwenden zu `sys_map_reduced`.
 *   - Defensive: leere/ungültige Eingaben.
 */

import { applyDashboardTemplate } from '@/lib/lernpfadeUtils';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const makeKonfig = (overrides = {}) => ({
  minimalist: [],
  pragmatiker: [],
  ehrgeizig: [],
  passioniert: [],
  ...overrides,
});

describe('applyDashboardTemplate – frische Sektor-IDs', () => {
  it('erzeugt für jeden Sektor eine NEUE ID, die nicht das tpl_-Präfix trägt', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);

    expect(next.minimalist).toHaveLength(DASHBOARD_TEMPLATES.minimalist.length);
    next.minimalist.forEach((sektor) => {
      expect(sektor.sektor_id).toBeTruthy();
      expect(sektor.sektor_id.startsWith('tpl_')).toBe(false);
      expect(sektor.sektor_id.startsWith('sec_')).toBe(true);
    });
  });

  it('alle generierten Sektor-IDs sind innerhalb des Ergebnisses eindeutig', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'pragmatiker', DASHBOARD_TEMPLATES.pragmatiker);
    const ids = next.pragmatiker.map((s) => s.sektor_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zweimaliges Anwenden desselben Templates erzeugt unterschiedliche IDs', () => {
    const konfig = makeKonfig();
    const a = applyDashboardTemplate(konfig, 'ehrgeizig', DASHBOARD_TEMPLATES.ehrgeizig);
    const b = applyDashboardTemplate(konfig, 'ehrgeizig', DASHBOARD_TEMPLATES.ehrgeizig);
    expect(a.ehrgeizig[0].sektor_id).not.toBe(b.ehrgeizig[0].sektor_id);
  });
});

describe('applyDashboardTemplate – Überschreiben & Isolation', () => {
  it('ersetzt das Sektor-Array des Ziel-Lerntyps komplett (auch bei vorhandenem Inhalt)', () => {
    const konfig = makeKonfig({
      minimalist: [
        {
          sektor_id: 'sec_old',
          titel: 'Alter Sektor',
          modus: 'frei',
          items: [{ type: 'aufgabe', ref_id: 'uuid-1' }],
        },
      ],
    });
    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);

    expect(next.minimalist.find((s) => s.sektor_id === 'sec_old')).toBeUndefined();
    expect(next.minimalist).toHaveLength(DASHBOARD_TEMPLATES.minimalist.length);
  });

  it('andere Lerntypen bleiben unangetastet (referenzielle Identität)', () => {
    const fremder = [
      { sektor_id: 'sec_keep', titel: 'Bleibt', modus: 'sequenziell', items: [] },
    ];
    const konfig = makeKonfig({ pragmatiker: fremder });

    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);
    expect(next.pragmatiker).toBe(fremder);
    expect(next.ehrgeizig).toBe(konfig.ehrgeizig);
    expect(next.passioniert).toBe(konfig.passioniert);
  });

  it('liefert IMMUTABLE: Eingangs-Konfig wird nicht mutiert', () => {
    const konfig = makeKonfig();
    const snapshot = JSON.stringify(konfig);
    applyDashboardTemplate(konfig, 'passioniert', DASHBOARD_TEMPLATES.passioniert);
    expect(JSON.stringify(konfig)).toBe(snapshot);
  });
});

describe('applyDashboardTemplate – Items werden korrekt übernommen', () => {
  it('jedes Item bleibt type === "system" mit identischer ref_id (für nicht-Legacy-Bausteine)', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'pragmatiker', DASHBOARD_TEMPLATES.pragmatiker);

    DASHBOARD_TEMPLATES.pragmatiker.forEach((tplSektor, idx) => {
      const resultSektor = next.pragmatiker[idx];
      expect(resultSektor.items).toHaveLength(tplSektor.items.length);
      resultSektor.items.forEach((item, iIdx) => {
        expect(item.type).toBe(ITEM_TYPE.SYSTEM);
        expect(item.ref_id).toBe(tplSektor.items[iIdx].ref_id);
      });
    });
  });

  it('titel und modus werden 1:1 übernommen', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'ehrgeizig', DASHBOARD_TEMPLATES.ehrgeizig);
    DASHBOARD_TEMPLATES.ehrgeizig.forEach((tplSektor, idx) => {
      expect(next.ehrgeizig[idx].titel).toBe(tplSektor.titel);
      expect(next.ehrgeizig[idx].modus).toBe(tplSektor.modus);
    });
  });
});

describe('applyDashboardTemplate – Legacy-Alias', () => {
  it('mappt eine alte sys_landkarte aus einem Custom-Template auf sys_map_reduced', () => {
    const customTemplate = [
      {
        sektor_id: 'tpl_legacy_sec1',
        titel: 'Legacy-Test',
        modus: 'sequenziell',
        items: [
          { type: ITEM_TYPE.SYSTEM, ref_id: 'sys_landkarte' },
          { type: ITEM_TYPE.SYSTEM, ref_id: 'sys_diagnose' },
        ],
      },
    ];
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'minimalist', customTemplate);

    expect(next.minimalist[0].items.map((i) => i.ref_id)).toEqual([
      'sys_map_reduced',
      'sys_diagnose',
    ]);
  });

  it('verändert KEINE bestehenden Pfade in anderen Lerntypen', () => {
    // Ein Lehrer-gepflegter Pfad enthält noch sys_landkarte – wir spielen
    // ein Template auf einen ANDEREN Lerntyp ein. Der bestehende Pfad
    // muss komplett unverändert bleiben.
    const fremder = [
      {
        sektor_id: 'sec_existing',
        titel: 'Bleibt',
        modus: 'sequenziell',
        items: [{ type: ITEM_TYPE.SYSTEM, ref_id: 'sys_landkarte' }],
      },
    ];
    const konfig = makeKonfig({ pragmatiker: fremder });

    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);
    expect(next.pragmatiker).toBe(fremder);
    expect(next.pragmatiker[0].items[0].ref_id).toBe('sys_landkarte');
  });
});

describe('applyDashboardTemplate – Defensive Inputs', () => {
  it('liefert die Konfig unverändert zurück, wenn lerntyp fehlt', () => {
    const konfig = makeKonfig();
    expect(applyDashboardTemplate(konfig, '', DASHBOARD_TEMPLATES.minimalist)).toBe(konfig);
    expect(applyDashboardTemplate(konfig, null, DASHBOARD_TEMPLATES.minimalist)).toBe(konfig);
  });

  it('liefert die Konfig unverändert zurück, wenn templateData kein Array ist', () => {
    const konfig = makeKonfig();
    expect(applyDashboardTemplate(konfig, 'minimalist', null)).toBe(konfig);
    expect(applyDashboardTemplate(konfig, 'minimalist', undefined)).toBe(konfig);
    expect(applyDashboardTemplate(konfig, 'minimalist', 'oops')).toBe(konfig);
  });

  it('akzeptiert eine leere Konfig (frischer Lernpfad)', () => {
    const next = applyDashboardTemplate(undefined, 'minimalist', DASHBOARD_TEMPLATES.minimalist);
    expect(Array.isArray(next.minimalist)).toBe(true);
    expect(next.minimalist).toHaveLength(DASHBOARD_TEMPLATES.minimalist.length);
  });

  it('leeres Template-Array löscht den Pfad sauber', () => {
    const konfig = makeKonfig({
      minimalist: [{ sektor_id: 'sec_old', titel: 'X', modus: 'sequenziell', items: [] }],
    });
    const next = applyDashboardTemplate(konfig, 'minimalist', []);
    expect(next.minimalist).toEqual([]);
  });
});

describe('applyDashboardTemplate – Themenfeld-Expansion (Phase E)', () => {
  // Ein minimales Test-Template mit GENAU einer Arbeitsphase. So können wir
  // verifizieren, dass diese pro Themenfeld dupliziert wird, ohne von der
  // konkreten Standard-Template-Struktur abhängig zu sein.
  const makeArbeitsphaseTemplate = () => [
    {
      sektor_id: 'tpl_orient',
      titel: 'Orientierung',
      modus: 'sequenziell',
      sektor_typ: 'onboarding',
      items: [{ type: ITEM_TYPE.SYSTEM, ref_id: 'sys_sec0_overview' }],
    },
    {
      sektor_id: 'tpl_arbeit',
      titel: 'Erarbeitung',
      modus: 'sequenziell',
      sektor_typ: 'arbeitsphase_themenfeld',
      items: [
        { type: ITEM_TYPE.SYSTEM, ref_id: 'sys_themenfeld_intro' },
        { type: ITEM_TYPE.SYSTEM, ref_id: 'sys_platzhalter_moodle_buendel' },
      ],
    },
    {
      sektor_id: 'tpl_test',
      titel: 'Abschlusstest',
      modus: 'sequenziell',
      sektor_typ: 'abschlusstest',
      items: [{ type: ITEM_TYPE.SYSTEM, ref_id: 'sys_external_test' }],
    },
  ];

  const themenfelder = [
    { id: 'tf_2', titel: 'Was bedeutet Gesundheit?', reihenfolge: 2 },
    { id: 'tf_1', titel: 'Wie ernähre ich mich?', reihenfolge: 1 },
  ];

  it('dupliziert die Arbeitsphase pro Themenfeld in der reihenfolge-Sortierung', () => {
    const next = applyDashboardTemplate({}, 'pragmatiker', makeArbeitsphaseTemplate(), themenfelder);
    // 1 Onboarding + 2 Arbeitsphasen + 1 Abschlusstest = 4 Sektoren.
    expect(next.pragmatiker).toHaveLength(4);
    const arbeit = next.pragmatiker.filter((s) => s.sektor_typ === 'arbeitsphase_themenfeld');
    expect(arbeit).toHaveLength(2);
    // Reihenfolge: tf_1 (reihenfolge 1) vor tf_2 (reihenfolge 2).
    expect(arbeit[0].themenfeld_id).toBe('tf_1');
    expect(arbeit[0].titel).toBe('Wie ernähre ich mich?');
    expect(arbeit[1].themenfeld_id).toBe('tf_2');
    expect(arbeit[1].titel).toBe('Was bedeutet Gesundheit?');
  });

  it('jeder Arbeitsphase-Klon hat eigene sektor_id und eigene item-instance_ids', () => {
    const next = applyDashboardTemplate({}, 'pragmatiker', makeArbeitsphaseTemplate(), themenfelder);
    const arbeit = next.pragmatiker.filter((s) => s.sektor_typ === 'arbeitsphase_themenfeld');
    expect(arbeit[0].sektor_id).not.toBe(arbeit[1].sektor_id);
    const ids0 = arbeit[0].items.map((i) => i.instance_id);
    const ids1 = arbeit[1].items.map((i) => i.instance_id);
    ids0.forEach((id) => expect(ids1).not.toContain(id));
  });

  it('ohne themenfelder bleibt das alte Verhalten (1 Arbeitsphase ohne themenfeld_id)', () => {
    const next = applyDashboardTemplate({}, 'pragmatiker', makeArbeitsphaseTemplate());
    const arbeit = next.pragmatiker.filter((s) => s.sektor_typ === 'arbeitsphase_themenfeld');
    expect(arbeit).toHaveLength(1);
    expect(arbeit[0].themenfeld_id).toBeNull();
  });

  it('leeres Themenfeld-Array fällt auf 1-Sektor-Fallback zurück', () => {
    const next = applyDashboardTemplate({}, 'pragmatiker', makeArbeitsphaseTemplate(), []);
    const arbeit = next.pragmatiker.filter((s) => s.sektor_typ === 'arbeitsphase_themenfeld');
    expect(arbeit).toHaveLength(1);
    expect(arbeit[0].themenfeld_id).toBeNull();
  });
});