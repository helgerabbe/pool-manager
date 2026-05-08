/**
 * Tests für lib/systemContextHash.js
 *
 * Prüft die zwei Kern-Eigenschaften:
 *  1. **Determinismus + Sortier-Stabilität:** Gleicher Input (auch bei
 *     vertauschter Reihenfolge oder Whitespace-Padding) → gleicher Hash.
 *  2. **Inhalts-Sensitivität:** Jede inhaltliche Änderung am Regelwerk →
 *     anderer Hash.
 */
import { describe, it, expect } from 'vitest';
import { computeSystemContextHash, __test__ } from '../systemContextHash';

const baseInput = () => ({
  stammdaten: {
    land: 'Deutschland',
    bundesland: 'Niedersachsen',
    schulform: 'IGS',
  },
  schulNomenklatur: [
    {
      fach: 'Mathematik',
      conventions: [
        { key: 'Y-Achsenabschnitt', value: 'n (nicht b)' },
        { key: 'Lineare Funktion', value: 'y = m·x + n' },
      ],
      global_style: 'Brüche gekürzt.',
      ist_aktiv: true,
    },
  ],
  globalPrompts: [
    { schluessel: 'global_persona', prompt_text: 'Persona-Text', ist_aktiv: true },
    { schluessel: 'def_lerntypen', prompt_text: 'Lerntypen-Text', ist_aktiv: true },
  ],
});

describe('computeSystemContextHash', () => {
  it('liefert einen 16-stelligen Hex-Hash', () => {
    const hash = computeSystemContextHash(baseInput());
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('ist deterministisch bei gleichem Input', () => {
    const a = computeSystemContextHash(baseInput());
    const b = computeSystemContextHash(baseInput());
    expect(a).toBe(b);
  });

  it('ignoriert die Reihenfolge der Conventions', () => {
    const a = computeSystemContextHash(baseInput());
    const reordered = baseInput();
    reordered.schulNomenklatur[0].conventions.reverse();
    const b = computeSystemContextHash(reordered);
    expect(a).toBe(b);
  });

  it('ignoriert die Reihenfolge der globalen Prompts', () => {
    const a = computeSystemContextHash(baseInput());
    const reordered = baseInput();
    reordered.globalPrompts.reverse();
    const b = computeSystemContextHash(reordered);
    expect(a).toBe(b);
  });

  it('ignoriert führendes/abschließendes Whitespace in Conventions', () => {
    const a = computeSystemContextHash(baseInput());
    const padded = baseInput();
    padded.schulNomenklatur[0].conventions[0].key = '  Y-Achsenabschnitt  ';
    padded.schulNomenklatur[0].conventions[0].value = '  n (nicht b)  ';
    const b = computeSystemContextHash(padded);
    expect(a).toBe(b);
  });

  it('ändert sich, wenn eine Convention bearbeitet wird', () => {
    const a = computeSystemContextHash(baseInput());
    const edited = baseInput();
    edited.schulNomenklatur[0].conventions[0].value = 'b (nicht n)';
    const b = computeSystemContextHash(edited);
    expect(a).not.toBe(b);
  });

  it('ändert sich, wenn ein global_style geändert wird', () => {
    const a = computeSystemContextHash(baseInput());
    const edited = baseInput();
    edited.schulNomenklatur[0].global_style = 'Brüche IMMER gekürzt.';
    const b = computeSystemContextHash(edited);
    expect(a).not.toBe(b);
  });

  it('ändert sich, wenn die Schulform geändert wird', () => {
    const a = computeSystemContextHash(baseInput());
    const edited = baseInput();
    edited.stammdaten.schulform = 'Gymnasium';
    const b = computeSystemContextHash(edited);
    expect(a).not.toBe(b);
  });

  it('ändert sich, wenn ein globaler Prompt deaktiviert wird', () => {
    const a = computeSystemContextHash(baseInput());
    const edited = baseInput();
    edited.globalPrompts[0].ist_aktiv = false;
    const b = computeSystemContextHash(edited);
    expect(a).not.toBe(b);
  });

  it('ignoriert inaktive Nomenklatur-Fächer', () => {
    const a = computeSystemContextHash(baseInput());
    const withInactive = baseInput();
    withInactive.schulNomenklatur.push({
      fach: 'Inaktiv',
      conventions: [{ key: 'X', value: 'Y' }],
      global_style: 'Egal.',
      ist_aktiv: false,
    });
    const b = computeSystemContextHash(withInactive);
    expect(a).toBe(b);
  });

  it('ignoriert leere Nomenklatur-Fächer (weder Conventions noch global_style)', () => {
    const a = computeSystemContextHash(baseInput());
    const withEmpty = baseInput();
    withEmpty.schulNomenklatur.push({
      fach: 'Sport',
      conventions: [],
      global_style: '',
      ist_aktiv: true,
    });
    const b = computeSystemContextHash(withEmpty);
    expect(a).toBe(b);
  });

  it('droppt Conventions mit leerem Key oder leerem Value', () => {
    const a = computeSystemContextHash(baseInput());
    const withGarbage = baseInput();
    withGarbage.schulNomenklatur[0].conventions.push({ key: '', value: 'irrelevant' });
    withGarbage.schulNomenklatur[0].conventions.push({ key: 'Halb', value: '' });
    const b = computeSystemContextHash(withGarbage);
    expect(a).toBe(b);
  });

  it('liefert einen stabilen Hash auch bei leerem Input', () => {
    const hash = computeSystemContextHash({});
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).toBe(computeSystemContextHash({}));
  });

  it('unterscheidet leeren Input von befülltem Input', () => {
    const empty = computeSystemContextHash({});
    const full = computeSystemContextHash(baseInput());
    expect(empty).not.toBe(full);
  });
});

describe('Helper: stableStringify', () => {
  it('sortiert Object-Keys', () => {
    const a = __test__.stableStringify({ b: 1, a: 2 });
    const b = __test__.stableStringify({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('behandelt null/undefined konsistent', () => {
    expect(__test__.stableStringify(null)).toBe('null');
    expect(__test__.stableStringify(undefined)).toBe('null');
  });
});