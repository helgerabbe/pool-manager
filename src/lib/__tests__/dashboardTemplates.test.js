/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * dashboardTemplates.test.js
 *
 * Schema-Validierung für das statische Template-Repository ("Dashboards V2").
 * Reine Struktur-Checks – keine Komponenten- oder DB-Tests:
 *
 *   1. Alle vier Lerntypen vorhanden und nicht-leere Arrays.
 *   2. Jeder Sektor hat ein valides Schema (sektor_id, titel, modus, items).
 *   3. Items haben das Format { type: 'system', ref_id: <string> }.
 *   4. Keine Inhaltsaufgaben (`type: 'aufgabe'`) hartcodiert.
 *   5. Sektor-IDs sind global eindeutig und tragen `tpl_`-Präfix.
 *   6. Konkrete V2-Sektor-Längen pro Lerntyp passen.
 *   7. Modi pro Lerntyp entsprechen der V2-Spezifikation.
 *   8. Erste Items der V2-Templates entsprechen der Spezifikation
 *      (Smoke-Tests, damit Tippfehler in den Bezeichnern auffallen).
 */

import {
  DASHBOARD_TEMPLATES,
  TEMPLATE_LERN_TYPEN,
} from '@/lib/dashboardTemplates';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const VALID_MODI = ['sequenziell', 'frei'];

