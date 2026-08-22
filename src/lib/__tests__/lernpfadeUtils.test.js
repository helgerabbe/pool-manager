/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * lernpfadeUtils.test.js
 *
 * Unit-Tests für den Spike "items-Migration" (Epic: System-Bausteine).
 *
 * Diese Tests sind framework-agnostisch geschrieben (describe/it/expect als
 * Globals) und laufen unter Vitest sowie Jest, sobald ein Test-Runner im
 * Repo aktiviert ist.
 *
 * Abgedeckte Definition-of-Done-Punkte:
 *   T1  Lazy Migration: Alte aufgaben_ids-Sektoren werden zu items normalisiert.
 *   T2  Anti-Duplikate: getUsedAufgabenIds liefert nur type === 'aufgabe' zurück.
 */

import {
  normalizeItem,
  normalizeSektor,
  getUsedAufgabenIds,
  createNewSektor,
  addSektor,
  patchSektor,
  removeSektor,
  removeAufgabeFromLernTyp,
} from '@/lib/lernpfadeUtils';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';

// ── Helper: minimale Konfiguration ────────────────────────────────────────
const makeKonfig = (overrides = {}) => ({
  minimalist: [],
  pragmatiker: [],
  ehrgeizig: [],
  passioniert: [],
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────
// T1 – Lazy Migration
// ─────────────────────────────────────────────────────────────────────────
describe('Lazy Migration (alt → neu)', () => {
  it('normalizeItem wandelt einen String in ein Aufgabe-Item um', () => {
    expect(normalizeItem('uuid-1')).toEqual({ type: 'aufgabe', ref_id: 'uuid-1' });
  });

  it('normalizeItem lässt ein bereits normalisiertes Aufgabe-Objekt unverändert', () => {
    const it = { type: 'aufgabe', ref_id: 'uuid-1' };
    expect(normalizeItem(it)).toEqual(it);
  });

  it('normalizeItem akzeptiert ein System-Item', () => {
    const it = { type: 'system', ref_id: 'sys_diagnose' };
    expect(normalizeItem(it)).toEqual(it);
  });

  it('normalizeItem filtert leere/ungültige Werte (null, undefined, leere Strings, Objekt ohne ref_id)', () => {
    expect(normalizeItem(null)).toBeNull();
    expect(normalizeItem(undefined)).toBeNull();
    expect(normalizeItem('')).toBeNull();
    expect(normalizeItem({ type: 'aufgabe' })).toBeNull();
  });

  it('normalizeItem fällt unbekannten Typ auf "aufgabe" zurück (Defensiv)', () => {
    expect(normalizeItem({ type: 'broken', ref_id: 'x' })).toEqual({
      type: 'aufgabe',
      ref_id: 'x',
    });
  });

  it('normalizeSektor migriert altes aufgaben_ids-Array zu items', () => {
    const legacy = {
      sektor_id: 'sec_1',
      titel: 'Sektor A',
      modus: 'sequenziell',
      aufgaben_ids: ['uuid-1', 'uuid-2'],
    };
    const result = normalizeSektor(legacy);

    expect(result.items).toEqual([
      { type: 'aufgabe', ref_id: 'uuid-1' },
      { type: 'aufgabe', ref_id: 'uuid-2' },
    ]);
    // aufgaben_ids muss beim Schreiben verschwinden, damit Folge-Saves
    // ausschließlich das neue Format persistieren.
    expect(result).not.toHaveProperty('aufgaben_ids');
  });

  it('normalizeSektor lässt vorhandenes items-Array intakt', () => {
    const fresh = {
      sektor_id: 'sec_2',
      titel: 'Sektor B',
      modus: 'frei',
      items: [
        { type: 'system', ref_id: 'sys_diagnose' },
        { type: 'aufgabe', ref_id: 'uuid-9' },
      ],
    };
    const result = normalizeSektor(fresh);

    expect(result.items).toEqual(fresh.items);
    expect(result).not.toHaveProperty('aufgaben_ids');
  });

  it('lesende Helfer akzeptieren rohe Legacy-Konfigurationen ohne vorherige Normalisierung', () => {
    const legacyKonfig = makeKonfig({
      pragmatiker: [
        { sektor_id: 'sec_1', titel: 'A', modus: 'sequenziell', aufgaben_ids: ['uuid-1'] },
      ],
    });
    expect(getUsedAufgabenIds(legacyKonfig, 'pragmatiker').has('uuid-1')).toBe(true);
  });

  it('schreibende Helfer entfernen aufgaben_ids beim ersten Update (organische Migration)', () => {
    const legacyKonfig = makeKonfig({
      pragmatiker: [
        { sektor_id: 'sec_1', titel: 'A', modus: 'sequenziell', aufgaben_ids: ['uuid-1'] },
      ],
    });
    const next = patchSektor(legacyKonfig, 'pragmatiker', 'sec_1', { titel: 'A neu' });
    const sektor = next.pragmatiker[0];

    expect(sektor).not.toHaveProperty('aufgaben_ids');
    expect(sektor.items).toEqual([{ type: 'aufgabe', ref_id: 'uuid-1' }]);
    expect(sektor.titel).toBe('A neu');
  });

  it('createNewSektor liefert ein items-basiertes Objekt ohne aufgaben_ids', () => {
    const s = createNewSektor();
    expect(s).toHaveProperty('items');
    expect(s).not.toHaveProperty('aufgaben_ids');
    expect(Array.isArray(s.items)).toBe(true);
    expect(s.items).toHaveLength(0);
  });

  it('createNewSektor migriert ein Legacy-Override (aufgaben_ids) sofort zu items', () => {
    const s = createNewSektor({ aufgaben_ids: ['uuid-1'] });
    expect(s).not.toHaveProperty('aufgaben_ids');
    expect(s.items).toEqual([{ type: 'aufgabe', ref_id: 'uuid-1' }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// T2 – Anti-Duplikat & System-Filter
// ─────────────────────────────────────────────────────────────────────────
describe('Anti-Duplikat-Logik (System-Bausteine ignoriert)', () => {
  const konfigMixed = makeKonfig({
    pragmatiker: [
      {
        sektor_id: 'sec_1',
        titel: 'A',
        modus: 'sequenziell',
        items: [
          { type: 'aufgabe', ref_id: 'uuid-1' },
          { type: 'system', ref_id: 'sys_diagnose' },
        ],
      },
      {
        sektor_id: 'sec_2',
        titel: 'B',
        modus: 'frei',
        items: [
          { type: 'aufgabe', ref_id: 'uuid-2' },
          { type: 'system', ref_id: 'sys_diagnose' }, // System-Bausteine dürfen mehrfach!
        ],
      },
    ],
  });

  it('getUsedAufgabenIds enthält nur ref_ids von Aufgaben', () => {
    const used = getUsedAufgabenIds(konfigMixed, 'pragmatiker');
    expect(used.has('uuid-1')).toBe(true);
    expect(used.has('uuid-2')).toBe(true);
    expect(used.has('sys_diagnose')).toBe(false);
    expect(used.size).toBe(2);
  });

  it('removeAufgabeFromLernTyp entfernt nur Aufgaben-Items, lässt System-Items mit gleicher ID intakt', () => {
    const tricky = makeKonfig({
      pragmatiker: [
        {
          sektor_id: 'sec_1',
          titel: 'A',
          modus: 'sequenziell',
          items: [
            { type: 'aufgabe', ref_id: 'collision' },
            { type: 'system', ref_id: 'collision' }, // theoretisch identische ref_id
          ],
        },
      ],
    });
    const next = removeAufgabeFromLernTyp(tricky, 'pragmatiker', 'collision');
    expect(next.pragmatiker[0].items).toEqual([{ type: 'system', ref_id: 'collision' }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Bonus: Sektor-Lebenszyklus
// ─────────────────────────────────────────────────────────────────────────
describe('Sektor-Lebenszyklus', () => {
  it('addSektor → patchSektor → removeSektor wirkt sauber zusammen', () => {
    let konfig = makeKonfig();
    konfig = addSektor(konfig, 'minimalist', createNewSektor({ titel: 'Start' }));
    expect(konfig.minimalist).toHaveLength(1);

    const sektorId = konfig.minimalist[0].sektor_id;
    konfig = patchSektor(konfig, 'minimalist', sektorId, { modus: 'frei' });
    expect(konfig.minimalist[0].modus).toBe('frei');

    konfig = removeSektor(konfig, 'minimalist', sektorId);
    expect(konfig.minimalist).toHaveLength(0);
  });

});