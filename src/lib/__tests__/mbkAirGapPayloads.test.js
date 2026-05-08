/**
 * mbkAirGapPayloads.test.js
 *
 * Strukturtests für die vier Air-Gap-Payload-Builder. Wir prüfen:
 *   - Versionierung & meta-Block-Konsistenz
 *   - Pflichtfelder pro Payload
 *   - Verhalten im KI-Modus (Inhalte werden ausgeblendet → wandern in P4)
 *   - Verhalten im manuellen Modus (Inhalte sichtbar in P3)
 *   - Bundle-Items zählen + sortieren korrekt
 *
 * Prinzip: keine pixelgenauen Snapshots, sondern charakteristische Marker —
 * analog zu exportPromptTemplates.test.js.
 */
import { describe, it, expect } from 'vitest';
import {
  MBK_AIRGAP_VERSION,
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentItemForLernpaket,
  buildTaskContentItemForAllgemeineAufgabe,
  buildTaskContentBundle,
  buildMicroPayloadForActivity,
  buildMicroPayloadForAllgemeineAufgabe,
  buildMicroPayloadBundle,
} from '../mbkAirGapPayloads';

const FIXED_NOW = '2026-05-08T14:30:00.000Z';
const FIXED_HASH = 'a7f3c8e1b9d24f56';