// ─────────────────────────────────────────────────────────────────────────
// Top-Level
// ─────────────────────────────────────────────────────────────────────────
describe('DASHBOARD_TEMPLATES – Top-Level-Struktur', () => {
  it('exportiert genau die vier V2-Lerntyp-Schlüssel', () => {
    const keys = Object.keys(DASHBOARD_TEMPLATES).sort();
    expect(keys).toEqual(['ehrgeizige', 'minimalist', 'passionierte', 'pragmatiker']);
  });

  it('TEMPLATE_LERN_TYPEN deckt sich mit den Schlüsseln des Templates', () => {
    expect([...TEMPLATE_LERN_TYPEN].sort()).toEqual(
      Object.keys(DASHBOARD_TEMPLATES).sort()
    );
  });

  it.each(TEMPLATE_LERN_TYPEN)('Lerntyp "%s" liefert ein nicht-leeres Array', (key) => {
    expect(Array.isArray(DASHBOARD_TEMPLATES[key])).toBe(true);
    expect(DASHBOARD_TEMPLATES[key].length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sektor-Schema
// ─────────────────────────────────────────────────────────────────────────
describe('DASHBOARD_TEMPLATES – Sektor-Schema', () => {
  it('jeder Sektor hat sektor_id, titel, modus und items in der korrekten Form', () => {
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      const sektoren = DASHBOARD_TEMPLATES[lerntyp];
      sektoren.forEach((sektor, idx) => {
        const ctx = `[${lerntyp}][${idx}]`;
        expect(typeof sektor.sektor_id, `${ctx}.sektor_id`).toBe('string');
        expect(sektor.sektor_id.length, `${ctx}.sektor_id leer`).toBeGreaterThan(0);
        expect(sektor.sektor_id.startsWith('tpl_'), `${ctx} Präfix tpl_`).toBe(true);
        expect(typeof sektor.titel, `${ctx}.titel`).toBe('string');
        expect(sektor.titel.trim().length, `${ctx}.titel leer`).toBeGreaterThan(0);
        expect(VALID_MODI, `${ctx}.modus`).toContain(sektor.modus);
        expect(Array.isArray(sektor.items), `${ctx}.items kein Array`).toBe(true);
      });
    }
  });

  it('alle Sektor-IDs sind global eindeutig (über alle Lerntypen hinweg)', () => {
    const seen = new Set();
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      for (const sektor of DASHBOARD_TEMPLATES[lerntyp]) {
        expect(seen.has(sektor.sektor_id), `Duplikat: ${sektor.sektor_id}`).toBe(false);
        seen.add(sektor.sektor_id);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Item-Schema
// ─────────────────────────────────────────────────────────────────────────
describe('DASHBOARD_TEMPLATES – Item-Schema', () => {
  it('jedes Item hat genau das Format { type: "system", ref_id: <string> }', () => {
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      const sektoren = DASHBOARD_TEMPLATES[lerntyp];
      sektoren.forEach((sektor, sIdx) => {
        sektor.items.forEach((item, iIdx) => {
          const ctx = `[${lerntyp}][sec ${sIdx}][item ${iIdx}]`;
          expect(item, `${ctx} kein Objekt`).toBeTruthy();
          expect(typeof item, `${ctx} kein Objekt`).toBe('object');
          expect(item.type, `${ctx}.type`).toBe(ITEM_TYPE.SYSTEM);
          expect(typeof item.ref_id, `${ctx}.ref_id`).toBe('string');
          expect(item.ref_id.length, `${ctx}.ref_id leer`).toBeGreaterThan(0);
        });
      });
    }
  });

  it('keine Inhaltsaufgabe (type: "aufgabe") ist hartcodiert', () => {
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      for (const sektor of DASHBOARD_TEMPLATES[lerntyp]) {
        for (const item of sektor.items) {
          expect(item.type).not.toBe(ITEM_TYPE.AUFGABE);
        }
      }
    }
  });

  it('alle ref_ids verweisen auf bekannte System-Baustein-IDs (Präfix sys_)', () => {
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      for (const sektor of DASHBOARD_TEMPLATES[lerntyp]) {
        for (const item of sektor.items) {
          expect(item.ref_id.startsWith('sys_'), `ref_id ${item.ref_id}`).toBe(true);
        }
      }
    }
  });

  it('die alte Karte sys_landkarte ist NICHT mehr in den V2-Templates enthalten', () => {
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      for (const sektor of DASHBOARD_TEMPLATES[lerntyp]) {
        for (const item of sektor.items) {
          expect(item.ref_id).not.toBe('sys_landkarte');
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// V2-Spezifikation: konkrete Sektor-Längen, Modi und Schlüssel-Items
// ─────────────────────────────────────────────────────────────────────────
describe('DASHBOARD_TEMPLATES – V2-Spezifikation', () => {
  it('minimalist hat 4 Sektoren, alle sequenziell', () => {
    const t = DASHBOARD_TEMPLATES.minimalist;
    expect(t).toHaveLength(4);
    t.forEach((s) => expect(s.modus).toBe('sequenziell'));
  });

  it('pragmatiker hat 5 Sektoren mit erwartetem Modus-Muster', () => {
    const t = DASHBOARD_TEMPLATES.pragmatiker;
    expect(t).toHaveLength(5);
    expect(t.map((s) => s.modus)).toEqual([
      'sequenziell',
      'sequenziell',
      'sequenziell',
      'frei',
      'sequenziell',
    ]);
  });

  it('ehrgeizige hat 4 Sektoren, alle sequenziell', () => {
    const t = DASHBOARD_TEMPLATES.ehrgeizige;
    expect(t).toHaveLength(4);
    t.forEach((s) => expect(s.modus).toBe('sequenziell'));
  });

  it('passionierte hat 2 Sektoren, alle frei', () => {
    const t = DASHBOARD_TEMPLATES.passionierte;
    expect(t).toHaveLength(2);
    t.forEach((s) => expect(s.modus).toBe('frei'));
  });

  it('minimalist Sektor 1 startet mit sec0_overview → diagnose', () => {
    const sec = DASHBOARD_TEMPLATES.minimalist[0];
    expect(sec.items.map((i) => i.ref_id)).toEqual([
      'sys_sec0_overview',
      'sys_diagnose',
    ]);
  });

  it('minimalist Sektor 2 enthält nur die reduzierte Karte', () => {
    expect(DASHBOARD_TEMPLATES.minimalist[1].items.map((i) => i.ref_id)).toEqual([
      'sys_map_reduced',
    ]);
  });

  it('pragmatiker Sektor 4 (frei) ist der Brian-Bündel-Platzhalter', () => {
    const sec = DASHBOARD_TEMPLATES.pragmatiker[3];
    expect(sec.modus).toBe('frei');
    expect(sec.items.map((i) => i.ref_id)).toEqual(['sys_platzhalter_brian_buendel']);
  });

  it('ehrgeizige Sektor 4 hat die volle Prüfungssequenz', () => {
    const sec = DASHBOARD_TEMPLATES.ehrgeizige[3];
    expect(sec.items.map((i) => i.ref_id)).toEqual([
      'sys_platzhalter_moodle_buendel',
      'sys_zwischentest',
      'sys_exam_register',
      'sys_platzhalter_projekt',
    ]);
  });

  it('passionierte Sektor 1 enthält ausschließlich die volle Karte', () => {
    expect(DASHBOARD_TEMPLATES.passionierte[0].items.map((i) => i.ref_id)).toEqual([
      'sys_map_full',
    ]);
  });

  it('passionierte Sektor 2 enthält Moodle-Bündel + 2× Ebene-2 + Projekt', () => {
    expect(DASHBOARD_TEMPLATES.passionierte[1].items.map((i) => i.ref_id)).toEqual([
      'sys_platzhalter_moodle_buendel',
      'sys_platzhalter_ebene2',
      'sys_platzhalter_ebene2',
      'sys_platzhalter_projekt',
    ]);
  });
});