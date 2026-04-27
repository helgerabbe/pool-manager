/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * setBundleModus.test.js
 *
 * Phase A:
 *   - setBundleModus setzt bundle_config.modus
 *   - Auto-Reset von erforderliche_anzahl bei Wechsel auf 'sequenziell'
 *   - normalizeSektor fixiert sektor.modus hart auf 'sequenziell'
 *   - normalizeSektor setzt sektor_typ-Default + säubert themenfeld_id für
 *     Nicht-Arbeitsphase-Sektoren
 *   - normalizeItem reicht bundle_config.modus durch, ignoriert ungültige Werte
 *   - freezeThemenfeldSnapshot friert nur Arbeitsphase-Sektoren ein und ist idempotent
 */

import {
  setBundleModus,
  normalizeSektor,
  normalizeItem,
  freezeThemenfeldSnapshot,
} from '@/lib/lernpfadeUtils';
import { SEKTOR_TYP } from '@/lib/sektorTypen';

const makeKonfig = (sektoren = []) => ({
  minimalist: [],
  pragmatiker: sektoren,
  ehrgeizig: [],
  passioniert: [],
});

const makeBundleSektor = ({ childCount = 2, bundleConfig = null } = {}) => ({
  sektor_id: 'sec_1',
  titel: 'A',
  modus: 'sequenziell',
  sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
  themenfeld_id: 'tf_1',
  items: [
    {
      instance_id: 'inst_bundle',
      type: 'system',
      ref_id: 'sys_platzhalter_brian_buendel',
      parent_instance_id: null,
      ...(bundleConfig ? { bundle_config: bundleConfig } : {}),
    },
    ...Array.from({ length: childCount }).map((_, i) => ({
      instance_id: `inst_child_${i}`,
      type: 'aufgabe',
      ref_id: `auf_${i}`,
      parent_instance_id: 'inst_bundle',
    })),
  ],
});

describe('setBundleModus', () => {
  it('setzt bundle_config.modus auf "frei"', () => {
    const konfig = makeKonfig([makeBundleSektor()]);
    const next = setBundleModus(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 'frei');
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toEqual({ modus: 'frei' });
  });

  it('Auto-Reset: bei Wechsel auf "sequenziell" wird erforderliche_anzahl entfernt', () => {
    const konfig = makeKonfig([
      makeBundleSektor({ bundleConfig: { erforderliche_anzahl: 1, modus: 'frei' } }),
    ]);
    const next = setBundleModus(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 'sequenziell');
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toEqual({ modus: 'sequenziell' });
    expect(bundle.bundle_config.erforderliche_anzahl).toBeUndefined();
  });

  it('Wechsel auf "frei" lässt erforderliche_anzahl unangetastet', () => {
    const konfig = makeKonfig([
      makeBundleSektor({ bundleConfig: { erforderliche_anzahl: 2, modus: 'sequenziell' } }),
    ]);
    const next = setBundleModus(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 'frei');
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toEqual({ erforderliche_anzahl: 2, modus: 'frei' });
  });

  it('ignoriert ungültige Modus-Werte', () => {
    const konfig = makeKonfig([makeBundleSektor()]);
    const next = setBundleModus(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 'kaputt');
    expect(next).toEqual(konfig);
  });
});

describe('normalizeSektor (Phase A)', () => {
  it('fixiert sektor.modus hart auf "sequenziell"', () => {
    const result = normalizeSektor({
      sektor_id: 'sec_1',
      modus: 'frei',
      items: [],
    });
    expect(result.modus).toBe('sequenziell');
  });

  it('setzt sektor_typ-Default auf "individuell" bei fehlendem Wert', () => {
    const result = normalizeSektor({ sektor_id: 'sec_1', items: [] });
    expect(result.sektor_typ).toBe('individuell');
  });

  it('verwirft ungültige sektor_typ-Werte und fällt auf "individuell" zurück', () => {
    const result = normalizeSektor({
      sektor_id: 'sec_1',
      sektor_typ: 'quatsch',
      items: [],
    });
    expect(result.sektor_typ).toBe('individuell');
  });

  it('themenfeld_id und titel_snapshot werden für Nicht-Arbeitsphase-Sektoren genullt', () => {
    const result = normalizeSektor({
      sektor_id: 'sec_1',
      sektor_typ: SEKTOR_TYP.ONBOARDING,
      themenfeld_id: 'tf_1',
      titel_snapshot: 'Algebra',
      items: [],
    });
    expect(result.themenfeld_id).toBeNull();
    expect(result.titel_snapshot).toBeNull();
  });

  it('themenfeld_id und titel_snapshot bleiben bei Arbeitsphase erhalten', () => {
    const result = normalizeSektor({
      sektor_id: 'sec_1',
      sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
      themenfeld_id: 'tf_1',
      titel_snapshot: 'Algebra',
      items: [],
    });
    expect(result.themenfeld_id).toBe('tf_1');
    expect(result.titel_snapshot).toBe('Algebra');
  });
});

