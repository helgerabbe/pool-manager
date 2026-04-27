/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * sektorTypen.test.js
 *
 * Phase A (Epic „Semantische Dashboard-Sektoren"):
 *   - getBundleKindByAcceptedTypes
 *   - getDefaultBundleModus
 *   - isBundleModusEditable
 *   - isSingletonSektorTyp / isValidSektorTyp
 */

import {
  getBundleKindByAcceptedTypes,
  getDefaultBundleModus,
  isBundleModusEditable,
  isSingletonSektorTyp,
  isValidSektorTyp,
  SEKTOR_TYP,
} from '@/lib/sektorTypen';

describe('getBundleKindByAcceptedTypes', () => {
  it('mapped lernpaket → lernpakete', () => {
    expect(getBundleKindByAcceptedTypes(['lernpaket'])).toBe('lernpakete');
  });
  it('mapped auswahl_buendel → aufgaben', () => {
    expect(getBundleKindByAcceptedTypes(['auswahl_buendel'])).toBe('aufgaben');
  });
  it('mapped projekt → projekte', () => {
    expect(getBundleKindByAcceptedTypes(['projekt'])).toBe('projekte');
  });
  it('liefert null für leere oder unbekannte Listen', () => {
    expect(getBundleKindByAcceptedTypes([])).toBeNull();
    expect(getBundleKindByAcceptedTypes(['inhalt', 'prozess'])).toBeNull();
    expect(getBundleKindByAcceptedTypes(null)).toBeNull();
  });
});

describe('getDefaultBundleModus', () => {
  it('Lernpakete-Bündel → sequenziell (Moodle-Flow)', () => {
    expect(getDefaultBundleModus('lernpakete')).toBe('sequenziell');
  });
  it('Aufgaben-Bündel → frei (X von Y)', () => {
    expect(getDefaultBundleModus('aufgaben')).toBe('frei');
  });
  it('Projekt-Bündel → frei (hart kodiert)', () => {
    expect(getDefaultBundleModus('projekte')).toBe('frei');
  });
  it('unbekannter Kind → frei (sicherer Fallback)', () => {
    expect(getDefaultBundleModus(null)).toBe('frei');
  });
});

describe('isBundleModusEditable', () => {
  it('Projekt-Bündel ist NICHT editierbar', () => {
    expect(isBundleModusEditable('projekte')).toBe(false);
  });
  it('Lernpakete- und Aufgaben-Bündel sind editierbar', () => {
    expect(isBundleModusEditable('lernpakete')).toBe(true);
    expect(isBundleModusEditable('aufgaben')).toBe(true);
  });
});

describe('Sektor-Typ Validierung', () => {
  it('erkennt Singletons', () => {
    expect(isSingletonSektorTyp(SEKTOR_TYP.ONBOARDING)).toBe(true);
    expect(isSingletonSektorTyp(SEKTOR_TYP.UEBERBLICK)).toBe(true);
    expect(isSingletonSektorTyp(SEKTOR_TYP.ABSCHLUSSTEST)).toBe(true);
    expect(isSingletonSektorTyp(SEKTOR_TYP.PROJEKTE)).toBe(true);
    expect(isSingletonSektorTyp(SEKTOR_TYP.ARBEITSPHASE)).toBe(false);
    expect(isSingletonSektorTyp(SEKTOR_TYP.INDIVIDUELL)).toBe(false);
    expect(isSingletonSektorTyp(SEKTOR_TYP.ZWISCHENTEST)).toBe(false);
  });
  it('isValidSektorTyp filtert unbekannte Werte', () => {
    expect(isValidSektorTyp('onboarding')).toBe(true);
    expect(isValidSektorTyp('quatsch')).toBe(false);
    expect(isValidSektorTyp(null)).toBe(false);
  });
});