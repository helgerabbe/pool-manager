/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * deltaPayloadGenerator.test.js
 *
 * Sprint G – Brian-Export-Anschluss.
 * Verifiziert, dass der Delta-Payload-Generator die typ-spezifischen
 * Felder für AllgemeineAufgabe als flache Key-Value-Paare ausgibt:
 *   - lernpaket_logik          (Typ buendel)
 *   - erforderliche_anzahl     (Typ auswahl_buendel)
 *   - interne_reihenfolge      (Typ auswahl_buendel)
 *   - hinweise_zum_material    (Typ handlung)
 *
 * Felder werden nur ausgegeben, wenn sie für den jeweiligen aufgaben_typ
 * relevant UND tatsächlich befüllt sind.
 */

import { generateDeltaPayload } from '@/lib/deltaPayloadGenerator';

const EINHEIT = {
  id: 'e1',
  titel_der_einheit: 'Test-Einheit',
  fach: 'Mathe',
  jahrgangsstufe: '9',
  updated_date: '2026-01-01T00:00:00Z',
};

const baseAufgabe = (overrides) => ({
  id: 'a1',
  einheit_id: 'e1',
  aufgaben_typ: 'inhalt',
  anforderungsebene: '2 - Transfer',
  content_status: 'approved',
  updated_date: '2026-04-26T12:00:00Z',
  ...overrides,
});

function buildPayload(allgemeineAufgaben) {
  return generateDeltaPayload(
    EINHEIT,
    [], // lernpakete
    [], // lernziele
    [], // aufgabenbausteine
    [], // themenfelder
    null, // lastExportedAt
    false, // deltaOnly
    allgemeineAufgaben
  );
}

