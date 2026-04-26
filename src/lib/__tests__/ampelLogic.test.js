/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * ampelLogic.test.js
 *
 * Tests für die Ampel-Aggregation, mit Fokus auf die neue
 * "at-least-N-green"-Logik für `auswahl_buendel` (Brian-Bündel,
 * X-von-Y-Auswahl).
 */

import { AMPEL, getAmpelStatus, getFlatAufgabeStatus } from '@/lib/ampelLogic';

// Helper: minimal valide Aufgabe.
const mkAufgabe = (overrides = {}) => ({
  id: 'a',
  aufgaben_typ: 'inhalt',
  content_status: 'approved',
  ...overrides,
});

const mkChild = (id, color) => {
  if (color === AMPEL.GREEN) {
    return mkAufgabe({ id, content_status: 'approved' });
  }
  if (color === AMPEL.YELLOW) {
    return mkAufgabe({ id, content_status: 'approved', sync_status: 'modified' });
  }
  // red
  return mkAufgabe({ id, content_status: 'draft' });
};

const buildCtx = (children) => {
  const aufgabenById = new Map();
  children.forEach((c) => aufgabenById.set(c.id, c));
  return { aufgabenById, lernpaketeById: new Map() };
};

const mkBuendel = (ids, requiredAnzahl) => ({
  id: 'bundle',
  aufgaben_typ: 'auswahl_buendel',
  content_status: 'approved',
  verlinkte_aufgaben_ids: ids,
  erforderliche_anzahl: requiredAnzahl,
});

// ─────────────────────────────────────────────────────────────────────────
describe('getAmpelStatus – auswahl_buendel (X-von-Y)', () => {
  it('leere Kinderliste → red', () => {
    const buendel = mkBuendel([], 2);
    const item = { type: 'aufgabe', ref_id: 'bundle' };
    const ctx = { aufgabenById: new Map([['bundle', buendel]]), lernpaketeById: new Map() };
    expect(getAmpelStatus(item, ctx)).toBe(AMPEL.RED);
  });

  it('genug grüne Kinder → green', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.GREEN);
    const c3 = mkChild('c3', AMPEL.RED);
    const buendel = mkBuendel(['c1', 'c2', 'c3'], 2);
    const ctx = buildCtx([c1, c2, c3, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.GREEN);
  });

  it('zu wenig grüne, aber genug grün+gelb → yellow', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.YELLOW);
    const c3 = mkChild('c3', AMPEL.RED);
    const buendel = mkBuendel(['c1', 'c2', 'c3'], 2);
    const ctx = buildCtx([c1, c2, c3, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.YELLOW);
  });

  it('zu wenig auswählbare Kinder (grün+gelb < N) → red', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.RED);
    const c3 = mkChild('c3', AMPEL.RED);
    const buendel = mkBuendel(['c1', 'c2', 'c3'], 2);
    const ctx = buildCtx([c1, c2, c3, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.RED);
  });

  it('exakt N grüne, kein gelb → green', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.GREEN);
    const buendel = mkBuendel(['c1', 'c2'], 2);
    const ctx = buildCtx([c1, c2, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.GREEN);
  });

  it('erforderliche_anzahl === 0 ⇒ alle Kinder Pflicht (MIN-Regel): red dominiert', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.RED);
    const buendel = mkBuendel(['c1', 'c2'], 0);
    const ctx = buildCtx([c1, c2, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.RED);
  });

  it('erforderliche_anzahl === 0 mit nur grünen Kindern → green', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.GREEN);
    const buendel = mkBuendel(['c1', 'c2'], 0);
    const ctx = buildCtx([c1, c2, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.GREEN);
  });

  it('Bündel selbst ist draft → MIN drückt das Ergebnis auf red, auch wenn Kinder grün sind', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.GREEN);
    const buendel = {
      ...mkBuendel(['c1', 'c2'], 1),
      content_status: 'draft',
    };
    const ctx = buildCtx([c1, c2, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.RED);
  });

  it('Bündel ist nach Export modifiziert → mindestens yellow', () => {
    const c1 = mkChild('c1', AMPEL.GREEN);
    const c2 = mkChild('c2', AMPEL.GREEN);
    const buendel = {
      ...mkBuendel(['c1', 'c2'], 1),
      sync_status: 'modified',
    };
    const ctx = buildCtx([c1, c2, buendel]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'bundle' }, ctx)).toBe(AMPEL.YELLOW);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('getAmpelStatus – handlung', () => {
  it('handlung wird flach geprüft (approved → green)', () => {
    const a = mkAufgabe({ id: 'h', aufgaben_typ: 'handlung', content_status: 'approved' });
    const ctx = buildCtx([a]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'h' }, ctx)).toBe(AMPEL.GREEN);
  });

  it('handlung im Draft → red', () => {
    const a = mkAufgabe({ id: 'h', aufgaben_typ: 'handlung', content_status: 'draft' });
    const ctx = buildCtx([a]);
    expect(getAmpelStatus({ type: 'aufgabe', ref_id: 'h' }, ctx)).toBe(AMPEL.RED);
  });

  it('handlung nach Export verändert → yellow', () => {
    const a = mkAufgabe({
      id: 'h',
      aufgaben_typ: 'handlung',
      content_status: 'approved',
      sync_status: 'modified',
    });
    expect(getFlatAufgabeStatus(a)).toBe(AMPEL.YELLOW);
  });
});