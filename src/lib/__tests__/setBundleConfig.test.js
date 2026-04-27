/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * setBundleConfig.test.js
 *
 * Phase 4 (Logbuch §18): Tests für `setBundleConfig` und das `bundle_config`-
 * Feld in `normalizeItem`.
 *
 * Abgedeckte Fälle:
 *   - Wert wird gesetzt und auf [1, childCount] geclamped.
 *   - null/undefined → bundle_config wird entfernt (Default = "alle Pflicht").
 *   - childCount === 0 → bundle_config wird entfernt (sinnlos).
 *   - Aufgaben-Items dürfen kein bundle_config tragen (Drift-Schutz).
 */

import { setBundleConfig, normalizeItem } from '@/lib/lernpfadeUtils';

const makeKonfig = (sektoren = []) => ({
  minimalist: [],
  pragmatiker: sektoren,
  ehrgeizig: [],
  passioniert: [],
});

const makeBundleSektor = (childCount = 2) => ({
  sektor_id: 'sec_1',
  titel: 'A',
  modus: 'frei',
  items: [
    {
      instance_id: 'inst_bundle',
      type: 'system',
      ref_id: 'sys_platzhalter_brian_buendel',
      parent_instance_id: null,
    },
    ...Array.from({ length: childCount }).map((_, i) => ({
      instance_id: `inst_child_${i}`,
      type: 'aufgabe',
      ref_id: `auf_${i}`,
      parent_instance_id: 'inst_bundle',
    })),
  ],
});

describe('setBundleConfig', () => {
  it('setzt erforderliche_anzahl in den gültigen Grenzen', () => {
    const konfig = makeKonfig([makeBundleSektor(3)]);
    const next = setBundleConfig(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 2);
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toEqual({ erforderliche_anzahl: 2 });
  });

  it('clamped Werte > childCount auf childCount', () => {
    const konfig = makeKonfig([makeBundleSektor(2)]);
    const next = setBundleConfig(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 99);
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toEqual({ erforderliche_anzahl: 2 });
  });

  it('clamped Werte < 1 auf das Minimum 1', () => {
    const konfig = makeKonfig([makeBundleSektor(3)]);
    const next = setBundleConfig(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 0);
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    // 0 → bundle_config entfernt (Default), nicht clamped auf 1.
    expect(bundle.bundle_config).toBeUndefined();
  });

  it('null oder undefined entfernt die bundle_config (Default = alle Pflicht)', () => {
    const sektor = makeBundleSektor(3);
    sektor.items[0].bundle_config = { erforderliche_anzahl: 2 };
    const konfig = makeKonfig([sektor]);

    const cleared = setBundleConfig(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', null);
    const bundle = cleared.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toBeUndefined();
  });

  it('entfernt bundle_config, wenn das Bündel keine Children hat', () => {
    const sektor = makeBundleSektor(0);
    sektor.items[0].bundle_config = { erforderliche_anzahl: 2 };
    const konfig = makeKonfig([sektor]);

    const next = setBundleConfig(konfig, 'pragmatiker', 'sec_1', 'inst_bundle', 1);
    const bundle = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_bundle');
    expect(bundle.bundle_config).toBeUndefined();
  });

  it('lässt Aufgaben-Items unangetastet (kein bundle_config an Aufgaben)', () => {
    const konfig = makeKonfig([makeBundleSektor(2)]);
    const next = setBundleConfig(konfig, 'pragmatiker', 'sec_1', 'inst_child_0', 1);
    const child = next.pragmatiker[0].items.find((it) => it.instance_id === 'inst_child_0');
    expect(child.bundle_config).toBeUndefined();
  });
});

describe('normalizeItem (Phase 4: bundle_config)', () => {
  it('reicht bundle_config an System-Items durch', () => {
    const result = normalizeItem({
      instance_id: 'inst_b',
      type: 'system',
      ref_id: 'sys_platzhalter_brian_buendel',
      parent_instance_id: null,
      bundle_config: { erforderliche_anzahl: 2 },
    });
    expect(result.bundle_config).toEqual({ erforderliche_anzahl: 2 });
  });

  it('verwirft bundle_config an Aufgaben-Items (Drift-Schutz)', () => {
    const result = normalizeItem({
      instance_id: 'inst_a',
      type: 'aufgabe',
      ref_id: 'auf_1',
      parent_instance_id: 'inst_b',
      bundle_config: { erforderliche_anzahl: 2 },
    });
    expect(result.bundle_config).toBeUndefined();
  });

  it('verwirft bundle_config mit ungültiger Anzahl', () => {
    const result = normalizeItem({
      instance_id: 'inst_b',
      type: 'system',
      ref_id: 'sys_platzhalter_brian_buendel',
      parent_instance_id: null,
      bundle_config: { erforderliche_anzahl: 0 },
    });
    expect(result.bundle_config).toBeUndefined();
  });
});