describe('Sprint G – Delta-Export für AllgemeineAufgabe', () => {
  it('gibt einen leeren Slot zurück, wenn keine Aufgaben vorhanden sind', () => {
    const payload = buildPayload([]);
    expect(payload.delta.allgemeine_aufgaben).toEqual([]);
    expect(payload.statistics.allgemeine_aufgaben_count).toBe(0);
  });

  it('exportiert Inhalts-Aufgaben ohne typ-spezifische Felder', () => {
    const payload = buildPayload([baseAufgabe({ aufgaben_typ: 'inhalt' })]);
    const out = payload.delta.allgemeine_aufgaben[0];
    expect(out.aufgaben_typ).toBe('inhalt');
    expect(out).not.toHaveProperty('lernpaket_logik');
    expect(out).not.toHaveProperty('erforderliche_anzahl');
    expect(out).not.toHaveProperty('interne_reihenfolge');
    expect(out).not.toHaveProperty('hinweise_zum_material');
  });

  it('gibt lernpaket_logik nur für aufgaben_typ=buendel aus', () => {
    const payload = buildPayload([
      baseAufgabe({
        id: 'b1',
        aufgaben_typ: 'buendel',
        lernpaket_logik: 'fast_track',
        verlinkte_lernpaket_ids: ['lp1', 'lp2'],
      }),
    ]);
    const out = payload.delta.allgemeine_aufgaben[0];
    expect(out.lernpaket_logik).toBe('fast_track');
    expect(out.verlinkte_lernpaket_ids).toEqual(['lp1', 'lp2']);
  });

  it('gibt lernpaket_logik nicht aus, wenn das Feld leer ist', () => {
    const payload = buildPayload([
      baseAufgabe({ id: 'b2', aufgaben_typ: 'buendel', lernpaket_logik: '' }),
    ]);
    expect(payload.delta.allgemeine_aufgaben[0]).not.toHaveProperty('lernpaket_logik');
  });

  it('gibt erforderliche_anzahl + interne_reihenfolge nur für auswahl_buendel aus', () => {
    const payload = buildPayload([
      baseAufgabe({
        id: 'ab1',
        aufgaben_typ: 'auswahl_buendel',
        erforderliche_anzahl: 3,
        interne_reihenfolge: 'sequenziell',
        verlinkte_aufgaben_ids: ['x1', 'x2', 'x3', 'x4'],
      }),
    ]);
    const out = payload.delta.allgemeine_aufgaben[0];
    expect(out.erforderliche_anzahl).toBe(3);
    expect(out.interne_reihenfolge).toBe('sequenziell');
    expect(out.verlinkte_aufgaben_ids).toEqual(['x1', 'x2', 'x3', 'x4']);
  });

  it('gibt erforderliche_anzahl=0 explizit aus (alle Aufgaben Pflicht)', () => {
    const payload = buildPayload([
      baseAufgabe({
        id: 'ab2',
        aufgaben_typ: 'auswahl_buendel',
        erforderliche_anzahl: 0,
        verlinkte_aufgaben_ids: ['x1'],
      }),
    ]);
    expect(payload.delta.allgemeine_aufgaben[0].erforderliche_anzahl).toBe(0);
  });

  it('gibt hinweise_zum_material nur für aufgaben_typ=handlung aus', () => {
    const payload = buildPayload([
      baseAufgabe({
        id: 'h1',
        aufgaben_typ: 'handlung',
        hinweise_zum_material: 'Schere, Klebstoff, Tonpapier',
      }),
    ]);
    expect(payload.delta.allgemeine_aufgaben[0].hinweise_zum_material).toBe(
      'Schere, Klebstoff, Tonpapier'
    );
  });

  it('gibt hinweise_zum_material nicht aus, wenn das Feld leer ist', () => {
    const payload = buildPayload([
      baseAufgabe({ id: 'h2', aufgaben_typ: 'handlung', hinweise_zum_material: '' }),
    ]);
    expect(payload.delta.allgemeine_aufgaben[0]).not.toHaveProperty('hinweise_zum_material');
  });

  it('mischt verschiedene Typen korrekt im selben Export', () => {
    const payload = buildPayload([
      baseAufgabe({ id: 'i', aufgaben_typ: 'inhalt' }),
      baseAufgabe({
        id: 'b',
        aufgaben_typ: 'buendel',
        lernpaket_logik: 'wissensspeicher',
      }),
      baseAufgabe({
        id: 'ab',
        aufgaben_typ: 'auswahl_buendel',
        erforderliche_anzahl: 2,
        interne_reihenfolge: 'frei',
      }),
      baseAufgabe({
        id: 'h',
        aufgaben_typ: 'handlung',
        hinweise_zum_material: 'Kreide',
      }),
    ]);
    expect(payload.delta.allgemeine_aufgaben).toHaveLength(4);
    expect(payload.statistics.allgemeine_aufgaben_count).toBe(4);
    expect(payload.statistics.total_changed_count).toBe(4);
  });

  it('filtert Aufgaben aus anderer Einheit korrekt heraus', () => {
    const payload = buildPayload([
      baseAufgabe({ id: 'k1', einheit_id: 'OTHER' }),
      baseAufgabe({ id: 'k2' }),
    ]);
    const ids = payload.delta.allgemeine_aufgaben.map((a) => a.id);
    expect(ids).toEqual(['k2']);
  });

  it('schließt to_delete-Aufgaben aus dem Export aus', () => {
    const payload = buildPayload([
      baseAufgabe({ id: 'd1', sync_status: 'to_delete' }),
      baseAufgabe({ id: 'd2' }),
    ]);
    const ids = payload.delta.allgemeine_aufgaben.map((a) => a.id);
    expect(ids).toEqual(['d2']);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sprint G – Folge-Audit: Validierung & Auto-Include referenzierter Kinder
// ─────────────────────────────────────────────────────────────────────────

describe('Sprint G – validateDeltaDependencies (erweitert)', () => {
  function callGenerator({
    pakete = [],
    allgemeine = [],
    deltaOnly = false,
    lastExportedAt = null,
  } = {}) {
    return generateDeltaPayload(
      EINHEIT,
      pakete,
      [], // lernziele
      [], // aufgabenbausteine
      [], // themenfelder
      lastExportedAt,
      deltaOnly,
      allgemeine
    );
  }

  // ── Validierung neuer Referenzen ───────────────────────────────────────

  it('wirft, wenn ein Brian-Bündel auf eine nicht existierende Aufgabe zeigt', () => {
    expect(() =>
      callGenerator({
        allgemeine: [
          baseAufgabe({
            id: 'ab1',
            aufgaben_typ: 'auswahl_buendel',
            erforderliche_anzahl: 1,
            verlinkte_aufgaben_ids: ['ghost'],
          }),
        ],
      })
    ).toThrow(/Brian-Bündel.*ghost/);
  });

  it('wirft, wenn ein Moodle-Bündel auf ein nicht existierendes Lernpaket zeigt', () => {
    expect(() =>
      callGenerator({
        allgemeine: [
          baseAufgabe({
            id: 'b1',
            aufgaben_typ: 'buendel',
            verlinkte_lernpaket_ids: ['lp_ghost'],
          }),
        ],
      })
    ).toThrow(/Moodle-Bündel.*lp_ghost/);
  });

  it('wirft, wenn ein Projekt-Anker auf eine nicht existierende Projekt-Aufgabe zeigt', () => {
    expect(() =>
      callGenerator({
        allgemeine: [
          baseAufgabe({
            id: 'pa1',
            aufgaben_typ: 'projekt_anker',
            verlinkte_projekt_ids: ['proj_ghost'],
          }),
        ],
      })
    ).toThrow(/Projekt-Anker.*proj_ghost/);
  });

  it('wirft NICHT, wenn alle Referenzen aufgelöst werden können', () => {
    const child = baseAufgabe({ id: 'c1', aufgaben_typ: 'inhalt' });
    const buendel = baseAufgabe({
      id: 'ab1',
      aufgaben_typ: 'auswahl_buendel',
      erforderliche_anzahl: 1,
      verlinkte_aufgaben_ids: ['c1'],
    });
    expect(() =>
      callGenerator({ allgemeine: [child, buendel] })
    ).not.toThrow();
  });

  // ── Auto-Include unveränderter Kinder im Delta ────────────────────────

  it('zieht unveränderte Brian-Bündel-Kinder bei Delta-Export mit hinein', () => {
    const lastExport = '2026-04-20T00:00:00Z';
    // Kind ist VOR dem letzten Export verändert worden → würde im Delta normal nicht auftauchen.
    const child = baseAufgabe({
      id: 'c1',
      aufgaben_typ: 'inhalt',
      updated_date: '2026-04-19T00:00:00Z',
    });
    // Bündel selbst ist neu/geändert.
    const buendel = baseAufgabe({
      id: 'ab1',
      aufgaben_typ: 'auswahl_buendel',
      erforderliche_anzahl: 1,
      verlinkte_aufgaben_ids: ['c1'],
      updated_date: '2026-04-25T00:00:00Z',
    });
    const payload = generateDeltaPayload(
      EINHEIT, [], [], [], [],
      lastExport,
      true, // deltaOnly!
      [child, buendel]
    );
    const ids = payload.delta.allgemeine_aufgaben.map((a) => a.id).sort();
    expect(ids).toEqual(['ab1', 'c1']);
  });

  it('zieht unveränderte Lernpakete bei Moodle-Bündel-Export mit hinein', () => {
    const lastExport = '2026-04-20T00:00:00Z';
    const paket = {
      id: 'lp1',
      einheit_id: 'e1',
      titel_des_pakets: 'Altes Paket',
      reihenfolge_nummer: 1,
      updated_date: '2026-04-10T00:00:00Z', // alt – würde im Delta entfallen
    };
    const buendel = baseAufgabe({
      id: 'b1',
      aufgaben_typ: 'buendel',
      verlinkte_lernpaket_ids: ['lp1'],
      updated_date: '2026-04-25T00:00:00Z',
    });
    const payload = generateDeltaPayload(
      EINHEIT, [paket], [], [], [],
      lastExport,
      true, // deltaOnly
      [buendel]
    );
    const ids = payload.delta.lernpakete.map((p) => p.id);
    expect(ids).toContain('lp1');
  });

  it('dupliziert mitgezogene Kinder nicht im Slot', () => {
    const lastExport = '2026-04-20T00:00:00Z';
    // Beide Items sind nach dem letzten Export geändert → tauchen ohnehin auf.
    const child = baseAufgabe({
      id: 'c1',
      updated_date: '2026-04-25T00:00:00Z',
    });
    const buendel = baseAufgabe({
      id: 'ab1',
      aufgaben_typ: 'auswahl_buendel',
      erforderliche_anzahl: 1,
      verlinkte_aufgaben_ids: ['c1'],
      updated_date: '2026-04-25T00:00:00Z',
    });
    const payload = generateDeltaPayload(
      EINHEIT, [], [], [], [],
      lastExport,
      true,
      [child, buendel]
    );
    const c1Count = payload.delta.allgemeine_aufgaben.filter((a) => a.id === 'c1').length;
    expect(c1Count).toBe(1);
  });
});