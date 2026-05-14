/**
 * Tests für lib/completenessValidation.js
 *
 * Deckt die wichtigsten Aktivitätstypen + Allgemeine Aufgaben + Projekte +
 * Lernpaket-Aggregation ab.
 */

import { describe, it, expect } from 'vitest';
import {
  validateActivity,
  validateAllgemeineAufgabe,
  validateProjektaufgabe,
  validateLernpaketReleaseReadiness,
} from '../completenessValidation';

// ---------------------------------------------------------------------------
// Aktivität: generisches form_schema (z.B. Link/URL)
// ---------------------------------------------------------------------------

describe('validateActivity — generisches form_schema', () => {
  const linkKatalog = {
    name: 'Link / URL',
    form_schema: [
      { field_name: 'url', type: 'url', label: 'Webadresse', required: true },
      { field_name: 'titel', type: 'text', label: 'Titel', required: true },
      { field_name: 'aufgabentext', type: 'textarea', label: 'Aufgabenstellung', required: false },
    ],
  };

  it('meldet leere Pflichtfelder', () => {
    const res = validateActivity(linkKatalog, {});
    expect(res.isComplete).toBe(false);
    expect(res.missingFields.map(m => m.fieldName)).toEqual(['url', 'titel']);
  });

  it('ignoriert leere optionale Felder', () => {
    const res = validateActivity(linkKatalog, {
      url: 'https://example.com',
      titel: 'Test',
    });
    expect(res.isComplete).toBe(true);
    expect(res.missingFields).toHaveLength(0);
  });

  it('Whitespace allein zählt als leer', () => {
    const res = validateActivity(linkKatalog, { url: '   ', titel: 'X' });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields).toHaveLength(1);
    expect(res.missingFields[0].fieldName).toBe('url');
  });

  it('info-Felder werden ignoriert', () => {
    const k = {
      form_schema: [
        { field_name: 'hinweis', type: 'info', label: 'Hinweis', required: true },
        { field_name: 'titel', type: 'text', label: 'Titel', required: true },
      ],
    };
    const res = validateActivity(k, { titel: 'X' });
    expect(res.isComplete).toBe(true);
  });

  it('leerer Katalog → vollständig (defensiv)', () => {
    expect(validateActivity(null, {}).isComplete).toBe(true);
    expect(validateActivity({}, {}).isComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Aktivität: Spezial-JSON-Felder
// ---------------------------------------------------------------------------

describe('validateActivity — Begriffe zuordnen (match_data)', () => {
  const katalog = {
    name: 'Begriffe zuordnen',
    form_schema: [
      { field_name: 'instruction', type: 'text', label: 'Anweisung', required: true },
      { field_name: 'match_data', type: 'json', label: 'Paare', required: true },
    ],
  };

  it('verlangt 3 vollständige Paare', () => {
    const res = validateActivity(katalog, {
      instruction: 'Ordne zu',
      match_data: { pairs: [{ left: 'A', right: '1' }, { left: 'B', right: '' }] },
    });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields[0].fieldName).toBe('match_data');
  });

  it('ist vollständig mit 3 Paaren', () => {
    const res = validateActivity(katalog, {
      instruction: 'Ordne zu',
      match_data: {
        pairs: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' },
          { left: 'C', right: '3' },
        ],
      },
    });
    expect(res.isComplete).toBe(true);
  });
});

describe('validateActivity — Multiple Choice (mc_data)', () => {
  const katalog = {
    form_schema: [
      { field_name: 'instruction', type: 'text', label: 'Frage', required: true },
      { field_name: 'mc_data', type: 'json', label: 'Antworten', required: true },
    ],
  };

  it('verlangt mind. 2 Antworten', () => {
    const res = validateActivity(katalog, {
      instruction: 'Was ist 1+1?',
      mc_data: { questions: [{ text: 'F', answers: [{ text: 'A', correct: true }] }] },
    });
    expect(res.isComplete).toBe(false);
  });

  it('verlangt mind. 1 korrekte Antwort', () => {
    const res = validateActivity(katalog, {
      instruction: 'Frage',
      mc_data: {
        questions: [{ text: 'F', answers: [{ text: 'A' }, { text: 'B' }] }],
      },
    });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields[0].reason).toMatch(/richtige Antwort/);
  });

  it('ist vollständig mit valider Frage', () => {
    const res = validateActivity(katalog, {
      instruction: 'F',
      mc_data: {
        questions: [{ text: 'F', answers: [{ text: 'A', correct: true }, { text: 'B' }] }],
      },
    });
    expect(res.isComplete).toBe(true);
  });
});

describe('validateActivity — Lückentext (lueckentext_data)', () => {
  const katalog = {
    form_schema: [
      { field_name: 'lueckentext_data', type: 'json', label: 'Lückentext', required: true },
    ],
  };

  it('verlangt mindestens eine Lücke', () => {
    expect(validateActivity(katalog, { lueckentext_data: { text: 'Hallo' } }).isComplete).toBe(false);
  });

  it('ist vollständig mit Text + 1 Lücke', () => {
    const res = validateActivity(katalog, {
      lueckentext_data: { text: 'Hallo ___', gaps: [{ id: 1, correct: 'Welt' }] },
    });
    expect(res.isComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Allgemeine Aufgabe
// ---------------------------------------------------------------------------

describe('validateAllgemeineAufgabe', () => {
  it('aufgaben_typ=inhalt verlangt aufgabenstellung', () => {
    const res = validateAllgemeineAufgabe({ aufgaben_typ: 'inhalt' });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields[0].fieldName).toBe('aufgabenstellung');
  });

  it('aufgaben_typ=buendel verlangt mind. 1 Lernpaket', () => {
    const res = validateAllgemeineAufgabe({ aufgaben_typ: 'buendel', verlinkte_lernpaket_ids: [] });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields[0].fieldName).toBe('verlinkte_lernpaket_ids');
  });

  it('aufgaben_typ=buendel mit Lernpaket ist vollständig', () => {
    const res = validateAllgemeineAufgabe({ aufgaben_typ: 'buendel', verlinkte_lernpaket_ids: ['lp1'] });
    expect(res.isComplete).toBe(true);
  });

  it('aufgaben_typ=auswahl_buendel verlangt 2 Aufgaben + erforderliche_anzahl', () => {
    const res = validateAllgemeineAufgabe({
      aufgaben_typ: 'auswahl_buendel',
      verlinkte_aufgaben_ids: ['a1'],
      erforderliche_anzahl: 0,
    });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields).toHaveLength(2);
  });

  it('aufgaben_typ=handlung verlangt aufgabenstellung + material-hinweise', () => {
    const res = validateAllgemeineAufgabe({
      aufgaben_typ: 'handlung',
      aufgabenstellung: 'tu was',
    });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields[0].fieldName).toBe('hinweise_zum_material');
  });

  it('KI-Modus offen verlangt lernziel + funktionsweise', () => {
    const res = validateAllgemeineAufgabe({
      aufgaben_typ: 'inhalt',
      erstellungs_modus: 'ki',
      ki_briefing: { variant: 'offen', offen: { lernziel: 'X' } },
    });
    expect(res.isComplete).toBe(false);
    expect(res.missingFields[0].fieldName).toBe('ki_briefing.offen.funktionsweise');
  });

  it('KI-Modus standard verlangt schwerpunkt', () => {
    const res = validateAllgemeineAufgabe({
      erstellungs_modus: 'ki',
      ki_briefing: { variant: 'standard', standard: {} },
    });
    expect(res.isComplete).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Projektaufgabe
// ---------------------------------------------------------------------------

describe('validateProjektaufgabe', () => {
  it('verlangt erwartungshorizont, ergebnis_form, ergebnis_dateiformat', () => {
    const res = validateProjektaufgabe({
      aufgaben_typ: 'inhalt',
      aufgabenstellung: 'X',
    });
    expect(res.isComplete).toBe(false);
    const names = res.missingFields.map(m => m.fieldName);
    expect(names).toContain('erwartungshorizont');
    expect(names).toContain('ergebnis_form');
    expect(names).toContain('ergebnis_dateiformat');
  });

  it('ist vollständig wenn alle Felder gesetzt', () => {
    const res = validateProjektaufgabe({
      aufgaben_typ: 'inhalt',
      aufgabenstellung: 'Stelle ein Plakat her',
      erwartungshorizont: 'Klar strukturiert',
      ergebnis_form: 'Präsentation / Folien',
      ergebnis_dateiformat: 'Präsentationsdatei (PowerPoint/PDF)',
    });
    expect(res.isComplete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lernpaket-Aggregation
// ---------------------------------------------------------------------------

describe('validateLernpaketReleaseReadiness', () => {
  it('blockiert wenn eine Aktivität nicht freigegeben ist', () => {
    const lp = { phasen_konfiguration: {} };
    const acts = [
      { id: 'a1', phase: 'Input', is_complete: true, content_status: 'approved', titel: 'A1' },
      { id: 'a2', phase: 'Übung', is_complete: true, content_status: 'draft', titel: 'A2' },
    ];
    const res = validateLernpaketReleaseReadiness(lp, acts);
    expect(res.isComplete).toBe(false);
    expect(res.blockingActivities).toHaveLength(1);
    expect(res.blockingActivities[0].id).toBe('a2');
  });

  it('blockiert wenn eine Aktivität unvollständig ist', () => {
    const lp = { phasen_konfiguration: {} };
    const acts = [
      { id: 'a1', phase: 'Input', is_complete: false, content_status: 'approved', titel: 'A1' },
    ];
    expect(validateLernpaketReleaseReadiness(lp, acts).isComplete).toBe(false);
  });

  it('ist freigabe-bereit wenn alle freigegeben+vollständig', () => {
    const lp = { phasen_konfiguration: {} };
    const acts = [
      { id: 'a1', phase: 'Input', is_complete: true, content_status: 'approved' },
      { id: 'a2', phase: 'Übung', is_complete: true, content_status: 'approved' },
    ];
    expect(validateLernpaketReleaseReadiness(lp, acts).isComplete).toBe(true);
  });

  it('ignoriert deaktivierte Phasen', () => {
    const lp = { phasen_konfiguration: { Abschluss: { disabled: true } } };
    const acts = [
      { id: 'a1', phase: 'Input', is_complete: true, content_status: 'approved' },
      { id: 'a2', phase: 'Abschluss', is_complete: false, content_status: 'draft' },
    ];
    expect(validateLernpaketReleaseReadiness(lp, acts).isComplete).toBe(true);
  });

  it('leeres Lernpaket ist nicht freigabe-bereit', () => {
    expect(validateLernpaketReleaseReadiness({ phasen_konfiguration: {} }, []).isComplete).toBe(false);
  });
});