describe('normalizeItem (Phase A: bundle_config.modus)', () => {
  it('reicht modus an System-Items durch', () => {
    const result = normalizeItem({
      instance_id: 'inst_b',
      type: 'system',
      ref_id: 'sys_x',
      bundle_config: { modus: 'frei' },
    });
    expect(result.bundle_config).toEqual({ modus: 'frei' });
  });

  it('ignoriert ungültige modus-Werte', () => {
    const result = normalizeItem({
      instance_id: 'inst_b',
      type: 'system',
      ref_id: 'sys_x',
      bundle_config: { modus: 'kaputt' },
    });
    expect(result.bundle_config).toBeUndefined();
  });

  it('verwirft modus an Aufgaben-Items (Drift-Schutz)', () => {
    const result = normalizeItem({
      instance_id: 'inst_a',
      type: 'aufgabe',
      ref_id: 'auf_1',
      bundle_config: { modus: 'frei' },
    });
    expect(result.bundle_config).toBeUndefined();
  });

  it('lässt erforderliche_anzahl + modus gemeinsam zu', () => {
    const result = normalizeItem({
      instance_id: 'inst_b',
      type: 'system',
      ref_id: 'sys_x',
      bundle_config: { erforderliche_anzahl: 2, modus: 'frei' },
    });
    expect(result.bundle_config).toEqual({ erforderliche_anzahl: 2, modus: 'frei' });
  });
});

describe('freezeThemenfeldSnapshot', () => {
  it('friert nur Arbeitsphase-Sektoren ein', () => {
    const konfig = makeKonfig([
      {
        sektor_id: 'sec_arb',
        sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
        themenfeld_id: 'tf_1',
        titel_snapshot: null,
        modus: 'sequenziell',
        items: [],
      },
      {
        sektor_id: 'sec_onb',
        sektor_typ: SEKTOR_TYP.ONBOARDING,
        modus: 'sequenziell',
        items: [],
      },
    ]);
    const next = freezeThemenfeldSnapshot(konfig, 'pragmatiker', { tf_1: 'Algebra' });
    expect(next.pragmatiker[0].titel_snapshot).toBe('Algebra');
    expect(next.pragmatiker[1].titel_snapshot).toBeUndefined();
  });

  it('idempotent: bestehende Snapshots werden nicht überschrieben', () => {
    const konfig = makeKonfig([
      {
        sektor_id: 'sec_arb',
        sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
        themenfeld_id: 'tf_1',
        titel_snapshot: 'Alter Titel',
        modus: 'sequenziell',
        items: [],
      },
    ]);
    const next = freezeThemenfeldSnapshot(konfig, 'pragmatiker', { tf_1: 'Neuer Titel' });
    expect(next.pragmatiker[0].titel_snapshot).toBe('Alter Titel');
  });

  it('akzeptiert sowohl Map als auch Plain-Object als Lookup', () => {
    const konfig = makeKonfig([
      {
        sektor_id: 'sec_arb',
        sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
        themenfeld_id: 'tf_1',
        titel_snapshot: null,
        modus: 'sequenziell',
        items: [],
      },
    ]);
    const map = new Map([['tf_1', 'Algebra']]);
    const next = freezeThemenfeldSnapshot(konfig, 'pragmatiker', map);
    expect(next.pragmatiker[0].titel_snapshot).toBe('Algebra');
  });
});