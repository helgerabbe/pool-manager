/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * bundleModusToggle.logic.test.js
 *
 * Phase C: Logik des BundleModusToggle (ohne React-Render).
 * Stellt sicher, dass die Helper aus sektorTypen.js die UI-Entscheidungen
 * korrekt befeuern (Default-Modus, Editierbarkeit).
 */

import {
  getBundleKindByAcceptedTypes,
  getDefaultBundleModus,
  isBundleModusEditable,
} from '@/lib/sektorTypen';

describe('BundleModusToggle Logic (sektorTypen-Helper)', () => {
  it('Lernpaket-Bündel: Default sequenziell, editierbar', () => {
    const kind = getBundleKindByAcceptedTypes(['lernpaket']);
    expect(kind).toBe('lernpakete');
    expect(getDefaultBundleModus(kind)).toBe('sequenziell');
    expect(isBundleModusEditable(kind)).toBe(true);
  });

  it('Aufgaben-Bündel: Default frei, editierbar', () => {
    const kind = getBundleKindByAcceptedTypes(['auswahl_buendel']);
    expect(kind).toBe('aufgaben');
    expect(getDefaultBundleModus(kind)).toBe('frei');
    expect(isBundleModusEditable(kind)).toBe(true);
  });

  it('Projekt-Bündel: Default frei, NICHT editierbar (immer frei)', () => {
    const kind = getBundleKindByAcceptedTypes(['projekt']);
    expect(kind).toBe('projekte');
    expect(getDefaultBundleModus(kind)).toBe('frei');
    expect(isBundleModusEditable(kind)).toBe(false);
  });

  it('Unbekannte accepted_types liefern null kind', () => {
    expect(getBundleKindByAcceptedTypes([])).toBeNull();
    expect(getBundleKindByAcceptedTypes(['quatsch'])).toBeNull();
    expect(getBundleKindByAcceptedTypes(null)).toBeNull();
  });
});