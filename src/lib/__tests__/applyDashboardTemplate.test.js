/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * applyDashboardTemplate.test.js
 *
 * Tests für die Magic-Raster-Apply-Logik (Phase 4). Verifiziert:
 *   - Frische UUIDs für jeden Sektor (keine Kollision mit Template-tpl_*-IDs).
 *   - Vollständige Überschreibung des Ziel-Lerntyps.
 *   - Andere Lerntypen bleiben unangetastet (Immutability).
 *   - Items werden korrekt durchgereicht (System-Items behalten ihren type).
 *   - Defensive: leere/ungültige Eingaben.
 */

import { applyDashboardTemplate } from '@/lib/lernpfadeUtils';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';

const makeKonfig = (overrides = {}) => ({
  minimalist: [],
  pragmatiker: [],
  ehrgeizig: [],
  passioniert: [],
  ...overrides,
});

describe('applyDashboardTemplate – frische Sektor-IDs', () => {
  it('erzeugt für jeden Sektor eine NEUE ID, die nicht das tpl_-Präfix trägt', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);

    expect(next.minimalist).toHaveLength(DASHBOARD_TEMPLATES.minimalist.length);
    next.minimalist.forEach((sektor) => {
      expect(sektor.sektor_id).toBeTruthy();
      expect(sektor.sektor_id.startsWith('tpl_')).toBe(false);
      expect(sektor.sektor_id.startsWith('sec_')).toBe(true);
    });
  });

  it('alle generierten Sektor-IDs sind innerhalb des Ergebnisses eindeutig', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'pragmatiker', DASHBOARD_TEMPLATES.pragmatiker);
    const ids = next.pragmatiker.map((s) => s.sektor_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('zweimaliges Anwenden desselben Templates erzeugt unterschiedliche IDs', () => {
    const konfig = makeKonfig();
    const a = applyDashboardTemplate(konfig, 'ehrgeizig', DASHBOARD_TEMPLATES.ehrgeizig);
    const b = applyDashboardTemplate(konfig, 'ehrgeizig', DASHBOARD_TEMPLATES.ehrgeizig);
    expect(a.ehrgeizig[0].sektor_id).not.toBe(b.ehrgeizig[0].sektor_id);
  });
});

describe('applyDashboardTemplate – Überschreiben & Isolation', () => {
  it('ersetzt das Sektor-Array des Ziel-Lerntyps komplett (auch bei vorhandenem Inhalt)', () => {
    const konfig = makeKonfig({
      minimalist: [
        {
          sektor_id: 'sec_old',
          titel: 'Alter Sektor',
          modus: 'frei',
          items: [{ type: 'aufgabe', ref_id: 'uuid-1' }],
        },
      ],
    });
    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);

    // Alter Sektor weg.
    expect(next.minimalist.find((s) => s.sektor_id === 'sec_old')).toBeUndefined();
    // Neue Sektoren-Anzahl entspricht Template.
    expect(next.minimalist).toHaveLength(DASHBOARD_TEMPLATES.minimalist.length);
  });

  it('andere Lerntypen bleiben unangetastet (referenzielle Identität)', () => {
    const fremder = [
      { sektor_id: 'sec_keep', titel: 'Bleibt', modus: 'sequenziell', items: [] },
    ];
    const konfig = makeKonfig({ pragmatiker: fremder });

    const next = applyDashboardTemplate(konfig, 'minimalist', DASHBOARD_TEMPLATES.minimalist);
    expect(next.pragmatiker).toBe(fremder);
    expect(next.ehrgeizig).toBe(konfig.ehrgeizig);
    expect(next.passioniert).toBe(konfig.passioniert);
  });

  it('liefert IMMUTABLE: Eingangs-Konfig wird nicht mutiert', () => {
    const konfig = makeKonfig();
    const snapshot = JSON.stringify(konfig);
    applyDashboardTemplate(konfig, 'passioniert', DASHBOARD_TEMPLATES.passioniert);
    expect(JSON.stringify(konfig)).toBe(snapshot);
  });
});

describe('applyDashboardTemplate – Items werden korrekt übernommen', () => {
  it('jedes Item bleibt type === "system" mit identischer ref_id', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'pragmatiker', DASHBOARD_TEMPLATES.pragmatiker);

    DASHBOARD_TEMPLATES.pragmatiker.forEach((tplSektor, idx) => {
      const resultSektor = next.pragmatiker[idx];
      expect(resultSektor.items).toHaveLength(tplSektor.items.length);
      resultSektor.items.forEach((item, iIdx) => {
        expect(item.type).toBe(ITEM_TYPE.SYSTEM);
        expect(item.ref_id).toBe(tplSektor.items[iIdx].ref_id);
      });
    });
  });

  it('titel und modus werden 1:1 übernommen', () => {
    const konfig = makeKonfig();
    const next = applyDashboardTemplate(konfig, 'ehrgeizig', DASHBOARD_TEMPLATES.ehrgeizig);
    DASHBOARD_TEMPLATES.ehrgeizig.forEach((tplSektor, idx) => {
      expect(next.ehrgeizig[idx].titel).toBe(tplSektor.titel);
      expect(next.ehrgeizig[idx].modus).toBe(tplSektor.modus);
    });
  });
});

describe('applyDashboardTemplate – Defensive Inputs', () => {
  it('liefert die Konfig unverändert zurück, wenn lerntyp fehlt', () => {
    const konfig = makeKonfig();
    expect(applyDashboardTemplate(konfig, '', DASHBOARD_TEMPLATES.minimalist)).toBe(konfig);
    expect(applyDashboardTemplate(konfig, null, DASHBOARD_TEMPLATES.minimalist)).toBe(konfig);
  });

  it('liefert die Konfig unverändert zurück, wenn templateData kein Array ist', () => {
    const konfig = makeKonfig();
    expect(applyDashboardTemplate(konfig, 'minimalist', null)).toBe(konfig);
    expect(applyDashboardTemplate(konfig, 'minimalist', undefined)).toBe(konfig);
    expect(applyDashboardTemplate(konfig, 'minimalist', 'oops')).toBe(konfig);
  });

  it('akzeptiert eine leere Konfig (frischer Lernpfad)', () => {
    const next = applyDashboardTemplate(undefined, 'minimalist', DASHBOARD_TEMPLATES.minimalist);
    expect(Array.isArray(next.minimalist)).toBe(true);
    expect(next.minimalist).toHaveLength(DASHBOARD_TEMPLATES.minimalist.length);
  });

  it('leeres Template-Array löscht den Pfad sauber', () => {
    const konfig = makeKonfig({
      minimalist: [{ sektor_id: 'sec_old', titel: 'X', modus: 'sequenziell', items: [] }],
    });
    const next = applyDashboardTemplate(konfig, 'minimalist', []);
    expect(next.minimalist).toEqual([]);
  });
});