describe('MBK Air-Gap Payloads', () => {
  describe('Versionierung', () => {
    it('exportiert eine konkrete airgap-Version', () => {
      expect(typeof MBK_AIRGAP_VERSION).toBe('string');
      expect(MBK_AIRGAP_VERSION).toMatch(/^airgap-\d+\.\d+\.\d+$/);
    });
  });

  // ── Payload 1: System-Kontext ──────────────────────────────────────────────
  describe('buildSystemContextPayload', () => {
    const baseArgs = {
      stammdaten: { land: 'Deutschland', bundesland: 'Niedersachsen', schulform: 'IGS' },
      schulNomenklatur: [
        {
          fach: 'Mathematik',
          ist_aktiv: true,
          conventions: [
            { key: 'Y-Achsenabschnitt', value: 'Variable n (nicht b)' },
            { key: 'leer', value: '' }, // wird gefiltert
          ],
          global_style: 'Ergebnisse auf 2 Nachkommastellen runden.',
        },
        {
          fach: 'Inaktiv',
          ist_aktiv: false,
          conventions: [{ key: 'foo', value: 'bar' }],
        },
      ],
      globalPrompts: [
        { schluessel: 'global_mission_statement', kategorie: 'global', anzeigename: 'Mission', prompt_text: 'Wir bilden …', ist_aktiv: true },
        { schluessel: 'persona_generator_anweisung', kategorie: 'global', anzeigename: 'Persona-Gen', prompt_text: 'Erzeuge Persona …', ist_aktiv: true },
        { schluessel: 'inaktiv_test', prompt_text: 'sollte fehlen', ist_aktiv: false },
      ],
      systemContextHash: FIXED_HASH,
      nowIso: FIXED_NOW,
    };

    it('liefert konsistenten meta-Block mit schema_version, payload_type, hash, exported_at', () => {
      const out = buildSystemContextPayload(baseArgs);
      expect(out.meta.schema_version).toBe(MBK_AIRGAP_VERSION);
      expect(out.meta.payload_type).toBe('mbk_system_context');
      expect(out.meta.system_context_hash).toBe(FIXED_HASH);
      expect(out.meta.exported_at).toBe(FIXED_NOW);
    });

    it('normalisiert Stammdaten und behält sie bei', () => {
      const out = buildSystemContextPayload(baseArgs);
      expect(out.stammdaten).toEqual({
        land: 'Deutschland',
        bundesland: 'Niedersachsen',
        schulform: 'IGS',
      });
    });

    it('wandelt fehlende Stammdaten in null', () => {
      const out = buildSystemContextPayload({
        ...baseArgs,
        stammdaten: { land: '', bundesland: null, schulform: '   ' },
      });
      expect(out.stammdaten).toEqual({ land: null, bundesland: null, schulform: null });
    });

    it('fach-indiziert Schul-Nomenklatur, filtert inaktive Fächer', () => {
      const out = buildSystemContextPayload(baseArgs);
      expect(out.schul_nomenklatur).toHaveProperty('Mathematik');
      expect(out.schul_nomenklatur).not.toHaveProperty('Inaktiv');
      // Leere Convention-Einträge wurden gefiltert.
      expect(out.schul_nomenklatur.Mathematik.conventions).toEqual([
        { key: 'Y-Achsenabschnitt', value: 'Variable n (nicht b)' },
      ]);
      expect(out.schul_nomenklatur.Mathematik.global_style).toBe(
        'Ergebnisse auf 2 Nachkommastellen runden.'
      );
    });

    it('listet aktive globale Prompts sortiert nach Schlüssel', () => {
      const out = buildSystemContextPayload(baseArgs);
      const schluessel = out.global_prompts.map((p) => p.schluessel);
      expect(schluessel).toEqual(['global_mission_statement', 'persona_generator_anweisung']);
      // Inaktive sind raus.
      expect(schluessel).not.toContain('inaktiv_test');
    });

    it('liefert direct_lookups für die Kern-Schlüssel', () => {
      const out = buildSystemContextPayload(baseArgs);
      expect(out.direct_lookups.mission_statement).toBe('Wir bilden …');
      expect(out.direct_lookups.persona_generator_anweisung).toBe('Erzeuge Persona …');
      // Nicht gepflegte Schlüssel sind null, nicht undefined.
      expect(out.direct_lookups.lerntypen_definition).toBeNull();
    });
  });

  // ── Payload 2: Struktur ────────────────────────────────────────────────────
  describe('buildStructurePayload', () => {
    const einheit = {
      id: 'e1',
      fach: 'Mathematik',
      jahrgangsstufe: '7',
      titel_der_einheit: 'Bruchrechnung',
      gesamtziele: ['Brüche addieren'],
      lernpfade_konfiguration: {
        pragmatiker: [
          {
            sektor_id: 's1',
            sektor_typ: 'arbeitsphase_themenfeld',
            themenfeld_id: 'tf1',
            titel: 'Arbeit',
            items: [
              { instance_id: 'i1', type: 'aufgabe', ref_id: 'aa1', parent_instance_id: null },
              { instance_id: 'i2', type: 'aufgabe', ref_id: 'aa2', parent_instance_id: 'i1' },
            ],
          },
        ],
      },
    };
    const themenfelder = [{ id: 'tf1', titel: 'Grundlagen', reihenfolge: 1 }];
    const lernpakete = [
      { id: 'lp1', titel_des_pakets: 'P1', themenfeld_id: 'tf1', reihenfolge_nummer: 1, kernbegriffe: ['Bruch'] },
      { id: 'lp2', titel_des_pakets: 'Orphan', themenfeld_id: null, reihenfolge_nummer: 1 },
    ];
    const lernziele = [
      { id: 'lz1', lernpaket_id: 'lp1', formulierung_fachsprache: 'Ich kann Brüche addieren.' },
    ];
    const phaseAktivitaeten = [
      { id: 'pa1', lernpaket_id: 'lp1', aktivitaet_id: 'kat1', phase: 'Übung', reihenfolge: 1, erstellungs_modus: 'manuell', is_complete: true },
    ];
    const katalogById = new Map([['kat1', { id: 'kat1', name: 'Lückentext' }]]);
    const allgemeineAufgaben = [
      { id: 'aa1', titel: 'Bündel', anforderungsebene: '2 - Transfer', aufgaben_typ: 'buendel', verlinkte_lernpaket_ids: ['lp1'] },
    ];

    it('liefert vollständigen meta-Block mit einheit_id', () => {
      const out = buildStructurePayload({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
        systemContextHash: FIXED_HASH, nowIso: FIXED_NOW,
      });
      expect(out.meta.payload_type).toBe('mbk_structure_payload');
      expect(out.meta.einheit_id).toBe('e1');
      expect(out.meta.system_context_hash).toBe(FIXED_HASH);
    });

    it('gruppiert Lernpakete nach Themenfeldern und behandelt Orphans separat', () => {
      const out = buildStructurePayload({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
      });
      expect(out.themenfelder).toHaveLength(1);
      expect(out.themenfelder[0].lernpakete).toHaveLength(1);
      expect(out.themenfelder[0].lernpakete[0].lernpaket_id).toBe('lp1');
      expect(out.lernpakete_ohne_themenfeld).toHaveLength(1);
      expect(out.lernpakete_ohne_themenfeld[0].lernpaket_id).toBe('lp2');
    });

    it('hängt Aktivitäten und Lernziele ans Lernpaket', () => {
      const out = buildStructurePayload({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
      });
      const lp = out.themenfelder[0].lernpakete[0];
      expect(lp.aktivitaeten).toHaveLength(1);
      expect(lp.aktivitaeten[0].aktivitaet_name).toBe('Lückentext');
      expect(lp.lernziele).toHaveLength(1);
      expect(lp.lernziele[0].formulierung_fachsprache).toBe('Ich kann Brüche addieren.');
    });

    it('rendert alle 4 Lernpfade (auch leere)', () => {
      const out = buildStructurePayload({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
      });
      expect(Object.keys(out.lernpfade).sort()).toEqual(['ehrgeizig', 'minimalist', 'passioniert', 'pragmatiker']);
      expect(out.lernpfade.minimalist).toEqual([]);
      expect(out.lernpfade.pragmatiker).toHaveLength(1);
      // Sektor-Items werden hierarchisch rendert (parent → child).
      expect(out.lernpfade.pragmatiker[0].items.map((i) => i.instance_id)).toEqual(['i1', 'i2']);
    });

    it('gibt allgemeine Aufgaben auf Struktur-Niveau aus', () => {
      const out = buildStructurePayload({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
      });
      expect(out.allgemeine_aufgaben).toHaveLength(1);
      expect(out.allgemeine_aufgaben[0].aufgabe_id).toBe('aa1');
      expect(out.allgemeine_aufgaben[0].verlinkte_lernpaket_ids).toEqual(['lp1']);
    });
  });

  // ── Payload 3: Aufgabeninhalte ─────────────────────────────────────────────
  describe('buildTaskContentItemForLernpaket', () => {
    const katalogById = new Map([
      ['kat1', { id: 'kat1', name: 'Lückentext' }],
      ['kat2', { id: 'kat2', name: 'Miniquiz' }],
    ]);
    const lernpaket = { id: 'lp1', titel_des_pakets: 'Brüche', kernbegriffe: ['Bruch', 'Nenner'] };

    it('rendert manuelle Aktivität mit field_values und MasterAufgaben', () => {
      const item = buildTaskContentItemForLernpaket({
        lernpaket,
        phaseAktivitaeten: [
          { id: 'pa1', lernpaket_id: 'lp1', aktivitaet_id: 'kat1', phase: 'Übung', reihenfolge: 1, erstellungs_modus: 'manuell', field_values: { aufgabentext: 'Fülle die Lücke' }, transkript: null },
        ],
        masterAufgaben: [
          { id: 'm1', activity_id: 'pa1', lernpaket_id: 'lp1', titel: 'Variante A', reihenfolge: 1, field_values: { satz: 'Der __ ist eine Zahl.' }, content_status: 'approved' },
        ],
        katalogById,
      });
      expect(item.aktivitaeten).toHaveLength(1);
      const a = item.aktivitaeten[0];
      expect(a.erstellungs_modus).toBe('manuell');
      expect(a.field_values.aufgabentext).toBe('Fülle die Lücke');
      expect(a.master_aufgaben).toHaveLength(1);
      expect(a.master_aufgaben[0].field_values.satz).toContain('Der __');
    });

    it('blendet field_values und MasterAufgaben im KI-Modus aus', () => {
      const item = buildTaskContentItemForLernpaket({
        lernpaket,
        phaseAktivitaeten: [
          { id: 'pa-ki', lernpaket_id: 'lp1', aktivitaet_id: 'kat2', phase: 'Übung', reihenfolge: 1, erstellungs_modus: 'ki', field_values: { sollte: 'unsichtbar sein' } },
        ],
        masterAufgaben: [
          { id: 'm1', activity_id: 'pa-ki', lernpaket_id: 'lp1', field_values: { sollte: 'auch unsichtbar' } },
        ],
        katalogById,
      });
      const a = item.aktivitaeten[0];
      expect(a.erstellungs_modus).toBe('ki');
      expect(a.field_values).toBeNull();
      expect(a.master_aufgaben).toEqual([]);
    });

    it('reicht Transkript und alt_text durch', () => {
      const item = buildTaskContentItemForLernpaket({
        lernpaket,
        phaseAktivitaeten: [
          { id: 'pa-video', lernpaket_id: 'lp1', aktivitaet_id: 'kat1', phase: 'Input', reihenfolge: 1, erstellungs_modus: 'manuell', transkript: 'Heute geht es um Brüche…', alt_text: 'Erklärvideo' },
        ],
        katalogById,
      });
      expect(item.aktivitaeten[0].transkript).toBe('Heute geht es um Brüche…');
      expect(item.aktivitaeten[0].alt_text).toBe('Erklärvideo');
    });
  });

  describe('buildTaskContentItemForAllgemeineAufgabe', () => {
    it('rendert manuelle Aufgabe mit allen Inhalts-Feldern', () => {
      const item = buildTaskContentItemForAllgemeineAufgabe({
        aufgabe: {
          id: 'aa1',
          titel: 'Photosynthese',
          anforderungsebene: '2 - Transfer',
          aufgaben_typ: 'inhalt',
          erstellungs_modus: 'manuell',
          aufgabenstellung: 'Erkläre die Photosynthese.',
          materialien: [{ type: 'pdf', url: 'https://x/y.pdf' }],
          rubric_criteria: [{ title: 'Verständnis', points: 5 }],
        },
      });
      expect(item.aufgabenstellung).toBe('Erkläre die Photosynthese.');
      expect(item.materialien).toHaveLength(1);
      expect(item.rubric_criteria[0].title).toBe('Verständnis');
    });

    it('nullt manuelle Inhalte im KI-Modus', () => {
      const item = buildTaskContentItemForAllgemeineAufgabe({
        aufgabe: {
          id: 'aa-ki',
          titel: 'KI-Sandbox',
          erstellungs_modus: 'ki',
          aufgabenstellung: 'IGNORIEREN',
          materialien: [{ type: 'pdf' }],
        },
      });
      expect(item.erstellungs_modus).toBe('ki');
      expect(item.aufgabenstellung).toBeNull();
      expect(item.materialien).toEqual([]);
    });

    it('rendert brian_dialog nur, wenn ein Brian-Feld gesetzt ist', () => {
      const ohne = buildTaskContentItemForAllgemeineAufgabe({ aufgabe: { id: 'aa-x' } });
      expect(ohne.brian_dialog).toBeNull();

      const mit = buildTaskContentItemForAllgemeineAufgabe({
        aufgabe: { id: 'aa-y', brian_dialog_name: 'Brian-Dialog 1', brian_learner_instruction: 'Erkläre …' },
      });
      expect(mit.brian_dialog).not.toBeNull();
      expect(mit.brian_dialog.dialog_name).toBe('Brian-Dialog 1');
    });
  });

  describe('buildTaskContentBundle', () => {
    it('zählt Items korrekt und schreibt sie in die richtige Reihenfolge', () => {
      const bundle = buildTaskContentBundle({
        einheit: { id: 'e1' },
        lernpakete: [
          { id: 'lp1', titel_des_pakets: 'Erst', reihenfolge_nummer: 1 },
          { id: 'lp2', titel_des_pakets: 'Zweit', reihenfolge_nummer: 2 },
        ],
        allgemeineAufgabenEbene23: [
          { id: 'aa1', titel: 'Aufg', anforderungsebene: '2 - Transfer', erstellungs_modus: 'manuell' },
        ],
        systemContextHash: FIXED_HASH,
        nowIso: FIXED_NOW,
      });
      expect(bundle.meta.payload_type).toBe('mbk_task_content_payload');
      expect(bundle.meta.item_count).toBe(3);
      expect(bundle.items.map((i) => i.reference_id)).toEqual(['lp1', 'lp2', 'aa1']);
    });
  });

  // ── Payload 4: Micro-Briefings ─────────────────────────────────────────────
  describe('buildMicroPayloadForActivity', () => {
    const einheit = { id: 'e1', fach: 'Mathematik', jahrgangsstufe: '7', titel_der_einheit: 'Brüche' };
    const lernpaket = { id: 'lp1', titel_des_pakets: 'P1', kernbegriffe: ['Bruch'] };
    const themenfeld = { id: 'tf1', titel: 'Grundlagen' };
    const katalogById = new Map([['kat1', { id: 'kat1', name: 'Miniquiz' }]]);
    const lernziele = [{ formulierung_fachsprache: 'Ich kann Brüche kürzen.' }];

    it('liefert null im manuellen Modus', () => {
      const out = buildMicroPayloadForActivity({
        einheit,
        aktivitaet: { id: 'pa1', erstellungs_modus: 'manuell' },
        lernpaket, themenfeld, lernziele, katalogById,
      });
      expect(out).toBeNull();
    });

    it('rendert vollständiges Micro-Briefing im KI-Modus', () => {
      const out = buildMicroPayloadForActivity({
        einheit,
        aktivitaet: {
          id: 'pa-ki',
          aktivitaet_id: 'kat1',
          phase: 'Übung',
          reihenfolge: 2,
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'standard', standard: { schwerpunkt: 'Brüche kürzen', parameter: { anzahl_fragen: 5 } } },
          transkript: null,
          field_values: { url: 'https://x/y' },
        },
        lernpaket, themenfeld,
        phaseAktivitaetenInPaket: [
          { id: 'other', phase: 'Übung', reihenfolge: 1 },
          { id: 'pa-ki', phase: 'Übung', reihenfolge: 2 },
        ],
        lernziele, katalogById,
        systemContextHash: FIXED_HASH, nowIso: FIXED_NOW,
      });
      expect(out.meta.payload_type).toBe('mbk_micro_payload');
      expect(out.meta.system_context_hash).toBe(FIXED_HASH);
      expect(out.target.kind).toBe('activity');
      expect(out.target.aktivitaet_name).toBe('Miniquiz');
      expect(out.gps.themenfeld.titel).toBe('Grundlagen');
      expect(out.gps.lernpaket.titel).toBe('P1');
      expect(out.gps.phase.position).toBe(2);
      expect(out.gps.phase.ist_letztes_element_der_phase).toBe(true);
      expect(out.zieloptik.lernziele).toEqual(['Ich kann Brüche kürzen.']);
      expect(out.zieloptik.kernbegriffe).toEqual(['Bruch']);
      expect(out.source_of_truth.field_values.url).toBe('https://x/y');
      expect(out.blueprint.ki_briefing.variant).toBe('standard');
      expect(out.blueprint.ki_briefing.standard.schwerpunkt).toBe('Brüche kürzen');
    });
  });

  describe('buildMicroPayloadForAllgemeineAufgabe', () => {
    it('liefert null im manuellen Modus', () => {
      const out = buildMicroPayloadForAllgemeineAufgabe({
        einheit: { id: 'e1' },
        aufgabe: { id: 'aa1', erstellungs_modus: 'manuell' },
      });
      expect(out).toBeNull();
    });

    it('rendert Micro-Briefing für offene KI-Aufgabe', () => {
      const out = buildMicroPayloadForAllgemeineAufgabe({
        einheit: { id: 'e1', fach: 'Bio', jahrgangsstufe: '8', titel_der_einheit: 'Zelle' },
        aufgabe: {
          id: 'aa-ki',
          titel: 'Sandbox',
          anforderungsebene: '3 - Projekt',
          aufgaben_typ: 'inhalt',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'offen', offen: { lernziel: 'X', funktionsweise: 'Y' } },
        },
        themenfeld: { id: 'tf1', titel: 'Zellbio' },
        systemContextHash: FIXED_HASH, nowIso: FIXED_NOW,
      });
      expect(out.target.kind).toBe('allgemeine_aufgabe');
      expect(out.gps.themenfeld.titel).toBe('Zellbio');
      expect(out.gps.lernpaket).toBeNull();
      expect(out.blueprint.ki_briefing.variant).toBe('offen');
    });
  });

  describe('buildMicroPayloadBundle', () => {
    it('sammelt nur KI-Items aus Aktivitäten und allgemeinen Aufgaben', () => {
      const bundle = buildMicroPayloadBundle({
        einheit: { id: 'e1' },
        themenfelder: [{ id: 'tf1', titel: 'TF' }],
        lernpakete: [{ id: 'lp1', themenfeld_id: 'tf1' }],
        phaseAktivitaeten: [
          { id: 'pa1', lernpaket_id: 'lp1', erstellungs_modus: 'manuell' },
          { id: 'pa2', lernpaket_id: 'lp1', erstellungs_modus: 'ki', ki_briefing: { variant: 'standard', standard: { schwerpunkt: 'X' } } },
        ],
        allgemeineAufgaben: [
          { id: 'aa1', erstellungs_modus: 'manuell' },
          { id: 'aa2', erstellungs_modus: 'ki', ki_briefing: { variant: 'offen', offen: { lernziel: 'L', funktionsweise: 'F' } } },
        ],
        systemContextHash: FIXED_HASH, nowIso: FIXED_NOW,
      });
      expect(bundle.meta.item_count).toBe(2);
      expect(bundle.items.map((i) => i.target.reference_id).sort()).toEqual(['aa2', 'pa2']);
    });

    it('liefert leeres Bundle, wenn keine KI-Items existieren', () => {
      const bundle = buildMicroPayloadBundle({
        einheit: { id: 'e1' },
        phaseAktivitaeten: [{ id: 'pa1', lernpaket_id: 'lp1', erstellungs_modus: 'manuell' }],
        allgemeineAufgaben: [{ id: 'aa1', erstellungs_modus: 'manuell' }],
      });
      expect(bundle.items).toEqual([]);
      expect(bundle.meta.item_count).toBe(0);
    });
  });
});