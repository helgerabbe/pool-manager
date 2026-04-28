/**
 * exportPromptBulkPlan.test.js
 *
 * Reine Plan-Berechnung — Skip-Regeln (customized/blocked), Reihenfolge,
 * Markdown-Export-Struktur.
 */
import { describe, it, expect } from 'vitest';
import { buildBulkPlan, planToWritePayload, buildMarkdownBundle } from '../exportPromptBulkPlan';
import { MBK_TEMPLATE_VERSION } from '../exportPromptTemplates';
import { buildSourceTimestampIndex } from '../exportPromptSync';

const baseSetup = () => {
  const einheit = {
    id: 'e1',
    fach: 'Mathematik',
    jahrgangsstufe: '7',
    titel_der_einheit: 'Bruchrechnung',
    gesamtziele: ['Brüche addieren'],
    updated_date: '2026-01-01T00:00:00.000Z',
    lernpfade_konfiguration: { pragmatiker: [{ sektor_typ: 'onboarding', titel: 'Start', items: [] }] },
  };
  const stammdaten = { land: 'DE', bundesland: 'NDS', schulform: 'IGS' };
  const themenfelder = [
    { id: 'tf1', titel: 'Grundlagen', reihenfolge: 1, updated_date: '2026-01-01T00:00:00.000Z' },
  ];
  const lernpakete = [
    { id: 'lp1', titel_des_pakets: 'Brüche kennen', themenfeld_id: 'tf1', reihenfolge_nummer: 1, is_complete: true, updated_date: '2026-01-02T00:00:00.000Z' },
    { id: 'lp2', titel_des_pakets: 'Unfertig', themenfeld_id: 'tf1', reihenfolge_nummer: 2, is_complete: false, updated_date: '2026-01-02T00:00:00.000Z' },
  ];
  const lernziele = [{ lernpaket_id: 'lp1', formulierung_fachsprache: 'Ich kann.', updated_date: '2026-01-02T00:00:00.000Z' }];
  const aufgabenbausteine = [];
  const allgemeineAufgaben = [
    { id: 'aa1', titel: 'Transfer', anforderungsebene: '2 - Transfer', content_status: 'approved', aufgabenstellung: 'Foo', updated_date: '2026-01-03T00:00:00.000Z' },
    { id: 'aa2', titel: 'Draft', anforderungsebene: '2 - Transfer', content_status: 'draft', aufgabenstellung: 'Bar', updated_date: '2026-01-03T00:00:00.000Z' },
  ];
  const allgemeineAufgabenEbene23 = allgemeineAufgaben;

  const tsIndex = buildSourceTimestampIndex({
    einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, allgemeineAufgaben,
  });

  return {
    einheitId: 'e1',
    einheit,
    stammdaten,
    themenfelder,
    lernpakete,
    lernziele,
    aufgabenbausteine,
    allgemeineAufgaben,
    allgemeineAufgabenEbene23,
    tsIndex,
  };
};

