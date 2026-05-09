/**
 * operatorActionPlan.test.js
 *
 * Tests für den deterministischen Operator Action Plan (Ticket 3).
 * Wir prüfen die drei Drift-Szenarien (Strukturänderung,
 * Inhalts-Update/Neuanlage, Löschung) plus den Empty-State.
 */
import { describe, it, expect } from 'vitest';
import { buildOperatorActionPlan } from '../operatorActionPlan';

const lernpakete = [
  { id: 'lp1', titel_des_pakets: 'Brüche addieren' },
];
const allgemeineAufgaben = [
  { id: 'aa1', titel: 'Photosynthese-Transfer' },
];

describe('buildOperatorActionPlan', () => {
  it('liefert isEmpty=true, wenn alle Plan-Items skip-current sind und keine Tombstones existieren', () => {
    const plan = [
      { section: 'mbk_system_context', referenceId: null, status: 'skip-current' },
      { section: 'mbk_structure_payload', referenceId: null, status: 'skip-current' },
      { section: 'mbk_task_content_payload', referenceId: 'lp1', status: 'skip-current', label: 'lp1' },
    ];
    const existingPrompts = [
      { einheit_id: 'e1', prompt_type: 'mbk_task_content_payload', reference_id: 'lp1' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts, einheitId: 'e1', lernpakete, allgemeineAufgaben });
    expect(out.isEmpty).toBe(true);
    expect(out.steps).toEqual([]);
    expect(out.hasMetaPrompt).toBe(false);
  });

  it('startet jeden nicht-leeren Plan mit dem Meta-System-Prompt-Schritt', () => {
    const plan = [
      { section: 'mbk_task_content_payload', referenceId: 'lp1', status: 'update', label: 'Brüche addieren' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts: [], lernpakete, allgemeineAufgaben });
    expect(out.steps[0].kind).toBe('meta_prompt');
    expect(out.steps[0].id).toBe('meta-prompt');
    expect(out.hasMetaPrompt).toBe(true);
  });

  it('Strukturänderung: erzeugt Payload-2-Schritt + Manifest-Tausch', () => {
    const plan = [
      { section: 'mbk_structure_payload', referenceId: null, status: 'update' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts: [], lernpakete, allgemeineAufgaben });
    expect(out.hasStructuralChange).toBe(true);
    const kinds = out.steps.map((s) => s.kind);
    expect(kinds).toEqual(['meta_prompt', 'paste_payload', 'replace_manifest']);
    const manifestStep = out.steps.find((s) => s.kind === 'replace_manifest');
    expect(manifestStep.filename).toBe('imsmanifest.xml');
  });

  it('Inhalts-Update: erzeugt pro Item Paste + Replace mit task-<id>.html', () => {
    const plan = [
      { section: 'mbk_task_content_payload', referenceId: 'lp1', status: 'update', label: 'Brüche addieren' },
      { section: 'mbk_micro_payload', referenceId: 'aa1', status: 'new', label: 'Photosynthese-Transfer' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts: [], lernpakete, allgemeineAufgaben });
    expect(out.hasContentChange).toBe(true);
    const replaceSteps = out.steps.filter((s) => s.kind === 'replace_task_html');
    expect(replaceSteps).toHaveLength(2);
    expect(replaceSteps.map((s) => s.filename).sort()).toEqual(['task-aa1.html', 'task-lp1.html']);
    // Jeder Replace-Step hat einen direkten Paste-Step davor.
    const pasteSteps = out.steps.filter((s) => s.kind === 'paste_payload');
    expect(pasteSteps.map((s) => s.referenceId)).toEqual(['lp1', 'aa1']);
  });

  it('Tombstone-Heuristik: Records, die im Plan fehlen, werden zu Lösch-Schritten', () => {
    const plan = [
      // Im aktuellen Plan ist nur lp1 — aa-deleted ist weg.
      { section: 'mbk_task_content_payload', referenceId: 'lp1', status: 'skip-current', label: 'lp1' },
    ];
    const existingPrompts = [
      { einheit_id: 'e1', prompt_type: 'mbk_task_content_payload', reference_id: 'lp1' },
      { einheit_id: 'e1', prompt_type: 'mbk_task_content_payload', reference_id: 'aa-deleted' },
      { einheit_id: 'e1', prompt_type: 'mbk_micro_payload', reference_id: 'pa-deleted' },
    ];
    const out = buildOperatorActionPlan({
      plan, existingPrompts, einheitId: 'e1',
      lernpakete, allgemeineAufgaben,
    });
    expect(out.hasDeletions).toBe(true);
    expect(out.deletions.map((d) => d.filename).sort()).toEqual([
      'task-aa-deleted.html',
      'task-pa-deleted.html',
    ]);
    const deleteSteps = out.steps.filter((s) => s.kind === 'delete_task_html');
    expect(deleteSteps).toHaveLength(2);
    expect(deleteSteps[0].title).toContain('aus dem ZIP entfernen');
  });

  it('dedupliziert Tombstones, wenn dieselbe ID in task_content + micro existiert', () => {
    const plan = [];
    const existingPrompts = [
      { einheit_id: 'e1', prompt_type: 'mbk_task_content_payload', reference_id: 'aa-deleted' },
      { einheit_id: 'e1', prompt_type: 'mbk_micro_payload', reference_id: 'aa-deleted' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts, einheitId: 'e1', lernpakete, allgemeineAufgaben });
    expect(out.deletions).toHaveLength(1);
    expect(out.deletions[0].filename).toBe('task-aa-deleted.html');
  });

  it('ignoriert Records anderer Einheiten und Legacy-Records', () => {
    const plan = [];
    const existingPrompts = [
      { einheit_id: 'andere', prompt_type: 'mbk_task_content_payload', reference_id: 'foo' },
      { einheit_id: 'e1', prompt_type: 'nucleus', reference_id: null },
      { einheit_id: 'e1', prompt_type: 'erstellungspaket', reference_id: 'lp1' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts, einheitId: 'e1', lernpakete, allgemeineAufgaben });
    expect(out.isEmpty).toBe(true);
  });

  it('skip-blocked und skip-customized erzeugen keine Schritte', () => {
    const plan = [
      { section: 'mbk_task_content_payload', referenceId: 'lp1', status: 'skip-blocked', label: 'blocked' },
      { section: 'mbk_micro_payload', referenceId: 'aa1', status: 'skip-customized', label: 'custom' },
    ];
    const out = buildOperatorActionPlan({ plan, existingPrompts: [], lernpakete, allgemeineAufgaben });
    expect(out.isEmpty).toBe(true);
  });

  it('kombiniert alle drei Szenarien in der korrekten Reihenfolge: Meta → Struktur → Inhalt → Löschen', () => {
    const plan = [
      { section: 'mbk_system_context', referenceId: null, status: 'update' },
      { section: 'mbk_structure_payload', referenceId: null, status: 'update' },
      { section: 'mbk_task_content_payload', referenceId: 'lp1', status: 'update', label: 'Brüche' },
    ];
    const existingPrompts = [
      { einheit_id: 'e1', prompt_type: 'mbk_task_content_payload', reference_id: 'lp1' },
      { einheit_id: 'e1', prompt_type: 'mbk_task_content_payload', reference_id: 'gone' },
    ];
    const out = buildOperatorActionPlan({
      plan, existingPrompts, einheitId: 'e1', lernpakete, allgemeineAufgaben,
    });
    const kinds = out.steps.map((s) => s.kind);
    expect(kinds[0]).toBe('meta_prompt');
    // System-Kontext + Struktur + Manifest kommen vor Content + Delete.
    const idx = (k) => kinds.indexOf(k);
    expect(idx('replace_manifest')).toBeLessThan(idx('replace_task_html'));
    expect(idx('replace_task_html')).toBeLessThan(idx('delete_task_html'));
  });
});