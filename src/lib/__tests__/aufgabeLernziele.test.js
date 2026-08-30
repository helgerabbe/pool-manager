import { describe, it, expect } from 'vitest';
import { lernzieleDerAufgabe, aufgabeBedientLernziel } from '@/lib/aufgabeLernziele';

const mappings = [
  { aufgabe_id: 'alt', lernziel_id: 'lz-1' },
  { aufgabe_id: 'alt', lernziel_id: 'lz-2' },
  { aufgabe_id: 'andere', lernziel_id: 'lz-9' },
];

describe('lernzieleDerAufgabe', () => {
  it('liest den Altbestand aus der Mapping-Tabelle', () => {
    expect(lernzieleDerAufgabe({ id: 'alt' }, mappings).sort()).toEqual(['lz-1', 'lz-2']);
  });

  it('liest die KI-Analyse an der Aufgabe — das fehlte der Landkarte bisher', () => {
    const a = { id: 'neu', lernzielanalyse: { items: [
      { text: 'Ziel A', lernziel_id: 'lz-3' },
      { text: 'Frei formuliert' },            // ohne Kennung → zaehlt nicht
    ] } };
    expect(lernzieleDerAufgabe(a, mappings)).toEqual(['lz-3']);
  });

  it('liest die Analyse an den Brian-Schritten', () => {
    const a = { id: 'folge', aufgaben_modus: 'sequenz', sequenz_schritte: [
      { id: 's1', typ: 'material' },
      { id: 's2', typ: 'brian', brian: { lernzielanalyse: { items: [{ lernziel_id: 'lz-4' }] } } },
      { id: 's3', typ: 'brian', brian: { lernzielanalyse: { items: [{ lernziel_id: 'lz-5' }] } } },
    ] };
    expect(lernzieleDerAufgabe(a, []).sort()).toEqual(['lz-4', 'lz-5']);
  });

  it('fasst alle drei Quellen zusammen, ohne Dubletten', () => {
    const a = {
      id: 'alt',
      lernzielanalyse: { items: [{ lernziel_id: 'lz-2' }, { lernziel_id: 'lz-3' }] },
      sequenz_schritte: [
        { typ: 'brian', brian: { lernzielanalyse: { items: [{ lernziel_id: 'lz-1' }, { lernziel_id: 'lz-4' }] } } },
      ],
    };
    expect(lernzieleDerAufgabe(a, mappings).sort()).toEqual(['lz-1', 'lz-2', 'lz-3', 'lz-4']);
  });

  it('nimmt keine Mappings anderer Aufgaben', () => {
    expect(lernzieleDerAufgabe({ id: 'alt' }, mappings)).not.toContain('lz-9');
  });

  it('vertraegt fehlende und kaputte Daten', () => {
    expect(lernzieleDerAufgabe(null, mappings)).toEqual([]);
    expect(lernzieleDerAufgabe({ id: 'x' })).toEqual([]);
    expect(lernzieleDerAufgabe({ id: 'x', lernzielanalyse: 'kaputt' }, [])).toEqual([]);
    expect(lernzieleDerAufgabe({ id: 'x', sequenz_schritte: 'kaputt' }, [])).toEqual([]);
  });
});

describe('aufgabeBedientLernziel', () => {
  it('erkennt Treffer aus jeder Quelle', () => {
    expect(aufgabeBedientLernziel({ id: 'alt' }, 'lz-1', mappings)).toBe(true);
    expect(aufgabeBedientLernziel({ id: 'n', lernzielanalyse: { items: [{ lernziel_id: 'lz-7' }] } }, 'lz-7', [])).toBe(true);
    expect(aufgabeBedientLernziel({ id: 'n', sequenz_schritte: [
      { typ: 'brian', brian: { lernzielanalyse: { items: [{ lernziel_id: 'lz-8' }] } } },
    ] }, 'lz-8', [])).toBe(true);
  });

  it('ist bei Nicht-Treffern falsch', () => {
    expect(aufgabeBedientLernziel({ id: 'alt' }, 'lz-99', mappings)).toBe(false);
    expect(aufgabeBedientLernziel({ id: 'alt' }, null, mappings)).toBe(false);
  });
});
