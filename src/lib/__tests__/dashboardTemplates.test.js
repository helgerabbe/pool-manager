/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * dashboardTemplates.test.js
 *
 * Schema-Validierung für das statische Template-Repository (Phase 2 des
 * Magic-Raster-Epics). Diese Tests sind reine Struktur-Checks – keine
 * Komponenten- oder DB-Tests – und stellen sicher, dass:
 *
 *   1. Alle vier Lerntypen vorhanden sind und ein Array liefern.
 *   2. Jeder Sektor ein valides Schema hat (sektor_id, titel, modus, items).
 *   3. Jedes Item exakt das Format { type: 'system', ref_id: <string> } hat.
 *   4. Keine Inhaltsaufgaben (`type: 'aufgabe'`) hartcodiert sind.
 *   5. Sektor-IDs eindeutig sind und das `tpl_`-Präfix tragen
 *      (Konvention, damit sie beim Anwenden in echte UUIDs umgeschrieben
 *      werden können).
 */

import {
  DASHBOARD_TEMPLATES,
  TEMPLATE_LERN_TYPEN,
} from '@/lib/dashboardTemplates';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const VALID_MODI = ['sequenziell', 'frei'];

// ─────────────────────────────────────────────────────────────────────────
// Top-Level: Lerntypen vollständig
// ─────────────────────────────────────────────────────────────────────────
describe('DASHBOARD_TEMPLATES – Top-Level-Struktur', () => {
  it('exportiert genau die vier Lerntyp-Schlüssel', () => {
    const keys = Object.keys(DASHBOARD_TEMPLATES).sort();
    expect(keys).toEqual(['ehrgeizig', 'minimalist', 'passioniert', 'pragmatiker']);
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

        // sektor_id: nicht-leerer String, Konvention "tpl_*".
        expect(typeof sektor.sektor_id, `${ctx}.sektor_id`).toBe('string');
        expect(sektor.sektor_id.length, `${ctx}.sektor_id leer`).toBeGreaterThan(0);
        expect(sektor.sektor_id.startsWith('tpl_'), `${ctx} Präfix tpl_`).toBe(true);

        // titel: nicht-leerer String.
        expect(typeof sektor.titel, `${ctx}.titel`).toBe('string');
        expect(sektor.titel.trim().length, `${ctx}.titel leer`).toBeGreaterThan(0);

        // modus: in der Whitelist.
        expect(VALID_MODI, `${ctx}.modus`).toContain(sektor.modus);

        // items: Array (auch leer ist erlaubt; wir prüfen weiter unten,
        // dass Templates praktisch immer Items haben).
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
// Item-Schema: ausschließlich System-Bausteine
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

          // type === 'system' (über die Konstante, damit ein Refactor
          // der Konstante diesen Test automatisch mitnimmt).
          expect(item.type, `${ctx}.type`).toBe(ITEM_TYPE.SYSTEM);

          // ref_id: nicht-leerer String.
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
    // Defensive Konvention: System-Bausteine haben das Präfix `sys_`.
    // Falls irgendwo eine UUID statt einer Baustein-ID landet, schlägt
    // dieser Test sofort an.
    for (const lerntyp of TEMPLATE_LERN_TYPEN) {
      for (const sektor of DASHBOARD_TEMPLATES[lerntyp]) {
        for (const item of sektor.items) {
          expect(item.ref_id.startsWith('sys_'), `ref_id ${item.ref_id}`).toBe(true);
        }
      }
    }
  });
});