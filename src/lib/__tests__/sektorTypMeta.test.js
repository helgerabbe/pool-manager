/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * sektorTypMeta.test.js
 *
 * Phase B – UI-Metadaten:
 *   - Jeder Sektor-Typ hat ein vollständiges Meta-Objekt.
 *   - Unbekannte/null-Eingaben fallen auf Default zurück.
 */

import { SEKTOR_TYP, ALL_SEKTOR_TYPEN } from '@/lib/sektorTypen';
import { getSektorTypMeta, SEKTOR_TYP_META } from '@/lib/sektorTypMeta';

describe('SEKTOR_TYP_META', () => {
  it('liefert für jeden definierten Typ ein vollständiges Meta-Objekt', () => {
    for (const typ of ALL_SEKTOR_TYPEN) {
      const meta = SEKTOR_TYP_META[typ];
      expect(meta).toBeDefined();
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon).toBeDefined();
      expect(typeof meta.iconCls).toBe('string');
    }
  });

  it('Arbeitsphase hat das BookOpen-Icon und blauen Akzent', () => {
    const meta = SEKTOR_TYP_META[SEKTOR_TYP.ARBEITSPHASE];
    expect(meta.label).toBe('Arbeitsphase Themenfeld');
    expect(meta.iconCls).toContain('blue');
  });
});

describe('getSektorTypMeta', () => {
  it('liefert korrektes Meta für gültige Typen', () => {
    expect(getSektorTypMeta(SEKTOR_TYP.ZWISCHENTEST).label).toBe('Zwischentest');
    expect(getSektorTypMeta(SEKTOR_TYP.INDIVIDUELL).label).toBe('Leerer Sektor');
  });

  it('fällt für unbekannte Typen auf Default zurück', () => {
    const meta = getSektorTypMeta('quatsch');
    expect(meta.label).toBe('Sektor');
    expect(meta.icon).toBeDefined();
  });

  it('fällt für null/undefined auf Default zurück', () => {
    expect(getSektorTypMeta(null).label).toBe('Sektor');
    expect(getSektorTypMeta(undefined).label).toBe('Sektor');
  });
});