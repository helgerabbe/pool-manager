/**
 * exportPromptSync.test.js
 *
 * Tests für Out-of-Sync-Erkennung (Quelldaten + Template-Version) und für
 * den vorberechneten Source-Timestamp-Index (Performance-Helfer).
 */
import { describe, it, expect } from 'vitest';
import {
  isPromptOutOfSync,
  buildSourceTimestampIndex,
  lookupSourceMaxTimestampFromIndex,
} from '../exportPromptSync';
import { MBK_TEMPLATE_VERSION } from '../exportPromptTemplates';

describe('isPromptOutOfSync', () => {
  it('liefert false, wenn der Prompt noch nicht generiert wurde', () => {
    expect(isPromptOutOfSync(null, 12345)).toBe(false);
    expect(isPromptOutOfSync({}, 12345)).toBe(false);
    expect(isPromptOutOfSync({ source_updated_at: null }, 12345)).toBe(false);
  });

  it('liefert true, wenn die Quelldaten neuer sind als der Prompt', () => {
    const generatedAt = '2026-01-01T00:00:00.000Z';
    const sourceMaxTs = new Date('2026-02-01T00:00:00.000Z').getTime();
    const prompt = {
      source_updated_at: generatedAt,
      template_version: MBK_TEMPLATE_VERSION,
    };
    expect(isPromptOutOfSync(prompt, sourceMaxTs)).toBe(true);
  });

  it('liefert false, wenn Quelldaten älter und Version aktuell sind', () => {
    const generatedAt = '2026-02-01T00:00:00.000Z';
    const sourceMaxTs = new Date('2026-01-01T00:00:00.000Z').getTime();
    const prompt = {
      source_updated_at: generatedAt,
      template_version: MBK_TEMPLATE_VERSION,
    };
    expect(isPromptOutOfSync(prompt, sourceMaxTs)).toBe(false);
  });

  it('liefert true, wenn die Template-Version abweicht', () => {
    const generatedAt = '2026-02-01T00:00:00.000Z';
    const sourceMaxTs = new Date('2026-01-01T00:00:00.000Z').getTime();
    const prompt = {
      source_updated_at: generatedAt,
      template_version: 'v0_pre_release',
    };
    expect(isPromptOutOfSync(prompt, sourceMaxTs)).toBe(true);
  });

  it('ignoriert fehlende Template-Version (Legacy-Records)', () => {
    const generatedAt = '2026-02-01T00:00:00.000Z';
    const sourceMaxTs = new Date('2026-01-01T00:00:00.000Z').getTime();
    const prompt = {
      source_updated_at: generatedAt,
      // template_version fehlt absichtlich
    };
    expect(isPromptOutOfSync(prompt, sourceMaxTs)).toBe(false);
  });
});

describe('buildSourceTimestampIndex / lookupSourceMaxTimestampFromIndex', () => {
  const einheit = { id: 'e1', updated_date: '2026-01-01T00:00:00.000Z' };
  const themenfelder = [
    { id: 'tf1', updated_date: '2026-01-02T00:00:00.000Z' },
    { id: 'tf2', updated_date: '2026-01-03T00:00:00.000Z' },
  ];
  const lernpakete = [
    { id: 'lp1', updated_date: '2026-01-04T00:00:00.000Z' },
    { id: 'lp2', updated_date: '2026-01-05T00:00:00.000Z' },
  ];
  const lernziele = [
    { lernpaket_id: 'lp1', updated_date: '2026-01-10T00:00:00.000Z' },
    { lernpaket_id: 'lp2', updated_date: '2026-01-06T00:00:00.000Z' },
  ];
  const aufgabenbausteine = [
    { lernpaket_id: 'lp1', updated_date: '2026-01-08T00:00:00.000Z' },
    { lernpaket_id: 'lp2', updated_date: '2026-01-20T00:00:00.000Z' },
  ];
  const allgemeineAufgaben = [
    { id: 'aa1', updated_date: '2026-02-01T00:00:00.000Z' },
  ];

  const index = buildSourceTimestampIndex({
    einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, allgemeineAufgaben,
  });

  const ts = (iso) => new Date(iso).getTime();

  it('berechnet nucleusTs als max über alle Quellen', () => {
    // max = lernziele lp1 ist 01-10, aber aufgabenbausteine lp2 ist 01-20
    expect(index.nucleusTs).toBe(ts('2026-01-20T00:00:00.000Z'));
  });

  it('berechnet personaTs nur aus Einheit', () => {
    expect(index.personaTs).toBe(ts('2026-01-01T00:00:00.000Z'));
  });

  it('berechnet sektorTs aus Einheit + Themenfeldern', () => {
    expect(index.sektorTs).toBe(ts('2026-01-03T00:00:00.000Z'));
  });

  it('liefert pro Lernpaket den max-Timestamp seiner abhängigen Daten', () => {
    expect(lookupSourceMaxTimestampFromIndex(index, 'erstellungspaket', 'lp1'))
      .toBe(ts('2026-01-10T00:00:00.000Z')); // lernziel ist neuer als lp + aufgabenbaustein
    expect(lookupSourceMaxTimestampFromIndex(index, 'erstellungspaket', 'lp2'))
      .toBe(ts('2026-01-20T00:00:00.000Z')); // aufgabenbaustein ist neuer
  });

  it('liefert AllgemeineAufgabe-Timestamp', () => {
    expect(lookupSourceMaxTimestampFromIndex(index, 'erstellungspaket', 'aa1'))
      .toBe(ts('2026-02-01T00:00:00.000Z'));
  });

  it('liefert 0 für unbekannte Reference-IDs', () => {
    expect(lookupSourceMaxTimestampFromIndex(index, 'erstellungspaket', 'unknown'))
      .toBe(0);
  });

  it('liefert 0 für unbekannte Prompt-Typen', () => {
    expect(lookupSourceMaxTimestampFromIndex(index, 'foobar')).toBe(0);
  });
});