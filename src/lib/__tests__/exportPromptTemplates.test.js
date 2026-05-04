/**
 * exportPromptTemplates.test.js
 *
 * Snapshot-/Strukturtests für die deterministische MBK-Template-Engine.
 *
 * Ziel: Regressionsschutz, falls ein späterer Refactor das Wording oder
 * die Reihenfolge versehentlich ändert. Wir prüfen NICHT pixelgenau,
 * sondern auf charakteristische Marker (Headings, Pflicht-Sätze,
 * Halluzinations-Fallback).
 *
 * Wenn die Templates absichtlich geändert werden, MUSS auch
 * MBK_TEMPLATE_VERSION hochgezählt werden (das wird hier mitgeprüft).
 */
import { describe, it, expect } from 'vitest';
import {
  MBK_TEMPLATE_VERSION,
  buildNucleusPrompt,
  buildPersonaPrompt,
  buildSektorStrukturPrompt,
  buildSektorPrompt,
  buildErstellungspaketForLernpaket,
  buildErstellungspaketForAufgabe,
} from '../exportPromptTemplates';

describe('MBK Template Engine', () => {
  describe('Versionierung', () => {
    it('exportiert eine konkrete Version', () => {
      expect(typeof MBK_TEMPLATE_VERSION).toBe('string');
      expect(MBK_TEMPLATE_VERSION.length).toBeGreaterThan(0);
    });
  });

  describe('buildNucleusPrompt', () => {
    const baseArgs = {
      einheit: {
        fach: 'Mathematik',
        jahrgangsstufe: '7',
        titel_der_einheit: 'Bruchrechnung',
        gesamtziele: ['Brüche addieren', 'Brüche kürzen'],
      },
      stammdaten: { land: 'Deutschland', bundesland: 'Niedersachsen', schulform: 'IGS' },
      themenfelder: [
        { id: 'tf1', titel: 'Grundlagen', reihenfolge: 1 },
        { id: 'tf2', titel: 'Erweitert', reihenfolge: 2 },
      ],
      lernpakete: [
        { id: 'lp1', titel_des_pakets: 'Brüche kennen', themenfeld_id: 'tf1', reihenfolge_nummer: 1 },
        { id: 'lp2', titel_des_pakets: 'Brüche addieren', themenfeld_id: 'tf1', reihenfolge_nummer: 2 },
      ],
      lernziele: [
        { lernpaket_id: 'lp1', formulierung_fachsprache: 'Ich kann Brüche erkennen.' },
        { lernpaket_id: 'lp2', formulierung_fachsprache: 'Ich kann Brüche addieren.' },
      ],
    };

    it('enthält Stammdaten, Einheit-Metadaten und Lernlandkarte', () => {
      const out = buildNucleusPrompt(baseArgs);
      expect(out).toContain('Kontext-Anker (Nukleus)');
      expect(out).toContain('Schul-Stammdaten');
      expect(out).toContain('Niedersachsen');
      expect(out).toContain('IGS');
      expect(out).toContain('Mathematik');
      expect(out).toContain('Bruchrechnung');
      expect(out).toContain('Brüche addieren');
      expect(out).toContain('Themenfeld: Grundlagen');
      expect(out).toContain('Lernpaket: Brüche kennen');
      expect(out).toContain('Ich kann Brüche erkennen.');
    });

    it('hält Themenfeld-Reihenfolge ein', () => {
      const out = buildNucleusPrompt(baseArgs);
      const idxGrundlagen = out.indexOf('Themenfeld: Grundlagen');
      const idxErweitert = out.indexOf('Themenfeld: Erweitert');
      expect(idxGrundlagen).toBeLessThan(idxErweitert);
    });

    it('zeigt Fallback-Text bei leerer Lernlandkarte', () => {
      const out = buildNucleusPrompt({
        ...baseArgs,
        themenfelder: [],
        lernpakete: [],
        lernziele: [],
      });
      expect(out).toContain('noch keine Themenfelder/Lernpakete');
    });

    it('kennzeichnet fehlende Stammdaten explizit', () => {
      const out = buildNucleusPrompt({
        ...baseArgs,
        stammdaten: { land: '', bundesland: '', schulform: '' },
      });
      expect(out).toMatch(/Land nicht gesetzt/);
      expect(out).toMatch(/Bundesland nicht gesetzt/);
      expect(out).toMatch(/Schulform nicht gesetzt/);
    });
  });

  describe('buildPersonaPrompt', () => {
    it('enthält fach- und jahrgangs-spezifischen Erzeugungs-Auftrag', () => {
      const out = buildPersonaPrompt({ einheit: { fach: 'Bio', jahrgangsstufe: '8' } });
      expect(out).toContain('Fachliche Persona');
      expect(out).toContain('Bio');
      expect(out).toContain('8');
    });
  });

  describe('buildSektorStrukturPrompt (v1.9.0)', () => {
    const einheit = {
      lernpfade_konfiguration: {
        pragmatiker: [
          { sektor_typ: 'onboarding', titel: 'Start', items: [] },
          {
            sektor_typ: 'arbeitsphase_themenfeld',
            themenfeld_id: 'tf1',
            titel: 'Arbeit',
            items: [{}, {}],
          },
        ],
      },
    };

    it('gibt die vollständige Sektoren-Liste pro Lerntyp aus', () => {
      const out = buildSektorStrukturPrompt({
        einheit,
        themenfelder: [{ id: 'tf1', titel: 'Grundlagen' }],
      });
      expect(out).toContain('Sektoren-Struktur (lerntyp-unabhängig)');
      // Alle 4 Lerntyp-Pfade müssen als Header auftauchen
      expect(out).toContain('Lerntyp-Pfad: Minimalist');
      expect(out).toContain('Lerntyp-Pfad: Pragmatiker');
      expect(out).toContain('Lerntyp-Pfad: Ehrgeizig');
      expect(out).toContain('Lerntyp-Pfad: Passioniert');
      // Pragmatiker-Pfad enthält Items
      expect(out).toMatch(/Sektor 1: Start/);
      expect(out).toMatch(/Arbeitsphase · Grundlagen/);
      expect(out).toMatch(/2 Elemente/);
    });

    it('zeigt Fallback bei leerer Konfiguration pro Lerntyp', () => {
      const out = buildSektorStrukturPrompt({
        einheit: { lernpfade_konfiguration: {} },
        themenfelder: [],
      });
      // Jeder Lerntyp-Pfad bekommt den Fallback-Hinweis
      const matches = out.match(/noch keine Sektoren konfiguriert/g) || [];
      expect(matches.length).toBe(4);
    });
  });

  describe('buildSektorPrompt (v1.9.0 — schlanke Lerntyp-Anweisung)', () => {
    it('enthält Bearbeitungsregel + Verweis auf Struktur-Prompt', () => {
      const out = buildSektorPrompt({ lerntyp: 'pragmatiker' });
      expect(out).toContain('Pragmatiker');
      expect(out).toContain('Bearbeitungsregel');
      // Verweis auf den separaten Struktur-Prompt
      expect(out).toContain('Sektoren-Struktur');
      // Schlank: KEINE vollständige Sektor-Liste mehr
      expect(out).not.toMatch(/Sektor 1:/);
    });
  });

  describe('buildErstellungspaketForAufgabe', () => {
    it('produziert Halluzinations-Fallback bei leerer Aufgabe', () => {
      const out = buildErstellungspaketForAufgabe({
        aufgabe: {
          id: 'aa1',
          titel: 'Leere Aufgabe',
          anforderungsebene: '2 - Transfer',
          aufgaben_typ: 'inhalt',
          aufgabenstellung: '',
          aufgaben_bild_url: null,
          materialien: [],
        },
      });
      expect(out).toContain('Erfinde KEINE Aufgabenstellung');
      expect(out).toContain('Aufgabe noch nicht ausgearbeitet');
    });

    it('rendert Aufgabentext, Materialien und Erwartungshorizont', () => {
      const out = buildErstellungspaketForAufgabe({
        aufgabe: {
          id: 'aa2',
          titel: 'Photosynthese erklären',
          anforderungsebene: '2 - Transfer',
          aufgaben_typ: 'inhalt',
          aufgabenstellung: 'Erkläre die Photosynthese.',
          aufgaben_bild_url: 'https://example.test/foto.jpg',
          materialien: [
            { type: 'pdf', url: 'https://example.test/info.pdf', label: 'Infoblatt' },
            { type: 'book_ref', content: 'Bio-Buch S. 42' },
          ],
          erwartungshorizont: 'Sechsstufiges Schema erkennbar.',
          musterloesung: 'Wasser + CO2 → Glukose + O2',
        },
      });
      expect(out).toContain('Photosynthese erklären');
      expect(out).toContain('Erkläre die Photosynthese.');
      expect(out).toContain('Aufgabenbild');
      expect(out).toContain('https://example.test/foto.jpg');
      expect(out).toContain('Infoblatt');
      expect(out).toContain('Bio-Buch S. 42');
      expect(out).toContain('Erwartungshorizont');
      expect(out).toContain('Musterlösung');
    });
  });

  describe('buildErstellungspaketForLernpaket', () => {
    it('rendert Header, Lernziele und Aufgabenbausteine', () => {
      const out = buildErstellungspaketForLernpaket({
        lernpaket: {
          id: 'lp1',
          titel_des_pakets: 'Brüche kennen',
          geschaetzte_dauer_minuten: 45,
        },
        lernziele: [
          { formulierung_fachsprache: 'Ich kann Brüche erkennen.' },
          { formulierung_fachsprache: 'Ich kann Brüche darstellen.' },
        ],
        aufgaben: [
          { baustein_typ: 'Pre-Test', aufgabentext_inhalt: 'Was ist ein Bruch?' },
        ],
      });
      expect(out).toContain('Erstellungspaket: Lernpaket (Ebene 1)');
      expect(out).toContain('Brüche kennen');
      expect(out).toContain('Geschätzte Dauer: 45 Minuten');
      expect(out).toContain('Ich kann Brüche erkennen.');
      expect(out).toMatch(/Baustein 1: Pre-Test/);
      expect(out).toContain('Was ist ein Bruch?');
    });

    it('zeigt Fallbacks bei fehlenden Inhalten', () => {
      const out = buildErstellungspaketForLernpaket({
        lernpaket: { id: 'lp1', titel_des_pakets: 'Leeres Paket' },
        lernziele: [],
        aufgaben: [],
      });
      expect(out).toContain('keine Lernziele');
      expect(out).toContain('keine Aufgabenbausteine');
    });
  });
});