import { describe, it, expect } from 'vitest';
import { sammleBrianDialoge, istDialogBereit, istVeraltet } from '@/lib/brianDialoge';

const vier = {
  dialog_name: 'D', learner_instruction: 'L',
  system_instruction: 'S', completion_rule: 'C',
};

describe('sammleBrianDialoge', () => {
  it('liefert für eine Einzelaufgabe genau einen Dialog, mit Status VON DER AUFGABE', () => {
    const d = sammleBrianDialoge([{
      id: 'a1', titel: 'Alte Aufgabe', aufgaben_typ: 'inhalt', aufgaben_modus: 'einzeln',
      brian_dialog_name: 'D', brian_learner_instruction: 'L',
      brian_system_instruction: 'S', brian_completion_rule: 'C',
      brian_sync_status: 'synced', brian_dialog_id: 'brian-77',
    }]);
    expect(d).toHaveLength(1);
    expect(d[0].schrittId).toBeNull();
    expect(d[0].sync_status).toBe('synced');
    expect(d[0].dialog_id).toBe('brian-77');
    expect(d[0].bereit).toBe(true);
  });

  it('liefert für eine Folge je Brian-Schritt einen eigenen Dialog', () => {
    const d = sammleBrianDialoge([{
      id: 'a2', titel: 'Folge', aufgaben_typ: 'inhalt', aufgaben_modus: 'sequenz',
      sequenz_schritte: [
        { id: 's1', typ: 'material', reihenfolge: 0 },
        { id: 's2', typ: 'brian', reihenfolge: 1, titel: 'Erstes Gespräch', brian: { ...vier, sync_status: 'synced' } },
        { id: 's3', typ: 'brian', reihenfolge: 2, titel: 'Zweites Gespräch', brian: { dialog_name: 'nur Name' } },
      ],
    }]);
    expect(d).toHaveLength(2);
    expect(d.map((x) => x.titel)).toEqual(['Erstes Gespräch', 'Zweites Gespräch']);
    expect(d.map((x) => x.schrittNummer)).toEqual([2, 3]);
    // Zwei Gespräche derselben Aufgabe können unterschiedlich weit sein.
    expect(d[0].sync_status).toBe('synced');
    expect(d[1].sync_status).toBe('new');
    expect(d[0].bereit).toBe(true);
    expect(d[1].bereit).toBe(false);
  });

  it('vergibt eindeutige Schluessel ueber Aufgaben hinweg', () => {
    const d = sammleBrianDialoge([
      { id: 'a1', aufgaben_modus: 'einzeln', brian_dialog_name: 'x' },
      { id: 'a2', aufgaben_modus: 'sequenz', sequenz_schritte: [
        { id: 's1', typ: 'brian', reihenfolge: 0, brian: vier },
        { id: 's2', typ: 'brian', reihenfolge: 1, brian: vier },
      ] },
    ]);
    expect(new Set(d.map((x) => x.key)).size).toBe(d.length);
  });

  it('ueberspringt Aufgabentypen ohne Dialog', () => {
    const d = sammleBrianDialoge([
      { id: 'b1', aufgaben_typ: 'buendel', aufgaben_modus: 'einzeln' },
      { id: 'b2', aufgaben_typ: 'handlung', aufgaben_modus: 'einzeln' },
      { id: 'b3', aufgaben_typ: 'externe_html_seite', aufgaben_modus: 'einzeln' },
    ]);
    expect(d).toHaveLength(0);
  });

  it('liefert fuer eine Folge ohne Brian-Schritt nichts', () => {
    expect(sammleBrianDialoge([{
      id: 'a3', aufgaben_modus: 'sequenz',
      sequenz_schritte: [{ id: 's1', typ: 'katalog', reihenfolge: 0 }],
    }])).toHaveLength(0);
  });

  it('vertraegt leere Eingaben', () => {
    expect(sammleBrianDialoge()).toEqual([]);
    expect(sammleBrianDialoge([])).toEqual([]);
  });
});

describe('istDialogBereit', () => {
  it('verlangt alle vier Felder', () => {
    expect(istDialogBereit(vier)).toBe(true);
    expect(istDialogBereit({ ...vier, completion_rule: '' })).toBe(false);
    expect(istDialogBereit({ ...vier, system_instruction: '   ' })).toBe(false);
    expect(istDialogBereit(null)).toBe(false);
  });
});

describe('istVeraltet', () => {
  const basis = (updated, synced) => ({
    sync_status: 'synced', synced_at: synced, aufgabe: { updated_date: updated },
  });

  it('erkennt Bearbeitung nach der Uebertragung', () => {
    expect(istVeraltet(basis('2026-08-31T12:05:00Z', '2026-08-31T12:00:00Z'))).toBe(true);
  });

  it('ignoriert den Zehn-Sekunden-Puffer der Bestaetigung selbst', () => {
    expect(istVeraltet(basis('2026-08-31T12:00:05Z', '2026-08-31T12:00:00Z'))).toBe(false);
  });

  it('gilt nur fuer uebertragene Dialoge', () => {
    expect(istVeraltet({ ...basis('2026-08-31T13:00:00Z', '2026-08-31T12:00:00Z'), sync_status: 'new' })).toBe(false);
    expect(istVeraltet(null)).toBe(false);
  });
});