describe('buildBulkPlan', () => {
  it('plant alle 7 Standard-Prompts (1+1+4+2 LPs+2 AAs - 1 unfertig - 1 draft = nicht skip-blocked, sondern in Liste)', () => {
    const setup = baseSetup();
    const plan = buildBulkPlan({ ...setup, prompts: [] });
    // Erwartung: nucleus(1) + persona(1) + sektoren(4) + lp1+lp2(2) + aa1+aa2(2) = 10 Items
    expect(plan).toHaveLength(10);

    const sectionOrder = plan.map((it) => it.section);
    // Reihenfolge: nucleus, persona, dann sektoren, dann erstellungspakete
    expect(sectionOrder.indexOf('nucleus')).toBeLessThan(sectionOrder.indexOf('persona'));
    expect(sectionOrder.indexOf('persona')).toBeLessThan(sectionOrder.indexOf('sektoren'));
    expect(sectionOrder.lastIndexOf('sektoren')).toBeLessThan(sectionOrder.indexOf('erstellungspakete'));
  });

  it('markiert blockierte Erstellungspakete (Lernpaket nicht complete)', () => {
    const setup = baseSetup();
    const plan = buildBulkPlan({ ...setup, prompts: [] });
    const lp2Item = plan.find((it) => it.key === 'lp::lp2');
    expect(lp2Item.status).toBe('skip-blocked');
    expect(lp2Item.skipReason).toMatch(/nicht vollständig/i);
  });

  it('markiert blockierte Erstellungspakete (Aufgabe nicht approved)', () => {
    const setup = baseSetup();
    const plan = buildBulkPlan({ ...setup, prompts: [] });
    const aa2Item = plan.find((it) => it.key === 'aa::aa2');
    expect(aa2Item.status).toBe('skip-blocked');
    expect(aa2Item.skipReason).toMatch(/approved/);
  });

  it('markiert manuell angepasste Prompts als skip-customized', () => {
    const setup = baseSetup();
    const prompts = [
      {
        einheit_id: 'e1', prompt_type: 'nucleus', reference_id: null,
        is_customized: true, content: 'manuell',
      },
    ];
    const plan = buildBulkPlan({ ...setup, prompts });
    const nucleusItem = plan.find((it) => it.key === 'nucleus');
    expect(nucleusItem.status).toBe('skip-customized');
  });

  it('unterscheidet "new" (kein Prompt vorhanden) von "update" (vorhanden, nicht customized)', () => {
    const setup = baseSetup();
    const prompts = [
      { einheit_id: 'e1', prompt_type: 'persona', reference_id: null, is_customized: false, content: 'old' },
    ];
    const plan = buildBulkPlan({ ...setup, prompts });
    expect(plan.find((it) => it.key === 'nucleus').status).toBe('new');
    expect(plan.find((it) => it.key === 'persona').status).toBe('update');
  });
});

describe('planToWritePayload', () => {
  it('filtert auf new+update und produziert Backend-Payload mit template_version', () => {
    const setup = baseSetup();
    const plan = buildBulkPlan({ ...setup, prompts: [] });
    const items = planToWritePayload(plan);
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(it).toHaveProperty('prompt_type');
      expect(it).toHaveProperty('content');
      expect(it).toHaveProperty('source_updated_at');
      expect(it.template_version).toBe(MBK_TEMPLATE_VERSION);
      expect(it.is_customized).toBe(false);
    }
    // skip-blocked-Items dürfen NICHT enthalten sein
    const refs = items.map((it) => it.reference_id);
    expect(refs).not.toContain('lp2');
    expect(refs).not.toContain('aa2');
  });
});

describe('buildMarkdownBundle', () => {
  it('rendert nummerierte Sektionen mit Header und Trennlinien', () => {
    const setup = baseSetup();
    const plan = buildBulkPlan({ ...setup, prompts: [] });
    const md = buildMarkdownBundle({ einheit: setup.einheit, items: plan });
    expect(md).toMatch(/^# MBK-Prompts: Bruchrechnung/);
    expect(md).toMatch(/Fach: Mathematik/);
    expect(md).toMatch(/Jahrgang: 7/);
    expect(md).toContain('# 1. Nukleus (Kontext-Anker)');
    expect(md).toContain('# 2. Persona & Tonalität');
    expect(md).toContain('---');
  });

  it('nutzt existing.content wenn vorhanden, sonst frischen build', () => {
    const setup = baseSetup();
    const prompts = [
      { einheit_id: 'e1', prompt_type: 'nucleus', reference_id: null, is_customized: true, content: 'CUSTOM-NUCLEUS-TEXT' },
    ];
    const plan = buildBulkPlan({ ...setup, prompts });
    const md = buildMarkdownBundle({ einheit: setup.einheit, items: plan });
    expect(md).toContain('CUSTOM-NUCLEUS-TEXT');
  });
});