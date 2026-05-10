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
  buildUiConfigPayload,
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentItemForLernpaket,
  buildTaskContentItemForAllgemeineAufgabe,
  buildTaskContentBundle,
  buildMicroPayloadForActivity,
  buildMicroPayloadForAllgemeineAufgabe,
  buildMicroPayloadBundle,
  extractNavigationContextByRefId,
} from '../mbkAirGapPayloads';

const FIXED_NOW = '2026-05-08T14:30:00.000Z';
const FIXED_HASH = 'a7f3c8e1b9d24f56';

describe('MBK Air-Gap Payloads', () => {
  describe('Versionierung', () => {
    it('exportiert eine konkrete airgap-Version', () => {
      expect(typeof MBK_AIRGAP_VERSION).toBe('string');
      expect(MBK_AIRGAP_VERSION).toMatch(/^airgap-\d+\.\d+\.\d+$/);
    });

    it('ist mindestens airgap-1.5.0 (Trennung UI vs. System-Kontext)', () => {
      // Air-Gap-Version 1.5.0 hat ui_global_config aus dem System-Kontext
      // in einen eigenen Payload 0 (mbk_ui_config) ausgelagert und führt
      // beide Hashes (system_context_hash + ui_config_hash) parallel.
      expect(MBK_AIRGAP_VERSION >= 'airgap-1.5.0').toBe(true);
    });
  });

  // ── Payload 0: UI-Config (airgap-1.5.0) ───────────────────────────────
  describe('buildUiConfigPayload', () => {
    const FIXED_UI_HASH = 'b3c4d5e6f7a8b9c0';
    const argsWithUi = {
      globalPrompts: [
        { schluessel: 'ui_css_variables', prompt_text: ':root { --x: 1; }', ist_aktiv: true },
        { schluessel: 'ui_tab_bar_html', prompt_text: '<nav class="mbk-tab-bar"></nav>', ist_aktiv: true },
        { schluessel: 'ui_default_header_html', prompt_text: '<header>{{title}}</header>', ist_aktiv: true },
        // Nicht-UI-Prompt → MUSS ignoriert werden
        { schluessel: 'global_mission_statement', prompt_text: 'Wir bilden …', ist_aktiv: true },
      ],
      uiConfigHash: FIXED_UI_HASH,
      nowIso: FIXED_NOW,
    };

    it('liefert meta-Block mit ui_config_hash und payload_type=mbk_ui_config', () => {
      const out = buildUiConfigPayload(argsWithUi);
      expect(out.meta.payload_type).toBe('mbk_ui_config');
      expect(out.meta.schema_version).toBe(MBK_AIRGAP_VERSION);
      expect(out.meta.ui_config_hash).toBe(FIXED_UI_HASH);
      // KEIN system_context_hash in Payload 0.
      expect(out.meta.system_context_hash).toBeUndefined();
    });

    it('enthält nur die drei UI-Bausteine als ui_global_config', () => {
      const out = buildUiConfigPayload(argsWithUi);
      expect(out.ui_global_config).toEqual({
        css_variables: ':root { --x: 1; }',
        tab_bar_html: '<nav class="mbk-tab-bar"></nav>',
        default_header_html: '<header>{{title}}</header>',
      });
    });

    it('liefert null pro fehlendem UI-Schlüssel', () => {
      const out = buildUiConfigPayload({ globalPrompts: [], uiConfigHash: FIXED_UI_HASH });
      expect(out.ui_global_config.css_variables).toBeNull();
      expect(out.ui_global_config.tab_bar_html).toBeNull();
      expect(out.ui_global_config.default_header_html).toBeNull();
    });

    it('ignoriert inaktive UI-Prompts', () => {
      const out = buildUiConfigPayload({
        globalPrompts: [
          { schluessel: 'ui_css_variables', prompt_text: ':root { --x: 1; }', ist_aktiv: false },
        ],
        uiConfigHash: FIXED_UI_HASH,
      });
      expect(out.ui_global_config.css_variables).toBeNull();
    });

    it('liefert expected_keys-Liste für die MBK', () => {
      const out = buildUiConfigPayload(argsWithUi);
      expect(out.expected_keys).toEqual([
        'ui_css_variables',
        'ui_tab_bar_html',
        'ui_default_header_html',
      ]);
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

    // ── airgap-1.2.0: Bündel-Vertrag ────────────────────────────────────
    it('liefert Bündel-basierten SCORM-Vertrag mit filename_patterns', () => {
      const out = buildSystemContextPayload(baseArgs);
      expect(out.scorm_delivery_contract).toBeDefined();
      expect(out.scorm_delivery_contract.rule).toBe('bundle_per_kind');
      expect(out.scorm_delivery_contract.filename_patterns.lernpaket).toBe('task-<lernpaket_id>.html');
      expect(out.scorm_delivery_contract.filename_patterns.themenfeld_bundle).toBe('tasks-themenfeld-<themenfeld_id>.html');
      expect(out.scorm_delivery_contract.filename_patterns.themenfeld_bundle_orphan).toBe('tasks-themenfeld-orphan.html');
      expect(out.scorm_delivery_contract.filename_patterns.projekt_bundle).toBe('projekte-einheit-<einheit_id>.html');
      expect(out.scorm_delivery_contract.filename_patterns.system_baustein).toBe('system-<baustein_id>.html');
      expect(out.scorm_delivery_contract.filename_patterns.fragment).toBe('fragment-<activity_id>.html');
      expect(out.scorm_delivery_contract.manifest_filename).toBe('imsmanifest.xml');
    });

    // ── airgap-1.5.0: ui_global_config wurde aus Payload 1 entfernt ─────
    it('enthält KEIN ui_global_config mehr (ab airgap-1.5.0)', () => {
      const out = buildSystemContextPayload({
        ...baseArgs,
        globalPrompts: [
          ...baseArgs.globalPrompts,
          { schluessel: 'ui_css_variables', prompt_text: ':root { --x: 1; }', ist_aktiv: true },
        ],
      });
      expect(out.ui_global_config).toBeUndefined();
    });

    it('filtert UI-Schlüssel aus den global_prompts heraus', () => {
      const out = buildSystemContextPayload({
        ...baseArgs,
        globalPrompts: [
          ...baseArgs.globalPrompts,
          { schluessel: 'ui_css_variables', prompt_text: ':root { --x: 1; }', ist_aktiv: true },
          { schluessel: 'ui_tab_bar_html', prompt_text: '<nav></nav>', ist_aktiv: true },
        ],
      });
      const keys = out.global_prompts.map((p) => p.schluessel);
      expect(keys).not.toContain('ui_css_variables');
      expect(keys).not.toContain('ui_tab_bar_html');
      // Nicht-UI-Prompts bleiben weiterhin enthalten.
      expect(keys).toContain('global_mission_statement');
    });

    it('SCORM-Vertrag ist inhalts-unabhängig (Hash-Stabilität)', () => {
      const a = buildSystemContextPayload(baseArgs);
      const b = buildSystemContextPayload(baseArgs);
      expect(JSON.stringify(a.scorm_delivery_contract))
        .toBe(JSON.stringify(b.scorm_delivery_contract));
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

    // ── airgap-1.2.0: scorm_file_mapping (Bündel-Modell) ────────────────
    describe('scorm_file_mapping', () => {
      const phasenMix = [
        { id: 'pa-manual', lernpaket_id: 'lp1', aktivitaet_id: 'kat1', erstellungs_modus: 'manuell', phase: 'Übung', reihenfolge: 1 },
        { id: 'pa-ki',     lernpaket_id: 'lp1', aktivitaet_id: 'kat1', erstellungs_modus: 'ki',      phase: 'Übung', reihenfolge: 2 },
      ];

      it('enthält pro Lernpaket einen Eintrag mit task-<lernpaket_id>.html', () => {
        const out = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
        });
        const lpEntries = out.scorm_file_mapping.filter((m) => m.kind === 'lernpaket');
        expect(lpEntries).toHaveLength(2); // lp1 + lp2 (orphan)
        const lp1 = lpEntries.find((e) => e.source_id === 'lp1');
        expect(lp1.filename).toBe('task-lp1.html');
        expect(lp1.titel).toBe('P1');
        expect(lp1.contains_placeholders).toBe(false);
        expect(lp1.placeholder_activity_ids).toEqual([]);
      });

      it('bündelt Ebene-2-Aufgaben pro Themenfeld in eine Datei', () => {
        const out = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
        });
        const tfEntries = out.scorm_file_mapping.filter((m) => m.kind === 'themenfeld_bundle');
        expect(tfEntries).toHaveLength(1);
        expect(tfEntries[0]).toEqual(
          expect.objectContaining({
            source_id: 'tf1',
            filename: 'tasks-themenfeld-tf1.html',
          })
        );
        expect(tfEntries[0].contained_aufgabe_ids).toContain('aa1');
      });

      it('legt Orphan-Bundle nur an, wenn auch Orphan-Aufgaben existieren', () => {
        const ohneOrphans = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
        });
        expect(
          ohneOrphans.scorm_file_mapping.find((m) => m.source_id === 'orphan')
        ).toBeUndefined();

        const mitOrphans = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById,
          allgemeineAufgaben: [
            ...allgemeineAufgaben,
            { id: 'aa-orphan', titel: 'Orphan-Aufg', anforderungsebene: '2 - Transfer', aufgaben_typ: 'inhalt', themenfeld_id: null },
          ],
        });
        const orph = mitOrphans.scorm_file_mapping.find((m) => m.source_id === 'orphan');
        expect(orph).toBeDefined();
        expect(orph.filename).toBe('tasks-themenfeld-orphan.html');
        expect(orph.contained_aufgabe_ids).toEqual(['aa-orphan']);
      });

      it('legt Projekt-Bundle pro Einheit an, wenn Ebene-3-Aufgaben existieren', () => {
        const out = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById,
          allgemeineAufgaben: [
            { id: 'aa-pr', titel: 'Klima', anforderungsebene: '3 - Projekt', aufgaben_typ: 'projekt_anker' },
          ],
        });
        const projektEntries = out.scorm_file_mapping.filter((m) => m.kind === 'projekt_bundle');
        expect(projektEntries).toHaveLength(1);
        expect(projektEntries[0].filename).toBe('projekte-einheit-e1.html');
        expect(projektEntries[0].contained_aufgabe_ids).toEqual(['aa-pr']);
      });

      it('erzeugt KEIN ki_aktivitaet-Mapping mehr (Fragmente sind kein SCORM-File)', () => {
        const out = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele,
          phaseAktivitaeten: phasenMix, katalogById, allgemeineAufgaben,
        });
        expect(
          out.scorm_file_mapping.find((m) => m.kind === 'ki_aktivitaet')
        ).toBeUndefined();
      });

      it('markiert contains_placeholders nur, wenn KI-Aktivitäten existieren', () => {
        const out = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele,
          phaseAktivitaeten: phasenMix, katalogById, allgemeineAufgaben,
        });
        const lp1 = out.scorm_file_mapping.find((m) => m.source_id === 'lp1');
        expect(lp1.contains_placeholders).toBe(true);
        expect(lp1.placeholder_activity_ids).toEqual(['pa-ki']);
        // Manuelle Aktivität taucht NICHT in der Liste auf.
        expect(lp1.placeholder_activity_ids).not.toContain('pa-manual');
      });

      it('dedupliziert System-Bausteine über alle Lernpfade', () => {
        const einheitMitBausteinen = {
          ...einheit,
          lernpfade_konfiguration: {
            minimalist: [{ items: [{ type: 'system', ref_id: 'sys_diagnose' }] }],
            pragmatiker: [{ items: [{ type: 'system', ref_id: 'sys_diagnose' }, { type: 'system', ref_id: 'sys_exit' }] }],
            ehrgeizig: [],
            passioniert: [{ items: [{ type: 'system', ref_id: 'sys_exit' }] }],
          },
        };
        const out = buildStructurePayload({
          einheit: einheitMitBausteinen, themenfelder, lernpakete, lernziele,
          phaseAktivitaeten, katalogById, allgemeineAufgaben,
          systemBausteine: [
            { baustein_id: 'sys_diagnose', titel: 'Diagnose', export_instruktion: 'Diagnose-Anweisung' },
            { baustein_id: 'sys_exit', titel: 'Exit-Ticket', export_instruktion: 'Exit-Anweisung' },
          ],
        });
        const sysEntries = out.scorm_file_mapping.filter((m) => m.kind === 'system_baustein');
        expect(sysEntries).toHaveLength(2);
        expect(sysEntries.map((e) => e.source_id).sort()).toEqual(['sys_diagnose', 'sys_exit']);
        expect(sysEntries.find((e) => e.source_id === 'sys_diagnose').filename).toBe('system-sys_diagnose.html');
        // system_bausteine-Top-Level-Block enthält export_instruktion.
        const diag = out.system_bausteine.find((b) => b.baustein_id === 'sys_diagnose');
        expect(diag.export_instruktion).toBe('Diagnose-Anweisung');
      });

      // ── airgap-1.4.0: Standalone-App-Vertrag ──────────────────────
      describe('Standalone-App-Vertrag (airgap-1.4.0)', () => {
        const args = {
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
          katalogById, allgemeineAufgaben,
        };

        it('legt für jeden Lerntyp ein Dashboard mit is_hidden_in_moodle=false an', () => {
          const out = buildStructurePayload(args);
          const dashboards = out.scorm_file_mapping.filter((m) => m.kind === 'dashboard');
          expect(dashboards).toHaveLength(4);
          for (const d of dashboards) {
            expect(d.is_hidden_in_moodle).toBe(false);
            expect(d.filename).toMatch(/^dashboard-(minimalist|pragmatiker|ehrgeizig|passioniert)\.html$/);
          }
        });

        it('navigation_context jedes Dashboards listet alle vier Geschwister-Dashboards', () => {
          const out = buildStructurePayload(args);
          const dashboards = out.scorm_file_mapping.filter((m) => m.kind === 'dashboard');
          const expected = [
            'dashboard-ehrgeizig.html',
            'dashboard-minimalist.html',
            'dashboard-passioniert.html',
            'dashboard-pragmatiker.html',
          ];
          for (const d of dashboards) {
            expect([...d.navigation_context].sort()).toEqual(expected);
          }
        });

        it('alle Nicht-Dashboard-Items haben is_hidden_in_moodle=true', () => {
          const out = buildStructurePayload(args);
          const others = out.scorm_file_mapping.filter((m) => m.kind !== 'dashboard');
          expect(others.length).toBeGreaterThan(0);
          for (const m of others) {
            expect(m.is_hidden_in_moodle).toBe(true);
          }
        });

        it('navigation_context einer Aufgabe enthält das Dashboard, in dem sie referenziert wird', () => {
          // einheit.lernpfade_konfiguration.pragmatiker referenziert aa1 und aa2.
          const out = buildStructurePayload(args);
          // aa1 ist ein Bündel im Themenfeld tf1 → Themenfeld-Bündel-Eintrag
          // erbt das Dashboard via contained_aufgabe_ids.
          const tfBundle = out.scorm_file_mapping.find(
            (m) => m.kind === 'themenfeld_bundle' && m.source_id === 'tf1'
          );
          expect(tfBundle.navigation_context).toContain('dashboard-pragmatiker.html');
        });

        it('navigation_context ist deterministisch sortiert', () => {
          // Mehrfach bauen → Reihenfolge identisch.
          const a = buildStructurePayload(args);
          const b = buildStructurePayload(args);
          for (const ea of a.scorm_file_mapping) {
            const eb = b.scorm_file_mapping.find((x) => x.source_id === ea.source_id && x.kind === ea.kind);
            expect(ea.navigation_context).toEqual(eb.navigation_context);
          }
        });
      });

      it('Filename folgt dem Pattern aus Payload 1 (pro Bündel-Typ)', () => {
        const sys = buildSystemContextPayload({
          stammdaten: {}, schulNomenklatur: [], globalPrompts: [],
          systemContextHash: FIXED_HASH, nowIso: FIXED_NOW,
        });
        const struct = buildStructurePayload({
          einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben,
        });
        const patterns = sys.scorm_delivery_contract.filename_patterns;
        for (const entry of struct.scorm_file_mapping) {
          if (entry.kind === 'lernpaket') {
            expect(entry.filename).toBe(patterns.lernpaket.replace('<lernpaket_id>', entry.source_id));
          } else if (entry.kind === 'themenfeld_bundle' && entry.source_id !== 'orphan') {
            expect(entry.filename).toBe(patterns.themenfeld_bundle.replace('<themenfeld_id>', entry.source_id));
          } else if (entry.kind === 'themenfeld_bundle' && entry.source_id === 'orphan') {
            expect(entry.filename).toBe(patterns.themenfeld_bundle_orphan);
          } else if (entry.kind === 'projekt_bundle') {
            expect(entry.filename).toBe(patterns.projekt_bundle.replace('<einheit_id>', entry.source_id));
          } else if (entry.kind === 'system_baustein') {
            expect(entry.filename).toBe(patterns.system_baustein.replace('<baustein_id>', entry.source_id));
          }
        }
      });
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

    it('listet placeholder_activity_ids nur für KI-Aktivitäten', () => {
      const item = buildTaskContentItemForLernpaket({
        lernpaket,
        phaseAktivitaeten: [
          { id: 'pa-manual', lernpaket_id: 'lp1', aktivitaet_id: 'kat1', phase: 'Übung', reihenfolge: 1, erstellungs_modus: 'manuell' },
          { id: 'pa-ki', lernpaket_id: 'lp1', aktivitaet_id: 'kat2', phase: 'Übung', reihenfolge: 2, erstellungs_modus: 'ki' },
        ],
        katalogById,
      });
      expect(item.placeholder_activity_ids).toEqual(['pa-ki']);
      expect(item.placeholder_activity_ids).not.toContain('pa-manual');
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

    it('liefert output_contract mit Fragment-Filename und Marker-Template', () => {
      const out = buildMicroPayloadForActivity({
        einheit,
        aktivitaet: {
          id: 'pa-ki',
          aktivitaet_id: 'kat1',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'standard', standard: { schwerpunkt: 'X' } },
        },
        lernpaket, themenfeld, lernziele, katalogById,
        systemContextHash: FIXED_HASH,
      });
      expect(out.output_contract.format).toBe('fragment');
      expect(out.output_contract.filename).toBe('fragment-pa-ki.html');
      expect(out.output_contract.placeholder_target).toBe('task-lp1.html');
      expect(out.output_contract.marker_format).toContain('mbk:fragment');
      expect(out.output_contract.marker_format).toContain('{{id}}');
      expect(out.output_contract.marker_format).toContain('{{hash}}');
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

    it('output_contract zeigt für Ebene-3-Aufgabe auf das Projekt-Bundle', () => {
      const out = buildMicroPayloadForAllgemeineAufgabe({
        einheit: { id: 'e1' },
        aufgabe: {
          id: 'aa-pr',
          anforderungsebene: '3 - Projekt',
          aufgaben_typ: 'projekt_anker',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'offen' },
        },
        themenfeld: { id: 'tf1', titel: 'TF' },
      });
      expect(out.output_contract.placeholder_target).toBe('projekte-einheit-e1.html');
      expect(out.output_contract.filename).toBe('fragment-aa-pr.html');
    });

    it('output_contract zeigt für Ebene-2-Aufgabe auf das Themenfeld-Bundle', () => {
      const out = buildMicroPayloadForAllgemeineAufgabe({
        einheit: { id: 'e1' },
        aufgabe: {
          id: 'aa-tf',
          anforderungsebene: '2 - Transfer',
          aufgaben_typ: 'inhalt',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'offen' },
        },
        themenfeld: { id: 'tf1', titel: 'TF' },
      });
      expect(out.output_contract.placeholder_target).toBe('tasks-themenfeld-tf1.html');
    });

    it('output_contract zeigt für Orphan-Aufgabe auf die Orphan-Datei', () => {
      const out = buildMicroPayloadForAllgemeineAufgabe({
        einheit: { id: 'e1' },
        aufgabe: {
          id: 'aa-orph',
          anforderungsebene: '2 - Transfer',
          aufgaben_typ: 'inhalt',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'offen' },
        },
        themenfeld: null,
      });
      expect(out.output_contract.placeholder_target).toBe('tasks-themenfeld-orphan.html');
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

  // ── airgap-1.4.0: extractNavigationContextByRefId + injection_points ────
  describe('extractNavigationContextByRefId', () => {
    it('liefert leere Map, wenn das Mapping leer ist', () => {
      expect(extractNavigationContextByRefId([]).size).toBe(0);
    });

    it('überspringt Dashboard-Einträge', () => {
      const m = extractNavigationContextByRefId([
        { kind: 'dashboard', source_id: 'minimalist', navigation_context: ['dashboard-minimalist.html'] },
      ]);
      expect(m.has('minimalist')).toBe(false);
    });

    it('mappt source_id eines Lernpakets/Bausteins direkt', () => {
      const m = extractNavigationContextByRefId([
        { kind: 'lernpaket', source_id: 'lp1', navigation_context: ['dashboard-pragmatiker.html'] },
        { kind: 'system_baustein', source_id: 'sys_diagnose', navigation_context: ['dashboard-minimalist.html'] },
      ]);
      expect(m.get('lp1')).toEqual(['dashboard-pragmatiker.html']);
      expect(m.get('sys_diagnose')).toEqual(['dashboard-minimalist.html']);
    });

    it('löst contained_aufgabe_ids von Themenfeld-/Projekt-Bündeln auf', () => {
      const m = extractNavigationContextByRefId([
        {
          kind: 'themenfeld_bundle',
          source_id: 'tf1',
          contained_aufgabe_ids: ['aa1', 'aa2'],
          navigation_context: ['dashboard-pragmatiker.html'],
        },
        {
          kind: 'projekt_bundle',
          source_id: 'e1',
          contained_aufgabe_ids: ['aa-pr'],
          navigation_context: ['dashboard-passioniert.html'],
        },
      ]);
      expect(m.get('aa1')).toEqual(['dashboard-pragmatiker.html']);
      expect(m.get('aa2')).toEqual(['dashboard-pragmatiker.html']);
      expect(m.get('aa-pr')).toEqual(['dashboard-passioniert.html']);
    });
  });

  describe('injection_points (airgap-1.4.0)', () => {
    it('Lernpaket-Item: title + sortierte back_targets', () => {
      const item = buildTaskContentItemForLernpaket({
        lernpaket: { id: 'lp1', titel_des_pakets: 'P1' },
        navigationContext: ['dashboard-pragmatiker.html', 'dashboard-ehrgeizig.html'],
      });
      expect(item.injection_points).toBeDefined();
      expect(item.injection_points.title).toBe('P1');
      expect(item.injection_points.back_targets).toEqual([
        'dashboard-ehrgeizig.html',
        'dashboard-pragmatiker.html',
      ]);
    });

    it('Lernpaket-Item: leere back_targets, wenn navigationContext fehlt', () => {
      const item = buildTaskContentItemForLernpaket({
        lernpaket: { id: 'lp1', titel_des_pakets: 'P1' },
      });
      expect(item.injection_points.back_targets).toEqual([]);
    });

    it('AllgemeineAufgabe-Item: title + back_targets', () => {
      const item = buildTaskContentItemForAllgemeineAufgabe({
        aufgabe: { id: 'aa1', titel: 'Bündel-Aufg' },
        navigationContext: ['dashboard-minimalist.html'],
      });
      expect(item.injection_points.title).toBe('Bündel-Aufg');
      expect(item.injection_points.back_targets).toEqual(['dashboard-minimalist.html']);
    });

    it('Micro-Payload für KI-Aktivität: erbt nav-Context der Hülle', () => {
      const out = buildMicroPayloadForActivity({
        einheit: { id: 'e1' },
        aktivitaet: {
          id: 'pa-ki',
          aktivitaet_id: 'kat1',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'standard', standard: { schwerpunkt: 'X' } },
        },
        lernpaket: { id: 'lp1', titel_des_pakets: 'Hülle-Paket' },
        navigationContext: ['dashboard-pragmatiker.html'],
      });
      expect(out.injection_points.title).toBe('Hülle-Paket');
      expect(out.injection_points.back_targets).toEqual(['dashboard-pragmatiker.html']);
    });

    it('Micro-Payload für KI-AllgemeineAufgabe: nutzt eigene back_targets', () => {
      const out = buildMicroPayloadForAllgemeineAufgabe({
        einheit: { id: 'e1' },
        aufgabe: {
          id: 'aa-ki',
          titel: 'Sandbox',
          erstellungs_modus: 'ki',
          ki_briefing: { variant: 'offen' },
        },
        themenfeld: { id: 'tf1', titel: 'TF' },
        navigationContext: ['dashboard-passioniert.html'],
      });
      expect(out.injection_points.title).toBe('Sandbox');
      expect(out.injection_points.back_targets).toEqual(['dashboard-passioniert.html']);
    });

    it('Bundles propagieren back_targets über navigationContextByRefId', () => {
      const navMap = new Map([
        ['lp1', ['dashboard-pragmatiker.html']],
        ['aa-pr', ['dashboard-passioniert.html']],
      ]);
      const taskBundle = buildTaskContentBundle({
        einheit: { id: 'e1' },
        lernpakete: [{ id: 'lp1', titel_des_pakets: 'P1', reihenfolge_nummer: 1 }],
        allgemeineAufgabenEbene23: [
          { id: 'aa-pr', titel: 'Projekt', anforderungsebene: '3 - Projekt', erstellungs_modus: 'manuell' },
        ],
        navigationContextByRefId: navMap,
      });
      const lpItem = taskBundle.items.find((i) => i.reference_id === 'lp1');
      const aaItem = taskBundle.items.find((i) => i.reference_id === 'aa-pr');
      expect(lpItem.injection_points.back_targets).toEqual(['dashboard-pragmatiker.html']);
      expect(aaItem.injection_points.back_targets).toEqual(['dashboard-passioniert.html']);
    });

    // ── airgap-1.5.0: ui_config_hash propagiert in Struktur/Task/Micro ─
    it('Strukturpayload trägt beide Hashes parallel im meta-Block', () => {
      const out = buildStructurePayload({
        einheit: { id: 'e1' },
        systemContextHash: 'sys123',
        uiConfigHash: 'ui456',
      });
      expect(out.meta.system_context_hash).toBe('sys123');
      expect(out.meta.ui_config_hash).toBe('ui456');
    });

    it('Task-Bundle trägt beide Hashes parallel', () => {
      const out = buildTaskContentBundle({
        einheit: { id: 'e1' }, lernpakete: [], allgemeineAufgabenEbene23: [],
        systemContextHash: 'sys123', uiConfigHash: 'ui456',
      });
      expect(out.meta.system_context_hash).toBe('sys123');
      expect(out.meta.ui_config_hash).toBe('ui456');
    });

    it('Micro-Payload (Activity) trägt beide Hashes parallel', () => {
      const out = buildMicroPayloadForActivity({
        einheit: { id: 'e1' },
        aktivitaet: {
          id: 'pa-ki', aktivitaet_id: 'kat1', erstellungs_modus: 'ki',
          ki_briefing: { variant: 'standard', standard: { schwerpunkt: 'X' } },
        },
        lernpaket: { id: 'lp1' },
        systemContextHash: 'sys123', uiConfigHash: 'ui456',
      });
      expect(out.meta.system_context_hash).toBe('sys123');
      expect(out.meta.ui_config_hash).toBe('ui456');
    });

    it('Micro-Bundle propagiert back_targets über navigationContextByRefId', () => {
      const navMap = new Map([
        ['lp1', ['dashboard-pragmatiker.html']],
        ['aa-ki', ['dashboard-minimalist.html']],
      ]);
      const microBundle = buildMicroPayloadBundle({
        einheit: { id: 'e1' },
        lernpakete: [{ id: 'lp1', titel_des_pakets: 'P1' }],
        phaseAktivitaeten: [
          {
            id: 'pa-ki', lernpaket_id: 'lp1', erstellungs_modus: 'ki',
            ki_briefing: { variant: 'standard', standard: { schwerpunkt: 'X' } },
          },
        ],
        allgemeineAufgaben: [
          { id: 'aa-ki', erstellungs_modus: 'ki', ki_briefing: { variant: 'offen' } },
        ],
        navigationContextByRefId: navMap,
      });
      const paItem = microBundle.items.find((i) => i.target.reference_id === 'pa-ki');
      const aaItem = microBundle.items.find((i) => i.target.reference_id === 'aa-ki');
      expect(paItem.injection_points.back_targets).toEqual(['dashboard-pragmatiker.html']);
      expect(aaItem.injection_points.back_targets).toEqual(['dashboard-minimalist.html']);
    });
  });
});