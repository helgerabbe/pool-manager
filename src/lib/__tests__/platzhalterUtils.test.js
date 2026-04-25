/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * platzhalterUtils.test.js
 *
 * Tests für die Platzhalter-Erkennung des Magic-Raster-Epics (Phase 1).
 * Verifiziert:
 *   - isPlatzhalterBaustein erkennt das Präfix korrekt.
 *   - PLATZHALTER_CLASSES enthält die geforderte Drop-Zone-Optik
 *     (border-dashed) und wird genau dann verwendet, wenn die ID
 *     mit `sys_platzhalter_` beginnt.
 *
 * Hinweis: Wir testen den Helper – nicht die JSX-Komponenten – weil
 * Vitest in diesem Repo ohne JSDOM/RTL läuft und die Komponenten
 * @hello-pangea/dnd-Kontext erwarten. Da beide Pill-Komponenten den
 * Helper als alleinige Quelle für die Klassen verwenden, ist der
 * Helper-Test ausreichend für die DoD.
 */

import {
  isPlatzhalterBaustein,
  PLATZHALTER_CLASSES,
  PLATZHALTER_PREFIX,
} from '@/lib/platzhalterUtils';

// ─────────────────────────────────────────────────────────────────────────
// Erkennung
// ─────────────────────────────────────────────────────────────────────────
describe('isPlatzhalterBaustein – ID-basierte Erkennung', () => {
  it('erkennt das Präfix in einem Entitäts-Objekt mit baustein_id', () => {
    expect(isPlatzhalterBaustein({ baustein_id: 'sys_platzhalter_handlung' })).toBe(true);
    expect(isPlatzhalterBaustein({ baustein_id: 'sys_platzhalter_test' })).toBe(true);
  });

  it('akzeptiert defensiv auch das Feld `id` (für Fixtures/Legacy)', () => {
    expect(isPlatzhalterBaustein({ id: 'sys_platzhalter_test' })).toBe(true);
  });

  it('akzeptiert einen reinen ID-String', () => {
    expect(isPlatzhalterBaustein('sys_platzhalter_basispaket')).toBe(true);
    expect(isPlatzhalterBaustein('sys_platzhalter_ebene2')).toBe(true);
    expect(isPlatzhalterBaustein('sys_platzhalter_projekt')).toBe(true);
  });

  it('liefert false für reguläre System-Bausteine', () => {
    expect(isPlatzhalterBaustein({ baustein_id: 'sys_diagnose' })).toBe(false);
    expect(isPlatzhalterBaustein({ baustein_id: 'sys_landkarte' })).toBe(false);
    expect(isPlatzhalterBaustein({ baustein_id: 'sys_lehrer_check' })).toBe(false);
    expect(isPlatzhalterBaustein('sys_zwischentest')).toBe(false);
  });

  it('liefert false für leere/ungültige Werte', () => {
    expect(isPlatzhalterBaustein(null)).toBe(false);
    expect(isPlatzhalterBaustein(undefined)).toBe(false);
    expect(isPlatzhalterBaustein('')).toBe(false);
    expect(isPlatzhalterBaustein({})).toBe(false);
    expect(isPlatzhalterBaustein({ baustein_id: '' })).toBe(false);
    expect(isPlatzhalterBaustein(42)).toBe(false);
  });

  it('verwendet exakt das definierte Präfix (keine Wildcard-Matches)', () => {
    // String enthält das Präfix, beginnt aber nicht damit → kein Platzhalter.
    expect(isPlatzhalterBaustein('xsys_platzhalter_handlung')).toBe(false);
    // Wir verwenden hier defensiv die Konstante, damit der Test bei einer
    // Präfix-Änderung automatisch mitwandert.
    expect(PLATZHALTER_PREFIX).toBe('sys_platzhalter_');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Styling: Drop-Zone-Optik
// ─────────────────────────────────────────────────────────────────────────
describe('PLATZHALTER_CLASSES – Drop-Zone-Styling', () => {
  it('enthält border-dashed im Container-Stil (Hauptanforderung der DoD)', () => {
    expect(PLATZHALTER_CLASSES.container).toMatch(/border-dashed/);
    expect(PLATZHALTER_CLASSES.containerSelected).toMatch(/border-dashed/);
  });

  it('verwendet eine erkennbar blau getönte Optik', () => {
    expect(PLATZHALTER_CLASSES.container).toMatch(/border-blue-/);
    expect(PLATZHALTER_CLASSES.container).toMatch(/bg-blue-/);
    expect(PLATZHALTER_CLASSES.title).toMatch(/text-blue-/);
  });

  it('alle Style-Slots sind gesetzt (keine undefined Werte)', () => {
    for (const key of ['container', 'containerSelected', 'iconBox', 'icon', 'title', 'subtitle']) {
      expect(PLATZHALTER_CLASSES[key]).toBeTruthy();
      expect(typeof PLATZHALTER_CLASSES[key]).toBe('string');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Integration: Erkennung + Stil-Auswahl (so wie es die Komponenten machen)
// ─────────────────────────────────────────────────────────────────────────
describe('Integration: Komponenten-Logik (vereinfacht nachgebaut)', () => {
  /**
   * Simuliert die in den Pill-Komponenten verwendete Style-Auswahl-Logik.
   * Wenn diese Logik geändert wird, MUSS sie hier mitziehen, damit der
   * Test seinen Wert behält.
   */
  function pickContainerClass(baustein, isSelected) {
    if (isPlatzhalterBaustein(baustein)) {
      return isSelected
        ? PLATZHALTER_CLASSES.containerSelected
        : PLATZHALTER_CLASSES.container;
    }
    return isSelected
      ? 'border-slate-400 bg-slate-100 shadow-sm'
      : 'border-slate-200 bg-slate-50';
  }

  it('wendet border-dashed auf Platzhalter an, NICHT auf reguläre Bausteine', () => {
    const platzhalter = { id: 'sys_platzhalter_test', titel: 'Test-Platzhalter' };
    const regulaer = { id: 'sys_diagnose', titel: 'Diagnose' };

    expect(pickContainerClass(platzhalter, false)).toMatch(/border-dashed/);
    expect(pickContainerClass(regulaer, false)).not.toMatch(/border-dashed/);
  });

  it('liefert auch im selektierten Zustand die Dashed-Optik für Platzhalter', () => {
    const platzhalter = { baustein_id: 'sys_platzhalter_handlung' };
    expect(pickContainerClass(platzhalter, true)).toMatch(/border-dashed/);
  });

  it('reguläre Bausteine erhalten das slate-Solid-Styling', () => {
    const regulaer = { baustein_id: 'sys_lehrer_check' };
    expect(pickContainerClass(regulaer, false)).toMatch(/border-slate-/);
    expect(pickContainerClass(regulaer, false)).not.toMatch(/dashed/);
  });
});