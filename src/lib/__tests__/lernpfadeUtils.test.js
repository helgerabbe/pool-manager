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
 *   T3  Move/Insert: Reihenfolge nach Reorder/Insert/Move stimmt.
 */

import {
  normalizeItem,
  normalizeSektor,
  getUsedAufgabenIds,
  isAufgabeInLernpfad,
  createNewSektor,
  addSektor,
  patchSektor,
  removeSektor,
  insertAufgabeInSektor,
  removeAufgabeFromLernTyp,
  copySektorenBetweenLernTypen,
  moveAufgabe,
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
    expect(isAufgabeInLernpfad(legacyKonfig, 'pragmatiker', 'uuid-1')).toBe(true);
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

  it('isAufgabeInLernpfad gibt false für System-Baustein-IDs zurück', () => {
    expect(isAufgabeInLernpfad(konfigMixed, 'pragmatiker', 'sys_diagnose')).toBe(false);
    expect(isAufgabeInLernpfad(konfigMixed, 'pragmatiker', 'uuid-1')).toBe(true);
  });

  it('insertAufgabeInSektor blockiert Duplikate von Aufgaben', () => {
    const next = insertAufgabeInSektor(konfigMixed, 'pragmatiker', 'sec_2', 'uuid-1', 0);
    // Konfiguration unverändert – Aufgabe war schon in sec_1.
    expect(next).toBe(konfigMixed);
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
// T3 – Move/Insert: Reihenfolge bleibt korrekt
// ─────────────────────────────────────────────────────────────────────────
describe('Reihenfolge bei Move/Insert', () => {
  const baseKonfig = () =>
    makeKonfig({
      pragmatiker: [
        {
          sektor_id: 'sec_1',
          titel: 'A',
          modus: 'sequenziell',
          items: [
            { type: 'aufgabe', ref_id: 'a1' },
            { type: 'aufgabe', ref_id: 'a2' },
            { type: 'aufgabe', ref_id: 'a3' },
          ],
        },
        {
          sektor_id: 'sec_2',
          titel: 'B',
          modus: 'sequenziell',
          items: [{ type: 'aufgabe', ref_id: 'b1' }],
        },
      ],
    });

  it('insertAufgabeInSektor fügt eine neue Aufgabe an der gewünschten Position ein', () => {
    const next = insertAufgabeInSektor(baseKonfig(), 'pragmatiker', 'sec_2', 'b2', 0);
    const refIds = next.pragmatiker[1].items.map((i) => i.ref_id);
    expect(refIds).toEqual(['b2', 'b1']);
  });

  it('insertAufgabeInSektor ohne expliziten Index hängt am Ende an', () => {
    const next = insertAufgabeInSektor(baseKonfig(), 'pragmatiker', 'sec_2', 'b2');
    const refIds = next.pragmatiker[1].items.map((i) => i.ref_id);
    expect(refIds).toEqual(['b1', 'b2']);
  });

  it('moveAufgabe sortiert innerhalb desselben Sektors um (a1, a2, a3 → a2, a3, a1)', () => {
    const next = moveAufgabe(baseKonfig(), 'pragmatiker', 'sec_1', 0, 'sec_1', 2);
    const refIds = next.pragmatiker[0].items.map((i) => i.ref_id);
    expect(refIds).toEqual(['a2', 'a3', 'a1']);
  });

  it('moveAufgabe verschiebt zwischen Sektoren und behält Reihenfolge bei (a2 → sec_2[1])', () => {
    const next = moveAufgabe(baseKonfig(), 'pragmatiker', 'sec_1', 1, 'sec_2', 1);
    const sec1 = next.pragmatiker[0].items.map((i) => i.ref_id);
    const sec2 = next.pragmatiker[1].items.map((i) => i.ref_id);
    expect(sec1).toEqual(['a1', 'a3']);
    expect(sec2).toEqual(['b1', 'a2']);
  });

  it('moveAufgabe verschiebt System-Items genauso wie Aufgaben-Items', () => {
    const konfig = makeKonfig({
      pragmatiker: [
        {
          sektor_id: 'sec_1',
          titel: 'A',
          modus: 'sequenziell',
          items: [
            { type: 'system', ref_id: 'sys_diagnose' },
            { type: 'aufgabe', ref_id: 'a1' },
          ],
        },
      ],
    });
    const next = moveAufgabe(konfig, 'pragmatiker', 'sec_1', 0, 'sec_1', 1);
    expect(next.pragmatiker[0].items).toEqual([
      { type: 'aufgabe', ref_id: 'a1' },
      { type: 'system', ref_id: 'sys_diagnose' },
    ]);
  });

  it('moveAufgabe gibt unveränderte Konfiguration zurück, wenn Quelle ungültig', () => {
    const konfig = baseKonfig();
    const next = moveAufgabe(konfig, 'pragmatiker', 'sec_unknown', 0, 'sec_1', 0);
    expect(next).toBe(konfig);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Bonus: Sektor-Lebenszyklus + copySektoren
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

  it('copySektorenBetweenLernTypen erzeugt frische sektor_ids und droppt aufgaben_ids', () => {
    const konfig = makeKonfig({
      pragmatiker: [
        {
          sektor_id: 'sec_legacy',
          titel: 'Legacy',
          modus: 'sequenziell',
          aufgaben_ids: ['uuid-1', 'uuid-2'],
        },
      ],
    });
    const next = copySektorenBetweenLernTypen(konfig, 'pragmatiker', 'minimalist');
    const copied = next.minimalist[0];

    expect(copied.sektor_id).not.toBe('sec_legacy');
    expect(copied.sektor_id.startsWith('sec_')).toBe(true);
    expect(copied).not.toHaveProperty('aufgaben_ids');
    expect(copied.items).toEqual([
      { type: 'aufgabe', ref_id: 'uuid-1' },
      { type: 'aufgabe', ref_id: 'uuid-2' },
    ]);
  });
});