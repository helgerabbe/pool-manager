/**
 * mbkAirGapPayloads.js
 *
 * Deterministische Builder für die vier Air-Gap-Payloads (siehe
 * docs/mbk-air-gap-uebergabe.md):
 *
 *   1. buildSystemContextPayload    → Payload 1: globaler System-Kontext
 *   2. buildStructurePayload         → Payload 2: Struktur einer Einheit
 *   3. buildTaskContentPayload       → Payload 3: pro Lernpaket / pro Aufgabe
 *   4. buildMicroPayload             → Payload 4: pro KI-Aktivität / pro Aufgabe
 *
 * Reine Funktionen — keine I/O, keine Side-Effects, keine LLM-Aufrufe.
 * Output ist ein **strukturiertes JS-Objekt** (kein vorgerendertes JSON-String).
 * Die UI/Persistenz-Schicht erledigt `JSON.stringify` selbst, damit die
 * Builder testbar bleiben, ohne JSON-Parse-Roundtrips zu erzwingen.
 *
 * Konventionen:
 *   - **null** = Wert ist nicht gesetzt (statt undefined oder leerer String).
 *   - **leeres Array** = strukturell vorhanden, aber keine Items.
 *   - Alle Quell-IDs werden 1:1 durchgereicht, damit die MBK Cross-References
 *     auflösen kann (Sektor → Erstellungspaket → Micro-Briefing).
 *   - Konsistente meta-Blöcke pro Payload für Cache-Invalidierung und
 *     Hash-Mismatch-Erkennung auf MBK-Seite.
 *
 * **Wichtig:** Bei jeder strukturellen Änderung an den Schemas MUSS
 * `MBK_AIRGAP_VERSION` hochgezählt werden. Der Out-of-Sync-Check
 * (lib/exportPromptSync.js) vergleicht diese Version zusätzlich zur
 * source_updated_at, sodass Schema-Updates alle Air-Gap-Payloads
 * automatisch als veraltet markieren.
 */

import { getSektorTypLabel } from '@/lib/sektorTypen';
import { annotateSektorItems, DASHBOARD_GATING_ENGINE } from '@/lib/dashboardGating';

/**
 * Versionskennung der Air-Gap-Payload-Engine.
 * Wird bei jedem Build in `meta.schema_version` geschrieben und beim
 * Persistieren als `template_version` der ExportPrompts-Records.
 *
 * airgap-1.7.0: Dashboard-Gating-Engine (siehe docs/dashboard-gating-engine.md).
 *   - Payload 1: `dashboard_gating_engine`-Vertrag (Status-Feld, Gating-Regeln,
 *     Initial-Status-Ableitung, universeller Weiter-Button).
 *   - Payload 2: jedes Lernpfad-Item erhält `initial_status` (offen|erledigt)
 *     und `abschluss_bedingung`; jeder Sektor erhält zusätzlich `modus`.
 * airgap-1.8.0: Sektor-Freischaltung (Sektor-Level-Gating).
 *   - Payload 1: `dashboard_gating_engine.sektor_freischaltung`-Regel.
 *   - Payload 2: jeder Sektor erhält `freischalt_bedingung`
 *     ({ modus: 'sofort'|'nach_sektor', voraussetzung_sektor_id }).
 * airgap-1.9.0: Master-Anzeige-Modus (Shuffle vs. Alle) für Aktivitäten mit
 *   mehreren MasterAufgaben.
 *   - Payload 1: `master_anzeige_modus_contract` erklärt der MBK die Bedeutung
 *     von 'shuffle' (zufällig eine Variante pro Versuch) vs. 'alle' (alle
 *     Varianten sichtbar/zu bearbeiten).
 *   - Payload 3: jede Aktivität erhält `master_anzeige_modus`
 *     ('shuffle'|'alle'), damit die MBK das Variantentraining korrekt umsetzt.
 * airgap-1.10.0: Onboarding-/Orientierungsphase (einheits-global).
 *   - Payload 1: `onboarding_contract` erklärt der MBK die allen vier
 *     Dashboards vorgeschaltete Orientierungsphase und ihre festen Elemente.
 *   - Payload 2: `einheit.onboarding` liefert die konkreten, von der
 *     Lehrkraft erzeugten Inhalte (Snapshot aus Einheiten.onboarding_konfiguration).
 * airgap-1.11.0: Viertes Onboarding-Element „KI-Lerntyp-Diagnose" (Brian-
 *   Gespräch, immer an letzter Stelle).
 *   - Payload 1: `onboarding_contract.elemente` enthält jetzt vier Elemente.
 *   - Payload 2: `einheit.onboarding.lerntyp_diagnose` (Snapshot).
 * airgap-1.13.0: Schüler-Arbeitsumgebung (Methodische Hülle).
 *   - Payload 1: `schueler_arbeitsumgebung_contract` beschreibt der MBK das
 *     gesamte „Betriebssystem" der Schüler-App: Cockpit, Poolzeit-Ritual,
 *     Lerntagebuch, Merkheft, Einheit-Dashboard mit PfadNavigation und
 *     Zeit-Tracker. Die Hülle wird EINMAL gebaut und ist für alle Einheiten
 *     gültig — nur die Inhalte an den Anker-Punkten wechseln.
 */
export const MBK_AIRGAP_VERSION = 'airgap-1.13.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

/**
 * Erkennt, ob eine LernpaketPhaseAktivitaet didaktisch eine
 * "Offene Aufgabe" ist. Diese Aktivitäten sind per Design IMMER ein
 * KI-Briefing für die MBK (auch wenn `erstellungs_modus !== 'ki'`),
 * weil ihre einzige Datenquelle eine freie Beschreibung in
 * `field_values.description` (bzw. den zugehörigen MasterAufgaben) ist.
 *
 * Wird sowohl von buildMicroPayloadForActivity als auch vom Bulk-Plan
 * verwendet, damit offene Aufgaben in Tab 5 (KI-Aufgaben) zuverlässig
 * als Micro-Briefing auftauchen.
 */
export function isOffeneAufgabeActivity(aktivitaet, katalogById) {
  if (!aktivitaet) return false;
  const katalog = katalogById?.get?.(aktivitaet.aktivitaet_id);
  const name = (katalog?.name || '').toLowerCase();
  return name.includes('offene aufgabe');
}

/**
 * Liefert true, wenn eine LernpaketPhaseAktivitaet ein Micro-Briefing
 * für die MBK erzeugen soll (KI-Modus ODER offene Aufgabe).
 */
export function isMicroBriefingActivity(aktivitaet, katalogById) {
  if (!aktivitaet) return false;
  if (aktivitaet.erstellungs_modus === 'ki') return true;
  return isOffeneAufgabeActivity(aktivitaet, katalogById);
}

/**
 * SCORM-Modularitäts-Vertrag (airgap-1.2.0 / Bündel-Modell).
 *
 * Wird von Payload 1 als FESTE, einheits-/inhalts-UNABHÄNGIGE Anweisung an
 * die MBK übergeben. Inhalt darf den system_context_hash NICHT kippen, wenn
 * sich Aufgaben ändern — deshalb steht hier nur die generische Regel,
 * niemals konkrete IDs.
 *
 * Die einheits-spezifische Mapping-Tabelle (welche ID → welcher Dateiname)
 * lebt in Payload 2 (`scorm_file_mapping`) und ändert sich mit der Einheit.
 */
const SCORM_DELIVERY_CONTRACT = {
  rule: 'bundle_per_kind',
  filename_patterns: {
    lernpaket: 'task-<lernpaket_id>.html',
    themenfeld_bundle: 'tasks-themenfeld-<themenfeld_id>.html',
    themenfeld_bundle_orphan: 'tasks-themenfeld-orphan.html',
    projekt_bundle: 'projekte-einheit-<einheit_id>.html',
    system_baustein: 'system-<baustein_id>.html',
    dashboard: 'dashboard-<lerntyp>.html',
    fragment: 'fragment-<activity_id>.html',
  },
  manifest_filename: 'imsmanifest.xml',
  // Pflicht-Dashboards (airgap-1.3.0): Vier Differenzierungs-Einstiegs-
  // punkte, die in JEDER Einheit existieren MÜSSEN, unabhängig vom
  // Inhalt der Lernpfade. Sie sind die ersten Items im SCORM-Manifest.
  mandatory_dashboards: [
    'dashboard-minimalist.html',
    'dashboard-pragmatiker.html',
    'dashboard-ehrgeizig.html',
    'dashboard-passioniert.html',
  ],
  description:
    'Bündel-Vertrag: Pro Lernpaket genau eine Monolith-HTML. Allgemeine '
    + 'Aufgaben Ebene 2 werden pro Themenfeld in einer HTML gebündelt; '
    + 'Aufgaben ohne Themenfeld landen in der Orphan-Datei. Allgemeine '
    + 'Aufgaben Ebene 3 (Projekte) werden pro Einheit in einer einzigen '
    + 'HTML zusammengefasst. System-Bausteine werden ab airgap-1.6.0 PRO '
    + 'LERNTYP-PFAD individuell generiert (Pattern '
    + '`system-<lerntyp>-<baustein_id>.html`); ein Briefing in Payload 5 '
    + '(`mbk_systembaustein_payload`) liefert pro Pfad-Referenz die '
    + 'persona-spezifischen Inhalte. Zusätzlich MÜSSEN immer '
    + 'die vier Pflicht-Dashboards (dashboard-<lerntyp>.html) als '
    + 'Differenzierungs-Einstiegspunkte erzeugt werden. KI-Aktivitäten '
    + 'werden NICHT als eigenständige Tasks ausgegeben, sondern als '
    + 'HTML-Fragmente (fragment-<activity_id>.html), die ein nachgelagerter '
    + 'Merger in die deterministischen Hüllen einsetzt. Bei jeder Änderung '
    + 'an einem Bündel-Element wird das gesamte Bündel neu generiert (kein '
    + 'Patching). Die zentrale imsmanifest.xml ist der einzige Index und '
    + 'muss bei jeder Strukturänderung neu generiert werden.',
};

/**
 * Master-Anzeige-Modus-Vertrag (airgap-1.9.0).
 *
 * Wird von Payload 1 als FESTE, inhalts-UNABHÄNGIGE Anweisung an die MBK
 * übergeben. Erklärt, wie eine Aktivität mit MEHREREN MasterAufgaben den
 * Schüler:innen präsentiert werden soll. Der konkrete Modus pro Aktivität
 * (`master_anzeige_modus`) steht in Payload 3.
 */
const MASTER_ANZEIGE_MODUS_CONTRACT = {
  field: 'master_anzeige_modus',
  applies_to: 'activity_with_multiple_master_aufgaben',
  modi: {
    shuffle:
      'Pro Versuch wird genau EINE der MasterAufgaben zufällig ausgespielt. '
      + 'Bereits bearbeitete Varianten werden ausgeschlossen, bis alle einmal '
      + 'durchlaufen wurden (Wiederholungs-/Variantentraining). Im SCORM/Brian '
      + 'muss die Auswahl-Logik die Varianten zufällig rotieren; es ist NICHT '
      + 'vorgesehen, dass der Schüler alle Varianten gleichzeitig sieht.',
    alle:
      'Alle MasterAufgaben sind gleichzeitig sichtbar. Der Schüler wählt '
      + 'bewusst aus bzw. bearbeitet alle nacheinander. Keine Zufallsauswahl.',
  },
  default: 'shuffle',
  note:
    'Nur relevant, wenn eine Aktivität ≥2 MasterAufgaben hat. Bei genau einer '
    + 'MasterAufgabe spielt der Modus keine Rolle (es gibt nur eine Variante).',
};

/**
 * Onboarding-/Orientierungs-Vertrag (airgap-1.10.0).
 *
 * FESTE, inhalts-UNABHÄNGIGE Anweisung an die MBK in Payload 1. Erklärt der
 * Programmier-KI, dass jeder Einheit eine GLOBALE Orientierungsphase
 * VORGESCHALTET ist, die NICHT Teil der vier Lerntyp-Dashboards ist, sondern
 * dem Schüler VOR der Dashboard-Wahl gezeigt wird. Die konkreten, von der
 * Lehrkraft erzeugten Inhalte stehen in Payload 2
 * (`einheit.onboarding`), weil sie sich pro Einheit ändern und den
 * system_context_hash nicht kippen dürfen.
 *
 * Die drei festen Elemente spiegeln exakt die Schüleransicht
 * (pages/schueler/EinheitOnboarding* + Einheiten.onboarding_konfiguration).
 */
/**
 * Update-Lifecycle-Vertrag (airgap-1.12.0).
 *
 * FESTE, inhalts-UNABHÄNGIGE Anweisung an die MBK in Payload 1. Erklärt der
 * Programmier-KI, was bei einer ERNEUTEN Veröffentlichung einer bereits
 * publizierten Einheit passiert — je nach gewählter update_strategy.
 *
 * Die konkrete Strategie pro Einheit steht in Payload 2 (`einheit.update_strategy`).
 */
const UPDATE_LIFECYCLE_CONTRACT = {
  was_ist_das:
    'Eine Einheit durchläuft den Lifecycle: draft → final_freigegeben → '
    + 'export_running → published. Wird eine bereits veröffentlichte Einheit '
    + 'ERNEUT final freigegeben, handelt es sich um ein UPDATE — die Einheit '
    + 'existiert bereits in Moodle und Schüler haben dort Fortschritt. In '
    + 'diesem Fall greift eine von der Fachschaftsleitung gewählte '
    + 'update_strategy.',
  strategien: {
    no_reset: {
      label: 'Update ohne Reset',
      bedeutung:
        'Die Einheit wird ADDITIV aktualisiert. Bestehende Inhalte bleiben '
        + 'erhalten, neue/geänderte Inhalte werden ergänzt. Schüler behalten '
        + 'ihren Fortschritt in bereits bearbeiteten Bereichen.',
      mbk_verhalten:
        'Generiere ALLE Dateien wie gewohnt — aber beachte: Bereits beim '
        + 'letzten Export existierende Dateien (gleicher filename) könnten '
        + 'noch in Moodle im Einsatz sein. Der Merger wird nur Dateien '
        + 'ersetzen, deren Inhalt sich tatsächlich geändert hat. Du musst '
        + 'trotzdem ALLE Dateien neu generieren (stateless — du weißt nicht, '
        + 'welche sich geändert haben). Neue Items erhalten neue Einträge im '
        + 'scorm_file_mapping und im Manifest. Gelöschte Items entfallen '
        + 'ersatzlos aus dem Mapping und Manifest.',
    },
    full_reset: {
      label: 'Mit Reset – Schüler starten neu',
      bedeutung:
        'Die gesamte Einheit wird von Grund auf neu gebaut. Alle Schüler '
        + 'müssen die Einheit von vorne beginnen — bestehender Fortschritt '
        + 'wird verworfen.',
      mbk_verhalten:
        'Generiere ALLE Dateien komplett neu, als wäre es die ERSTE '
        + 'Veröffentlichung dieser Einheit. Keine Rücksicht auf bestehende '
        + 'Dateien oder Schüler-Fortschritt. Der Merger wird ALLE Dateien '
        + 'ersetzen. Die imsmanifest.xml kann sich strukturell komplett '
        + 'ändern — alte SCORM-Zustände sind irrelevant.',
    },
  },
  override_hinweis:
    'Die update_strategy wird von der Fachschaftsleitung gewählt. Das '
    + 'Export-Center kann sie im Einzelfall überschreiben '
    + '(update_strategy_override). Die EFFEKTIVE Strategie steht in Payload 2 '
    + 'unter einheit.effektive_update_strategy.',
  hinweis_fuer_mbk:
    'Du generierst in BEIDEN Strategien alle Dateien neu — der Unterschied '
    + 'liegt im erwarteten Verhalten des Mergers: bei no_reset werden '
    + 'unveränderte Dateien nicht überschrieben, bei full_reset alles. Du '
    + 'selbst musst keine "Hat sich geändert?"-Logik implementieren.',
};

/**
 * Snapshot-Prioritäts-Vertrag (airgap-1.12.0).
 *
 * FESTE, inhalts-UNABHÄNGIGE Anweisung an die MBK in Payload 1. Erklärt der
 * Programmier-KI, dass viele Inhalte bereits VOR dem Export von der Lehrkraft
 * erzeugt und als fertige, schülergerechte Snapshots gespeichert wurden.
 * Diese Snapshots haben VORRANG vor KI-generierten Inhalten.
 *
 * Die konkreten Snapshots stehen in Payload 2 (einheit.onboarding.*) und
 * in Payload 6 (Systembaustein-Briefings mit gefülltem Inhalt).
 */
const SNAPSHOT_PRIORITY_CONTRACT = {
  was_ist_das:
    'Die App erzeugt viele schülergerechte Inhalte BEREITS VOR dem Export '
    + 'und speichert sie als fertige Snapshots (SchuelerInhaltSnapshot). '
    + 'Diese Snapshots sind didaktisch geprüfte, schülergerechte Texte/Hinweise/'
    + 'Quizze — sie müssen NICHT von der MBK neu formuliert oder '
    + '"verbessert" werden.',
  prioritaetsregel:
    '1. Snapshot existiert → 1:1 übernehmen (nicht umformulieren, nicht '
    + '"verbessern", nicht kürzen). 2. Kein Snapshot, aber Briefing in '
    + 'Payload 5/6 → Inhalt aus dem Briefing generieren. 3. Weder Snapshot '
    + 'noch Briefing → Shell-Platzhalter setzen (siehe §3 des '
    + 'Meta-System-Prompts).',
  wo_findest_du_snapshots: {
    onboarding:
      'In Payload 2 unter einheit.onboarding.{einfuehrung,fragenblock,'
      + 'einstiegsdiagnose,lerntyp_diagnose}. Jedes Feld ist entweder ein '
      + 'fertiges JSON-Objekt (Snapshot) oder null (noch nicht erzeugt → '
      + 'NICHT erfinden).',
    systembausteine:
      'In Payload 6 (Systembaustein-Briefings). Wenn ein Briefing-Eintrag '
      + 'konkrete Text-Inhalte enthält (nicht nur Metadaten), sind das die '
      + 'fertigen Snapshots. Verwende sie 1:1 für die HTML-Generierung.',
    interne_inhalte:
      'Die Funktion "Interne Inhalte erzeugen" im Export-Center generiert '
      + 'diese Snapshots VOR dem Export. Nach der Generierung existiert für '
      + 'jeden benötigten Inhalt genau ein Snapshot. Die MBK muss NICHTS '
      + 'mehr "ausdenken" — nur einbauen.',
  },
  hinweis_fuer_mbk:
    'Wenn du einen Snapshot vorfindest, vertraue ihm. Die Lehrkraft hat ihn '
    + 'geprüft und freigegeben. Deine Aufgabe ist es, ihn korrekt in die '
    + 'HTML-Struktur einzubetten — nicht, ihn didaktisch oder sprachlich zu '
    + 'verändern.',
};

/**
 * Schüler-Arbeitsumgebung-Vertrag (airgap-1.13.0).
 *
 * FESTE, inhalts-UNABHÄNGIGE Anweisung an die MBK in Payload 1. Beschreibt
 * die methodische Hülle (Schüler-Arbeitsumgebung), die sich um JEDE Einheit
 * legt — unabhängig von Fach, Jahrgang oder Inhalt. Diese Hülle ist das
 * „Betriebssystem" der Schüler-App: Cockpit, Poolzeit-Ritual, Lerntagebuch,
 * Merkheft, Navigation und Onboarding.
 *
 * Die MBK baut diese Hülle EINMAL pro App-Instanz — die Inhalte (Einheiten,
 * Lernpakete, Aktivitäten) werden dann dort eingehängt, wo die Hülle
 * Platzhalter/Anker vorsieht.
 */
const SCHUELER_ARBEITSUMGEBUNG_CONTRACT = {
  was_ist_das:
    'Die Schüler-Arbeitsumgebung ist die methodische Hülle, die sich um JEDE '
    + 'Einheit legt. Sie ist das „Betriebssystem" der Schüler-App — unabhängig '
    + 'von konkreten Inhalten. Sie wird EINMAL pro App-Instanz gebaut; jede '
    + 'Einheit wird dann in diesen Rahmen eingehängt. Die Hülle enthält fünf '
    + 'Ebenen, die alle vor, während und nach der Einheiten-Bearbeitung aktiv sind.',

  ebenen: {

    cockpit: {
      beschreibung:
        'Die zentrale Startseite des Schülers. Wird NACH dem Login und VOR '
        + 'jedem Fach-/Einheit-Zugriff angezeigt.',
      elemente: [
        {
          name: 'CockpitHeader',
          funktion:
            'Dezentes Dreieck oben mittig — antippt klappt Overlay mit '
            + 'Schülername, Logout, Lerntagebuch-Link und optionalem '
            + 'Lerntyp-Wechsel-Dialog aus.',
        },
        {
          name: 'StartButton',
          funktion:
            'Großer, prominenter Button „Poolzeit beginnen". Führt den '
            + 'Schüler in den strukturierten Poolzeit-Ablauf.',
        },
        {
          name: 'SelbstNotizKarte',
          funktion:
            'Kompakte Karte mit der letzten „Nachricht an mich selbst" aus '
            + 'dem Lerntagebuch. Zeigt Datum der letzten Notiz und verlinkt '
            + 'ins Lerntagebuch.',
        },
        {
          name: 'FachKacheln (3-spaltiges Grid)',
          funktion:
            'Pro Poolzeit-Fach eine Kachel mit Fach-Icon/-Farbe, '
            + 'Fortschrittsstufe (aktiv/inaktiv/abgeschlossen) und Angabe, '
            + 'wie lange die letzte Arbeit zurückliegt. Antippen öffnet die '
            + 'FachSeite mit den Einheiten dieses Fachs.',
        },
        {
          name: 'RueckblickLeiste',
          funktion:
            'Schmaler Streifen am unteren Rand mit Wochen-Rückblick: '
            + 'pro Tag die gearbeiteten Minuten, das Fach und ggf. eine '
            + 'kurze Aktivitätsbeschreibung.',
        },
      ],
    },

    poolzeit_ablauf: {
      beschreibung:
        'Der strukturierte Poolzeit-Workflow. Führt den Schüler Schritt für '
        + 'Schritt durch die Planung, Ausführung und Reflexion einer Lernsession.',
      schritte: [
        {
          schritt_nummer: 1,
          name: 'Gesamtzeit festlegen',
          funktion:
            'Schüler legt per Slider fest, wie viele Minuten er heute lernen '
            + 'möchte (Default: 40 Min).',
        },
        {
          schritt_nummer: 2,
          name: 'Fächer planen (Zeitleiste)',
          funktion:
            'Schüler verteilt die Gesamtzeit auf 1–n Fächer in einer '
            + 'horizontalen Zeitleiste (5-Min-Schritte).',
        },
        {
          schritt_nummer: 3,
          name: 'Einheit starten (pro Fachblock)',
          funktion:
            'Pro Fachblock wählt und startet der Schüler eine Einheit. '
            + 'Nach Ablauf der Block-Zeit erscheint ein sanfter Hinweis.',
        },
        {
          schritt_nummer: '4a',
          name: 'Fachwechsel-Notiz (zwischen zwei Fächern)',
          funktion:
            'FREIWILLIGE Zwischennotiz beim Fachwechsel. Wird im '
            + 'Lerntagebuch als typ="zwischennotiz" gespeichert.',
        },
        {
          schritt_nummer: '4b',
          name: 'Abschluss (nach dem letzten Fachblock)',
          funktion:
            'Zwei Pflichtfelder: Reflexion („Was hast du heute gelernt?") '
            + 'und Nachricht an mich selbst („Was fürs nächste Mal merken?"). '
            + 'Die Nachricht erscheint beim nächsten Poolzeit-Start im Cockpit.',
        },
      ],
    },

    lerntagebuch: {
      beschreibung:
        'Fachübergreifendes, persönliches Logbuch. Erreichbar über Cockpit '
        + '(SelbstNotizKarte) oder CockpitHeader.',
      eintrags_typen: [
        { typ: 'reflexion', bedeutung: 'Rückblick am Poolzeit-Ende' },
        { typ: 'nachricht', bedeutung: 'Nachricht an sich selbst fürs nächste Mal' },
        { typ: 'zwischennotiz', bedeutung: 'Kurze Notiz beim Fachwechsel' },
        { typ: 'frei', bedeutung: 'Freier Eintrag, jederzeit erstellbar' },
      ],
    },

    merkheft: {
      beschreibung:
        'Pro-Einheit-Notizblock im Einheit-Dashboard. Erreichbar über das '
        + 'Burger-Menü (☰). Für schnelle Notizen WÄHREND der Arbeit.',
      speicherung: 'Pro Notiz: user_email + einheit_id + text.',
    },

    einheit_dashboard: {
      beschreibung:
        'Das Lern-Dashboard NACH Onboarding und Lerntyp-Wahl.',
      elemente: [
        {
          name: 'PfadNavigation (Burger-Slide-out)',
          funktion:
            'Seitliches Overlay mit Sektor-/Item-Struktur des Lerntyps. '
            + 'Zeigt Status (offen/erledigt/aktiv) und Schloss-Symbole.',
        },
        {
          name: 'Zeit-Tracker',
          funktion:
            'Misst und zeigt die in dieser Einheit verbrachte Zeit (Minuten).',
        },
        {
          name: 'Lernlandkarte (sys_map_full)',
          funktion:
            'Interaktive Lernlandkarte mit Ampel-Selbsteinschätzung pro Lernziel.',
        },
        {
          name: 'Weiter-Button',
          funktion:
            'Universeller Abschluss-Mechanismus (siehe dashboard_gating_engine).',
        },
      ],
    },
  },

  bau_regeln: [
    'Die Hülle ist ein Set von HTML-Seiten: Cockpit, Poolzeit (Multi-Step), '
    + 'Lerntagebuch, FachSeite, EinheitOnboarding, EinheitDashboard.',
    'Cockpit UND EinheitDashboard teilen denselben CockpitHeader. '
    + 'Das Burger-Menü (☰) existiert NUR im Dashboard.',
    'Der Zeit-Tracker läuft im Hintergrund, sobald eine Einheit geöffnet ist.',
    'Sämtliche Fortschritts-/Status-Daten werden persistent gespeichert '
    + '(nicht flüchtig im Browser).',
    'Die Hülle wird EINMAL gebaut und nur bei Änderungen an dieser Spec '
    + 'aktualisiert — NICHT pro Einheit neu generiert.',
  ],

  integration_mit_einheiten: {
    beschreibung:
      'Die Hülle definiert ANKER, in die einheits-spezifische Inhalte '
      + 'eingehängt werden:',
    anker: [
      {
        wo: 'Cockpit → FachKacheln',
        was: 'Pro Fach eine Kachel mit Fortschrittsdaten aus '
          + 'SchuelerEinheitFortschritt + Einheiten.',
      },
      {
        wo: 'FachSeite → EinheitKacheln',
        was: 'Pro Einheit des Fachs eine Kachel.',
      },
      {
        wo: 'EinheitOnboarding',
        was: 'Vier Elemente (Einführung, Fragenblock, Einstiegsdiagnose, '
          + 'KI-Lerntyp-Diagnose) als Snapshot aus Einheiten.onboarding_konfiguration.',
      },
      {
        wo: 'EinheitDashboard → Hauptbereich',
        was: 'Sektoren und Items des gewählten Lerntyps aus Payload 2–5.',
      },
    ],
  },

  hinweis_fuer_mbk:
    'Die Hülle ist FEST und wird EINMAL gebaut. Nur die Inhalte an den '
    + 'Anker-Punkten einhängen. Keine konkreten Fach-/Einheit-Daten in der '
    + 'Hülle selbst — die kommen aus Payload 2–5.',
};

const ONBOARDING_CONTRACT = {
  was_ist_das:
    'Jede Einheit hat eine einheits-GLOBALE Orientierungs-/Onboarding-Phase, '
    + 'die dem Schüler VOR der Wahl eines der vier Lerntyp-Dashboards '
    + '(minimalist/pragmatiker/ehrgeizig/passioniert) angezeigt wird. Sie ist '
    + 'bewusst NICHT Teil der Dashboards/Lernpfade, sondern eine eigene, allen '
    + 'vier Dashboards vorgeschaltete Einstiegsseite der Einheit. Früher war '
    + 'diese Phase 4× redundant in jedem Dashboard — jetzt existiert sie genau '
    + 'einmal pro Einheit.',
  ablauf:
    'Reihenfolge der Schüleransicht: 1) Vorstellung der Einheit (Titel, Fach, '
    + 'Jahrgang, Gesamtziele). 2) Die drei Onboarding-Elemente (siehe '
    + 'elemente). 3) Erst danach wählt der Schüler sein Dashboard und startet '
    + 'den eigentlichen Lernpfad. Die Onboarding-Inhalte werden EINMAL beim '
    + 'Bauen festgelegt (Snapshot) und NICHT bei jedem Schülerklick neu '
    + 'generiert.',
  elemente: [
    {
      key: 'einfuehrung',
      titel: 'Kurze Einführung in die Einheit',
      zweck:
        'Motivierender, schülergerechter Einstieg: worum geht es in dieser '
        + 'Einheit, warum ist das relevant. Struktur (titel, intro, '
        + 'abschnitte[], optional bild). Reine Information, keine Bewertung.',
    },
    {
      key: 'fragenblock',
      titel: 'Freiwilliger Selbsteinschätzungs-Fragenblock',
      zweck:
        'FREIWILLIGE Selbsteinschätzung des Schülers (kein Test, keine '
        + 'Wertung). Hilft dem Schüler, seinen eigenen Stand/seine Motivation '
        + 'einzuordnen. Struktur (titel, intro, fragen[], hinweis).',
    },
    {
      key: 'einstiegsdiagnose',
      titel: 'Einstiegsdiagnose (Wissens-Quiz)',
      zweck:
        'Multiple-Choice-Wissensquiz zum Vorwissen für diese Einheit. Dient '
        + 'der Standortbestimmung des Schülers vor dem Start. Kann später eine '
        + 'Dashboard-/Lerntyp-Empfehlung speisen.',
    },
    {
      key: 'lerntyp_diagnose',
      titel: 'KI-Lerntyp-Diagnose (Brian-Gespräch)',
      zweck:
        'IMMER das LETZTE Element der Orientierungsphase. Wenn der Schüler '
        + 'nach den vorherigen Elementen weiterhin unsicher ist, welcher der '
        + 'vier Lerntypen zu ihm passt, kann er mit dem KI-Lernbegleiter Brian '
        + 'sprechen. Struktur (titel, intro, gespraechs_leitfaden[], hinweis). '
        + 'Brian stellt die Leitfragen und spricht am Ende eine Empfehlung aus.',
    },
  ],
  hinweis_fuer_mbk:
    'Baue die Orientierungsphase als EINE, allen vier Dashboards '
    + 'vorgeschaltete Einstiegsseite der Einheit (nicht pro Dashboard '
    + 'wiederholen). Die konkreten Inhalte der drei Elemente stehen in '
    + 'Payload 2 unter `einheit.onboarding`. Fehlt dort ein Element (null), '
    + 'wurde es von der Lehrkraft noch nicht erzeugt und darf NICHT erfunden '
    + 'werden.',
};

/**
 * Normalisiert den Onboarding-Snapshot der Einheit für Payload 2.
 *
 * Liest `Einheiten.onboarding_konfiguration` (siehe Entity-Schema + Tab 8,
 * 5. Pill „Onboarding") und reicht die drei festen Elemente 1:1 durch.
 * Jedes Element ist `null`, solange es die Lehrkraft nicht erzeugt/gespeichert
 * hat — die MBK darf fehlende Elemente NICHT erfinden (siehe
 * ONBOARDING_CONTRACT.hinweis_fuer_mbk).
 */
function buildOnboardingForStructure(konfig) {
  const k = konfig && typeof konfig === 'object' ? konfig : {};
  const obj = (v) => (v && typeof v === 'object' ? v : null);
  return {
    einfuehrung: obj(k.einfuehrung),
    fragenblock: obj(k.fragenblock),
    einstiegsdiagnose: obj(k.einstiegsdiagnose),
    lerntyp_diagnose: obj(k.lerntyp_diagnose),
    generiert_am: nullable(k.generiert_am),
  };
}

/**
 * Erkennt Platzhalter-System-Bausteine (`sys_platzhalter_*`).
 *
 * Platzhalter sind reine Arbeitshilfen im Lernpfad-Architekt (Tab 7) — sie
 * markieren „hier kommt später noch eine echte Aufgabe rein". Beim Export
 * sollen sie GAR NICHT auftauchen: weder als sichtbare Karte im Dashboard
 * noch als eigene SCORM-Datei. Sobald die Lehrkraft die Einheit final
 * freigibt, gilt der inhaltliche Stand — fehlende Aufgaben fehlen dann
 * eben, anstatt durch Platzhalter „aufgefüllt" zu werden.
 *
 * Konvention: Alle Platzhalter-Bausteine haben das ID-Präfix
 * `sys_platzhalter_` (siehe seedSystemBausteine). Diese Funktion ist die
 * Single Source of Truth für den Filter — sowohl summarizeSektor als auch
 * das SCORM-File-Mapping in buildStructurePayload nutzen sie.
 */
// Bündel-IDs tragen aus historischen Gründen noch das `sys_platzhalter_`-
// Präfix, sind aber KEINE Platzhalter mehr (typ='buendel'). Sie müssen im
// Export erhalten bleiben und dürfen NICHT herausgefiltert werden.
const BUENDEL_LEGACY_IDS = new Set([
  'sys_platzhalter_moodle_buendel',
  'sys_platzhalter_brian_buendel',
]);

function isPlatzhalterItem(item) {
  return !!(
    item
    && item.type === 'system'
    && typeof item.ref_id === 'string'
    && item.ref_id.startsWith('sys_platzhalter_')
    && !BUENDEL_LEGACY_IDS.has(item.ref_id)
  );
}

/** Filename-Builder pro Datei-Typ. Reine String-Kompositoren — keine Validierung. */
function fnLernpaket(lernpaketId) {
  return `task-${lernpaketId}.html`;
}
function fnThemenfeldBundle(themenfeldId) {
  return `tasks-themenfeld-${themenfeldId}.html`;
}
function fnThemenfeldBundleOrphan() {
  return `tasks-themenfeld-orphan.html`;
}
function fnProjektBundle(einheitId) {
  return `projekte-einheit-${einheitId}.html`;
}
/**
 * airgap-1.6.0: System-Baustein-HTMLs sind ab dieser Version pro Lerntyp
 * eindeutig — derselbe Baustein wird in Deutsch/Minimalist anders gefüllt
 * als in Mathe/Passioniert. Das SCORM-Mapping referenziert pro Lerntyp-Pfad
 * exakt eine Datei mit diesem Pattern; die MBK generiert pro Pfad-Referenz
 * einen eigenen Inhalt aus dem zugehörigen mbk_systembaustein_payload.
 */
function fnSystemBaustein(bausteinId, lerntyp) {
  return `system-${lerntyp}-${bausteinId}.html`;
}
function fnFragment(activityId) {
  return `fragment-${activityId}.html`;
}
function fnDashboard(lerntyp) {
  return `dashboard-${lerntyp}.html`;
}

/**
 * Composite-Key für Payload-5-Items (mbk_systembaustein_payload).
 * Wird als reference_id in ExportPrompts persistiert und identifiziert
 * eindeutig die Kombination Baustein × Lerntyp innerhalb einer Einheit.
 */
export function makeSystembausteinReferenceId(lerntyp, bausteinId) {
  return `${lerntyp}::${bausteinId}`;
}

/**
 * Inverse zu makeSystembausteinReferenceId — splittet eine reference_id
 * in { lerntyp, bausteinId }. Liefert null bei ungültigem Format.
 */
export function parseSystembausteinReferenceId(refId) {
  if (typeof refId !== 'string') return null;
  const idx = refId.indexOf('::');
  if (idx <= 0) return null;
  return {
    lerntyp: refId.slice(0, idx),
    bausteinId: refId.slice(idx + 2),
  };
}

/**
 * Liefert `null` statt leerer Strings, damit das JSON-Schema
 * "Wert nicht gesetzt" sauber abbildet (siehe Designprinzip §4 im
 * docs/mbk-integration.md).
 */
function nullable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  return value;
}

/**
 * Lookup für globale MBK-Prompts; nur aktive Einträge werden berücksichtigt.
 * Liefert `null`, wenn der Schlüssel nicht (mehr) gepflegt ist.
 */
function lookupGlobal(globalPrompts, schluessel) {
  if (!Array.isArray(globalPrompts) || !schluessel) return null;
  const found = globalPrompts.find(
    (p) => p?.schluessel === schluessel && p?.ist_aktiv !== false
  );
  return nullable(found?.prompt_text);
}

/**
 * Normalisiert eine Conventions-Liste (key/value) für ein Fach.
 * Inaktive/leere Einträge werden übersprungen, Reihenfolge bleibt erhalten.
 */
function normalizeConventions(conventions) {
  if (!Array.isArray(conventions)) return [];
  return conventions
    .map((c) => ({
      key: nullable(c?.key),
      value: nullable(c?.value),
    }))
    .filter((c) => c.key && c.value);
}

/**
 * Erzeugt einen meta-Block mit den festen Pflichtfeldern.
 * `nowIso` ist parametrisierbar, damit Tests deterministisch bleiben können.
 *
 * airgap-1.5.0: Beide Hashes (system_context_hash + ui_config_hash) werden
 * in jedem nachgelagerten Payload (Struktur, Task-Content, Micro) parallel
 * geführt, damit die MBK pro generierter HTML-Datei beide `<meta>`-Tags
 * setzen und beim Drift-Check beide validieren kann.
 */
function makeMeta({
  payloadType,
  einheitId = null,
  systemContextHash = null,
  uiConfigHash = null,
  itemCount = null,
  nowIso = null,
}) {
  const exportedAt = nowIso || new Date().toISOString();
  const meta = {
    schema_version: MBK_AIRGAP_VERSION,
    payload_type: payloadType,
    exported_at: exportedAt,
  };
  if (einheitId !== null) meta.einheit_id = einheitId;
  if (systemContextHash !== null) meta.system_context_hash = systemContextHash;
  if (uiConfigHash !== null) meta.ui_config_hash = uiConfigHash;
  if (itemCount !== null) meta.item_count = itemCount;
  return meta;
}

// ── 0. Payload 0: UI-Config (airgap-1.5.0) ─────────────────────────────────

/**
 * Schlüssel-Set der UI-Bausteine. Single Source of Truth — auch in
 * lib/systemContextHash.js gepflegt; bewusst dupliziert, damit dieser
 * Builder keine Hash-Logik importieren muss.
 */
const UI_CONFIG_PROMPT_KEYS = [
  'ui_css_variables',
  'ui_tab_bar_html',
  'ui_default_header_html',
];

/**
 * Payload 0: rein darstellungsbezogene UI-Bausteine (airgap-1.5.0).
 *
 * Trennt Inhalt (Payload 1: System-Kontext) von Darstellung (Payload 0:
 * UI-Config), damit eine Grafikabteilung am CSS arbeiten kann, ohne den
 * didaktischen System-Prompt zu invalidieren. Beide Hashes werden in
 * jeder generierten HTML-Datei als `<meta>`-Tag mitgeliefert.
 *
 * Enthält:
 *   - css_variables       (Inline-CSS-Block für jeden HTML-`<head>`)
 *   - tab_bar_html        (HTML-Snippet der Dashboard-Tab-Bar)
 *   - default_header_html (Header-Template mit {{title}}/{{back_targets}})
 *
 * @param {object} args
 * @param {Array}  args.globalPrompts  — MBKGlobalPrompt[] (alle, gefiltert wird intern)
 * @param {string} args.uiConfigHash   — vorberechneter UI-Config-Hash
 * @param {string} [args.nowIso]
 */
export function buildUiConfigPayload({
  globalPrompts = [],
  uiConfigHash,
  nowIso = null,
}) {
  const meta = makeMeta({
    payloadType: 'mbk_ui_config',
    uiConfigHash: uiConfigHash || null,
    nowIso,
  });

  const ui = {
    css_variables: lookupGlobal(globalPrompts, 'ui_css_variables'),
    tab_bar_html: lookupGlobal(globalPrompts, 'ui_tab_bar_html'),
    default_header_html: lookupGlobal(globalPrompts, 'ui_default_header_html'),
  };

  return {
    meta,
    ui_global_config: ui,
    // Spiegel der Schlüssel-Liste für die MBK — erlaubt der KI, fehlende
    // Bausteine eindeutig zu benennen, ohne die Halt-Bedingung 4a zu raten.
    expected_keys: UI_CONFIG_PROMPT_KEYS,
  };
}

// ── 1. Payload 1: System-Kontext ────────────────────────────────────────────

/**
 * Payload 1: schul-/fach-/jahrgangs-übergreifender System-Kontext.
 *
 * Enthält:
 *   - Stammdaten (Land, Bundesland, Schulform)
 *   - Schul-Nomenklatur (pro Fach: conventions + global_style)
 *   - aktive globale MBK-Prompts (Mission, Lerntypen, Operatoren, …)
 *     OHNE die UI-Bausteine (die wandern ab airgap-1.5.0 in Payload 0).
 *
 * @param {object} args
 * @param {object} args.stammdaten           — { land, bundesland, schulform }
 * @param {Array}  args.schulNomenklatur     — SchulNomenklatur[]
 * @param {Array}  args.globalPrompts        — MBKGlobalPrompt[]
 * @param {string} args.systemContextHash    — vorberechneter Hash (16 Hex-Zeichen)
 * @param {string} [args.nowIso]             — optional, für deterministische Tests
 */
export function buildSystemContextPayload({
  stammdaten = {},
  schulNomenklatur = [],
  globalPrompts = [],
  systemContextHash,
  nowIso = null,
}) {
  const meta = makeMeta({
    payloadType: 'mbk_system_context',
    systemContextHash: systemContextHash || null,
    nowIso,
  });

  // Stammdaten — leere Strings → null.
  const stammdatenOut = {
    land: nullable(stammdaten?.land),
    bundesland: nullable(stammdaten?.bundesland),
    schulform: nullable(stammdaten?.schulform),
  };

  // Schul-Nomenklatur fach-indiziert ausgeben.
  // Inaktive Fächer (`ist_aktiv === false`) werden übersprungen — sie sollen
  // weder den Hash kippen lassen noch im Payload auftauchen.
  const nomenklatur = {};
  for (const rec of schulNomenklatur || []) {
    if (!rec || rec.ist_aktiv === false) continue;
    const fach = nullable(rec.fach);
    if (!fach) continue;
    const conventions = normalizeConventions(rec.conventions);
    const globalStyle = nullable(rec.global_style);
    if (conventions.length === 0 && !globalStyle) continue;
    nomenklatur[fach] = {
      conventions,
      global_style: globalStyle,
    };
  }

  // Globale MBK-Prompts: nur die hash-relevanten Felder, sortiert nach Schlüssel
  // damit der Output stabil ist (Reorder im Manager-Tab darf den Payload nicht
  // verändern). airgap-1.5.0: UI-Bausteine werden ausgeschlossen — sie
  // gehören in Payload 0 (UI-Config).
  const uiKeySet = new Set(UI_CONFIG_PROMPT_KEYS);
  const globalPromptsOut = (globalPrompts || [])
    .filter((p) => p && p.ist_aktiv !== false)
    .filter((p) => !uiKeySet.has(p?.schluessel))
    .map((p) => ({
      schluessel: nullable(p.schluessel),
      kategorie: nullable(p.kategorie),
      anzeigename: nullable(p.anzeigename),
      prompt_text: nullable(p.prompt_text),
    }))
    .filter((p) => p.schluessel)
    .sort((a, b) => a.schluessel.localeCompare(b.schluessel));

  // Bequemer Direkt-Lookup für Kern-Schlüssel — die MBK kann sie auch über
  // die globalPromptsOut-Liste finden, aber als fest verdrahtete Top-Level-
  // Felder sind sie für den System-Prompt sofort greifbar.
  const directLookups = {
    mission_statement: lookupGlobal(globalPrompts, 'global_mission_statement'),
    persona_global: lookupGlobal(globalPrompts, 'global_persona'),
    lerntypen_definition: lookupGlobal(globalPrompts, 'def_lerntypen'),
    struktur_definition: lookupGlobal(globalPrompts, 'def_struktur'),
    persona_generator_anweisung: lookupGlobal(globalPrompts, 'persona_generator_anweisung'),
  };

  // airgap-1.5.0: ui_global_config wurde nach Payload 0 (mbk_ui_config)
  // ausgelagert. Der System-Kontext enthält ab dieser Version nur noch
  // die didaktischen Regeln + den SCORM-Vertrag.

  return {
    meta,
    stammdaten: stammdatenOut,
    schul_nomenklatur: nomenklatur,
    global_prompts: globalPromptsOut,
    direct_lookups: directLookups,
    // Generische SCORM-Modularitäts-Anweisung. Bewusst inhalts-unabhängig,
    // damit der system_context_hash bei Aufgaben-Änderungen nicht kippt.
    scorm_delivery_contract: SCORM_DELIVERY_CONTRACT,
    // airgap-1.7.0: Gating-Engine-Vertrag (siehe docs/dashboard-gating-engine.md).
    // Beschreibt Status-Feld, Gating-Regeln, Initial-Status-Ableitung und den
    // universellen Weiter-Button — ebenfalls inhalts-unabhängig.
    dashboard_gating_engine: DASHBOARD_GATING_ENGINE,
    // airgap-1.9.0: Erklärt den Master-Anzeige-Modus (shuffle/alle) für
    // Aktivitäten mit mehreren MasterAufgaben. Der konkrete Modus pro
    // Aktivität steht in Payload 3 (`master_anzeige_modus`).
    master_anzeige_modus_contract: MASTER_ANZEIGE_MODUS_CONTRACT,
    // airgap-1.10.0: Erklärt die einheits-globale Orientierungs-/Onboarding-
    // Phase, die allen vier Dashboards vorgeschaltet ist. Die konkreten
    // Inhalte stehen in Payload 2 (`einheit.onboarding`).
    onboarding_contract: ONBOARDING_CONTRACT,
    // airgap-1.12.0: Update-Lifecycle-Vertrag (draft → published → Update).
    update_lifecycle_contract: UPDATE_LIFECYCLE_CONTRACT,
    // airgap-1.12.0: Snapshot-Priorität (fertige Inhalte > KI-Briefing > Platzhalter).
    snapshot_priority_contract: SNAPSHOT_PRIORITY_CONTRACT,
    // airgap-1.13.0: Schüler-Arbeitsumgebung (Cockpit, Poolzeit, Lerntagebuch,
    // Merkheft, Dashboard-Navigation). Die methodische Hülle, die sich um jede
    // Einheit legt — EINMAL gebaut, für alle Einheiten gültig.
    schueler_arbeitsumgebung_contract: SCHUELER_ARBEITSUMGEBUNG_CONTRACT,
  };
}

// ── 2. Payload 2: Struktur der Einheit ───────────────────────────────────────

/**
 * Reduziert eine `LernpaketPhaseAktivitaet` auf einen schlanken Struktur-Eintrag.
 * Inhalte (field_values, ki_briefing, transkript) bleiben hier WEG — sie gehören
 * nach Payload 3 bzw. 4.
 */
function summarizePhaseAktivitaet(pa, katalogById) {
  const katalog = katalogById?.get(pa?.aktivitaet_id) || null;
  return {
    activity_id: pa?.id || null,
    aktivitaet_katalog_id: pa?.aktivitaet_id || null,
    aktivitaet_name: nullable(katalog?.name),
    phase: nullable(pa?.phase),
    reihenfolge: pa?.reihenfolge ?? null,
    erstellungs_modus: pa?.erstellungs_modus || 'manuell',
    is_complete: pa?.is_complete === true,
  };
}

/**
 * Reduziert ein Lernpaket auf einen Struktur-Eintrag (ohne Inhalts-Details).
 */
function summarizeLernpaket(lp, phasenDesPakets, katalogById) {
  return {
    lernpaket_id: lp.id,
    titel: nullable(lp.titel_des_pakets),
    themenfeld_id: lp.themenfeld_id || null,
    reihenfolge_nummer: lp.reihenfolge_nummer ?? null,
    geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten ?? null,
    kernbegriffe: Array.isArray(lp.kernbegriffe) ? lp.kernbegriffe.filter(Boolean) : [],
    aktivitaeten: (phasenDesPakets || [])
      .slice()
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((pa) => summarizePhaseAktivitaet(pa, katalogById)),
  };
}

/**
 * Wandelt einen Sektor-Eintrag aus `lernpfade_konfiguration` in eine
 * portierbare Struktur um. Items werden hierarchisch (parent/children)
 * gerendert, damit Bündel-Verschachtelungen klar bleiben.
 */
function summarizeSektor(sektor, themenfelderById, bausteinById = new Map()) {
  // Platzhalter-Bausteine bleiben in der DB-Konfiguration als Arbeitshilfe
  // für Tab 7 erhalten, fließen aber NICHT in den Export. Wir filtern sie
  // hier ein einziges Mal raus — alles weiter unten arbeitet auf der
  // bereinigten Liste.
  const allItems = Array.isArray(sektor?.items) ? sektor.items : [];
  const items = allItems.filter((it) => !isPlatzhalterItem(it));
  const rootItems = items.filter((it) => !it?.parent_instance_id);
  const childrenByParent = new Map();
  for (const it of items) {
    if (it?.parent_instance_id) {
      if (!childrenByParent.has(it.parent_instance_id)) childrenByParent.set(it.parent_instance_id, []);
      childrenByParent.get(it.parent_instance_id).push(it);
    }
  }

  const renderItem = (it) => ({
    instance_id: it?.instance_id || null,
    type: it?.type || null,
    ref_id: it?.ref_id || null,
    parent_instance_id: it?.parent_instance_id || null,
    bundle_config: it?.bundle_config || null,
  });

  const itemsOut = [];
  rootItems.forEach((root) => {
    itemsOut.push(renderItem(root));
    const children = childrenByParent.get(root.instance_id) || [];
    children.forEach((child) => itemsOut.push(renderItem(child)));
  });

  const themenfeldTitel = sektor?.themenfeld_id
    ? nullable(sektor?.titel_snapshot) || nullable(themenfelderById.get(sektor.themenfeld_id)?.titel)
    : null;

  // Schema v4: bearbeitungsmodus pro Sektor in den Strukturpayload
  // ausliefern, damit der Architekt die Dashboards mit der richtigen
  // Gating-Logik rendern kann.
  const bearbeitungsmodus = (sektor?.bearbeitungsmodus === 'sequenziell' || sektor?.bearbeitungsmodus === 'frei')
    ? sektor.bearbeitungsmodus
    : 'sequenziell';

  // airgap-1.7.0: Gating-Modus des Sektors. Schema v4 trennt `bearbeitungsmodus`
  // (legacy Sektor-Gating: sichtbar-ab-wann) vom neuen Item-Gating. Für die
  // Initial-Status-Ableitung nutzen wir bevorzugt `modus` (sequenziell/frei,
  // gesetzt durch den Sektor-Modus-Toggle); fehlt er, fällt es auf
  // `bearbeitungsmodus` zurück.
  const sektorGatingModus = (sektor?.modus === 'frei' || sektor?.modus === 'sequenziell')
    ? sektor.modus
    : bearbeitungsmodus;

  // airgap-1.7.0: jedem Item initial_status + abschluss_bedingung beigeben
  // (siehe docs/dashboard-gating-engine.md). Test-Sektoren markieren ihre
  // Items als "absolviert"-pflichtig.
  const istTestSektor = sektor?.sektor_typ === 'zwischentest' || sektor?.sektor_typ === 'abschlusstest';
  const itemsAnnotated = annotateSektorItems({
    items: itemsOut,
    sektorModus: sektorGatingModus,
    bausteinById,
    istTestItem: () => istTestSektor,
  });

  // airgap-1.8.0: Sektor-Freischaltung (Sektor-Level-Gating). Regelt, WANN der
  // Sektor im Dashboard zugänglich wird: 'sofort' (von Anfang an) oder
  // 'nach_sektor' (gesperrt, bis der Voraussetzungs-Sektor erledigt ist).
  // Genau EIN Voraussetzungs-Sektor — keine UND/ODER-Logik.
  const fb = sektor?.freischalt_bedingung;
  const freischalt_bedingung =
    fb?.modus === 'nach_sektor' && typeof fb?.voraussetzung_sektor_id === 'string' && fb.voraussetzung_sektor_id
      ? { modus: 'nach_sektor', voraussetzung_sektor_id: fb.voraussetzung_sektor_id }
      : { modus: 'sofort', voraussetzung_sektor_id: null };

  return {
    sektor_id: sektor?.sektor_id || null,
    sektor_typ: sektor?.sektor_typ || null,
    sektor_typ_label: getSektorTypLabel(sektor?.sektor_typ),
    titel: nullable(sektor?.titel),
    themenfeld_id: sektor?.themenfeld_id || null,
    themenfeld_titel: themenfeldTitel,
    bearbeitungsmodus,
    modus: sektorGatingModus,
    freischalt_bedingung,
    items: itemsAnnotated,
  };
}

/**
 * Payload 2: Struktur einer Einheit.
 *
 * Enthält die vollständige Lernlandkarte + Lernpfade pro Lerntyp + alle
 * AllgemeineAufgaben (auf Struktur-Niveau, ohne Inhalts-Details). Dient
 * der MBK als „Inhaltsverzeichnis", aus dem sie pro Item das passende
 * Erstellungspaket (Payload 3) bzw. Micro-Briefing (Payload 4) anfordert.
 *
 * @param {object} args
 * @param {object} args.einheit
 * @param {Array}  args.themenfelder
 * @param {Array}  args.lernpakete
 * @param {Array}  args.lernziele
 * @param {Array}  args.phaseAktivitaeten
 * @param {Map}    args.katalogById       — Map<aktivitaet_id, AktivitaetenKatalog>
 * @param {Array}  args.allgemeineAufgaben
 * @param {string} [args.systemContextHash]
 * @param {string} [args.nowIso]
 */
export function buildStructurePayload({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  allgemeineAufgaben = [],
  systemBausteine = [],
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  const meta = makeMeta({
    payloadType: 'mbk_structure_payload',
    einheitId: einheit?.id || null,
    systemContextHash,
    uiConfigHash,
    nowIso,
  });

  // Themenfelder + Pakete sortieren.
  const themenfelderSorted = [...themenfelder].sort(
    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
  );
  const themenfelderById = new Map(themenfelderSorted.map((tf) => [tf.id, tf]));
  // System-Bausteine früh indizieren — wird sowohl für die Item-Annotation
  // (Gating: Bündel-Erkennung) in summarizeSektor als auch weiter unten fürs
  // SCORM-Mapping benötigt.
  const bausteinByKey = new Map(
    (systemBausteine || []).map((b) => [b.baustein_id, b])
  );

  // Lernpakete pro Themenfeld + Lernziele pro Lernpaket + Phase-Aktivitäten
  // pro Lernpaket vorgruppieren.
  const paketeByTf = new Map(themenfelderSorted.map((tf) => [tf.id, []]));
  const orphans = [];
  for (const lp of lernpakete) {
    if (lp.themenfeld_id && paketeByTf.has(lp.themenfeld_id)) {
      paketeByTf.get(lp.themenfeld_id).push(lp);
    } else {
      orphans.push(lp);
    }
  }
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }
  const phasenByPaket = new Map();
  for (const pa of phaseAktivitaeten) {
    if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
    phasenByPaket.get(pa.lernpaket_id).push(pa);
  }

  const renderLernpaketEntry = (lp) => {
    const sum = summarizeLernpaket(lp, phasenByPaket.get(lp.id) || [], katalogById);
    sum.lernziele = (zieleByPaket.get(lp.id) || []).map((lz) => ({
      lernziel_id: lz.id || null,
      formulierung_fachsprache: nullable(lz.formulierung_fachsprache),
      kategorie: nullable(lz.kategorie),
      schueler_uebersetzung: nullable(lz.schueler_uebersetzung),
    }));
    return sum;
  };

  // Themenfelder-Block.
  const themenfelderOut = themenfelderSorted.map((tf) => ({
    themenfeld_id: tf.id,
    titel: nullable(tf.titel),
    beschreibung: nullable(tf.beschreibung),
    reihenfolge: tf.reihenfolge ?? null,
    bearbeitungsmodus: nullable(tf.bearbeitungsmodus),
    lernpakete: (paketeByTf.get(tf.id) || [])
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .map(renderLernpaketEntry),
  }));

  // Allgemeine Aufgaben (Struktur-Niveau): nur Header-Felder, keine Inhalte.
  const allgemeineAufgabenOut = (allgemeineAufgaben || []).map((aa) => ({
    aufgabe_id: aa.id,
    titel: nullable(aa.titel),
    anforderungsebene: nullable(aa.anforderungsebene),
    aufgaben_typ: nullable(aa.aufgaben_typ),
    mission_type: nullable(aa.mission_type),
    themenfeld_id: aa.themenfeld_id || null,
    schwierigkeitsgrad: aa.schwierigkeitsgrad ?? null,
    erstellungs_modus: aa.erstellungs_modus || 'manuell',
    verlinkte_lernpaket_ids: Array.isArray(aa.verlinkte_lernpaket_ids) ? aa.verlinkte_lernpaket_ids : [],
    verlinkte_aufgaben_ids: Array.isArray(aa.verlinkte_aufgaben_ids) ? aa.verlinkte_aufgaben_ids : [],
    verlinkte_projekt_ids: Array.isArray(aa.verlinkte_projekt_ids) ? aa.verlinkte_projekt_ids : [],
  }));

  // Lernpfade pro Lerntyp (Sektoren + Items).
  const lernpfade = {};
  // airgap-1.4.0: Index ref_id → Set<dashboardFilename>, damit jedes Mapping-
  // Item weiß, in welchen Dashboard(s) ein "Zurück"-Button gesetzt werden muss.
  const navContextByRefId = new Map();
  const addNavContext = (refId, dashboardFile) => {
    if (!refId) return;
    if (!navContextByRefId.has(refId)) navContextByRefId.set(refId, new Set());
    navContextByRefId.get(refId).add(dashboardFile);
  };
  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    lernpfade[lt] = sektoren.map((s) => summarizeSektor(s, themenfelderById, bausteinByKey));
    const dashboardFile = fnDashboard(lt);
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        // Platzhalter werden niemals im Export verlinkt → kein nav-Context.
        if (isPlatzhalterItem(item)) continue;
        if (item?.ref_id) addNavContext(item.ref_id, dashboardFile);
      }
    }
  }
  // navContextByRefId enthält Aufgabe-/Lernpaket-/System-Bausteine-IDs.
  // Themenfeld-Bündel und Projekt-Bündel sind Aggregate — ihr nav_context
  // ergibt sich aus der Vereinigung aller enthaltenen Items.
  const navContextFor = (refId) =>
    Array.from(navContextByRefId.get(refId) || []).sort();
  const navContextForAggregate = (refIds) => {
    const merged = new Set();
    for (const id of refIds || []) {
      for (const dash of navContextByRefId.get(id) || []) merged.add(dash);
    }
    return Array.from(merged).sort();
  };

  // ── SCORM-Mapping (airgap-1.3.0 / Bündel-Modell) ─────────────────────────
  // Fünf Datei-Typen:
  //   0. dashboard           → vier Pflicht-HTMLs pro Einheit (eine pro Lerntyp)
  //                            als Differenzierungs-Einstiegspunkte. IMMER
  //                            präsent, auch wenn der jeweilige Pfad leer ist.
  //   1. lernpaket           → eine Monolith-HTML pro Lernpaket
  //   2. themenfeld_bundle   → eine HTML pro Themenfeld mit Ebene-2-Aufgaben
  //                            (+ Orphan-Sammeldatei für Aufgaben ohne TF)
  //   3. projekt_bundle      → eine HTML pro Einheit mit allen Ebene-3-Aufgaben
  //   4. system_baustein     → eine HTML pro im Lernpfad genutztem Baustein
  //                            (deduplizierte Datei, mehrfach im Manifest verlinkbar)
  //
  // KI-Aktivitäten erhalten KEINEN eigenen Mapping-Eintrag — sie werden als
  // HTML-Fragmente (fragment-<id>.html) ausgeliefert und vom Merger in die
  // jeweilige Hülle eingesetzt. Im Mapping-Eintrag der Hülle markieren wir
  // mit `contains_placeholders=true`, dass der Merger dort aktiv werden muss.
  const scormFileMapping = [];

  // 0. Pflicht-Dashboards (eines pro Lerntyp). Immer alle vier — auch bei
  //    leerem Lernpfad, damit der MBK-Vertrag „4 Dashboards pro Einheit"
  //    erfüllt bleibt. Quelle der Items ist `lernpfade[lerntyp]` (oben).
  //    airgap-1.4.0: Dashboards sind die EINZIGEN Items mit
  //    `is_hidden_in_moodle: false`. Ihr `navigation_context` ist die
  //    vollständige Tab-Bar (alle vier Dashboards), damit die MBK in
  //    jedem Dashboard die Geschwister verlinken kann.
  const allDashboards = LERNTYP_KEYS.map((lt) => fnDashboard(lt));
  for (const lt of LERNTYP_KEYS) {
    scormFileMapping.push({
      kind: 'dashboard',
      source_id: lt,
      filename: fnDashboard(lt),
      titel: `Dashboard – ${lt}`,
      contains_placeholders: false,
      placeholder_activity_ids: [],
      is_hidden_in_moodle: false,
      navigation_context: allDashboards,
    });
  }

  // Helper: für eine gegebene Liste von Aufgaben-IDs → Liste der placeholder-
  // pflichtigen IDs (nur KI-Modus).
  const collectPlaceholderActivityIdsForLernpaket = (lpId) =>
    (phaseAktivitaeten || [])
      .filter((pa) => pa?.lernpaket_id === lpId && pa?.erstellungs_modus === 'ki')
      .map((pa) => pa.id);

  const collectPlaceholderAaIds = (aaList) =>
    (aaList || [])
      .filter((aa) => aa?.erstellungs_modus === 'ki')
      .map((aa) => aa.id);

  // 1. Lernpakete (immer, eines pro Paket).
  for (const lp of lernpakete) {
    const placeholderIds = collectPlaceholderActivityIdsForLernpaket(lp.id);
    scormFileMapping.push({
      kind: 'lernpaket',
      source_id: lp.id,
      filename: fnLernpaket(lp.id),
      titel: nullable(lp.titel_des_pakets),
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
      is_hidden_in_moodle: true,
      navigation_context: navContextFor(lp.id),
    });
  }

  // 2. Themenfeld-Bündel (Ebene 2 — also alles, was NICHT Ebene 3 ist).
  //    Pro Themenfeld eine Datei, sofern dort tatsächlich Ebene-2-Aufgaben
  //    liegen. Aufgaben mit aufgaben_typ='projekt_anker' gehen nicht ins
  //    Themenfeld-Bündel — sie wandern ins Projekt-Bündel.
  const isEbene3 = (aa) => aa?.anforderungsebene === '3 - Projekt';
  const isProjektAnker = (aa) => aa?.aufgaben_typ === 'projekt_anker';
  const isEbene2 = (aa) => !isEbene3(aa) && !isProjektAnker(aa);

  const ebene2ByTf = new Map();
  const orphanEbene2 = [];
  for (const aa of allgemeineAufgaben || []) {
    if (!isEbene2(aa)) continue;
    if (aa.themenfeld_id && themenfelderById.has(aa.themenfeld_id)) {
      if (!ebene2ByTf.has(aa.themenfeld_id)) ebene2ByTf.set(aa.themenfeld_id, []);
      ebene2ByTf.get(aa.themenfeld_id).push(aa);
    } else {
      orphanEbene2.push(aa);
    }
  }

  for (const tf of themenfelderSorted) {
    const aaList = ebene2ByTf.get(tf.id) || [];
    if (aaList.length === 0) continue; // keine Leichen im Manifest
    const placeholderIds = collectPlaceholderAaIds(aaList);
    const aufgabeIds = aaList.map((aa) => aa.id);
    scormFileMapping.push({
      kind: 'themenfeld_bundle',
      source_id: tf.id,
      filename: fnThemenfeldBundle(tf.id),
      titel: nullable(tf.titel),
      contained_aufgabe_ids: aufgabeIds,
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
      is_hidden_in_moodle: true,
      navigation_context: navContextForAggregate(aufgabeIds),
    });
  }

  // Orphan-Sammeleintrag NUR wenn auch wirklich Aufgaben ohne TF existieren.
  if (orphanEbene2.length > 0) {
    const placeholderIds = collectPlaceholderAaIds(orphanEbene2);
    const aufgabeIds = orphanEbene2.map((aa) => aa.id);
    scormFileMapping.push({
      kind: 'themenfeld_bundle',
      source_id: 'orphan',
      filename: fnThemenfeldBundleOrphan(),
      titel: 'Allgemeine Aufgaben ohne Themenfeld',
      contained_aufgabe_ids: aufgabeIds,
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
      is_hidden_in_moodle: true,
      navigation_context: navContextForAggregate(aufgabeIds),
    });
  }

  // 3. Projekt-Bündel (Ebene 3 + Projekt-Anker) — eines pro Einheit.
  const ebene3 = (allgemeineAufgaben || []).filter(
    (aa) => isEbene3(aa) || isProjektAnker(aa)
  );
  if (ebene3.length > 0 && einheit?.id) {
    const placeholderIds = collectPlaceholderAaIds(ebene3);
    const aufgabeIds = ebene3.map((aa) => aa.id);
    scormFileMapping.push({
      kind: 'projekt_bundle',
      source_id: einheit.id,
      filename: fnProjektBundle(einheit.id),
      titel: 'Projekte der Einheit',
      contained_aufgabe_ids: aufgabeIds,
      contains_placeholders: placeholderIds.length > 0,
      placeholder_activity_ids: placeholderIds,
      is_hidden_in_moodle: true,
      navigation_context: navContextForAggregate(aufgabeIds),
    });
  }

  // 4. System-Bausteine (airgap-1.6.0 / pro-Lerntyp-Modell):
  //    Pro Lerntyp-Pfad bekommt jeder dort referenzierte Baustein einen
  //    EIGENEN Mapping-Eintrag — derselbe baustein_id in Deutsch/Minimalist
  //    erhält andere Inhalte als in Mathe/Passioniert. Filename-Pattern:
  //    `system-<lerntyp>-<baustein_id>.html`. Strikte 1:1-Zuordnung
  //    zwischen Lernpfad-Referenz und SCORM-Datei — keine toten Files,
  //    keine doppelten Generierungen für nicht-referenzierte Lerntypen.
  //
  //    `system_bausteine` (Top-Level-Block) bleibt deduplizierte Quelle
  //    für die Stamm-Definitionen (titel, icon, export_instruktion). Der
  //    eigentliche persona-spezifische Inhalt entsteht erst über
  //    Payload 5 (mbk_systembaustein_payload).
  const usedBausteinIds = new Set();
  // Stabile Reihenfolge: erst lerntyp-Reihenfolge, dann baustein_id
  // alphabetisch — wichtig für deterministische Test-Outputs und Hashes.
  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    const seenInLerntyp = new Set();
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        if (item?.type !== 'system' || !item?.ref_id) continue;
        // Platzhalter werden NIE als eigene SCORM-Datei generiert.
        if (isPlatzhalterItem(item)) continue;
        // Innerhalb eines Lerntyps deduplizieren: kommt derselbe Baustein
        // zweimal im Pfad vor, gibt es trotzdem nur eine HTML-Datei.
        if (seenInLerntyp.has(item.ref_id)) continue;
        seenInLerntyp.add(item.ref_id);
        usedBausteinIds.add(item.ref_id);
        const baustein = bausteinByKey.get(item.ref_id);
        scormFileMapping.push({
          kind: 'system_baustein',
          source_id: makeSystembausteinReferenceId(lt, item.ref_id),
          baustein_id: item.ref_id,
          lerntyp: lt,
          filename: fnSystemBaustein(item.ref_id, lt),
          titel: nullable(baustein?.titel) || item.ref_id,
          contains_placeholders: false,
          placeholder_activity_ids: [],
          is_hidden_in_moodle: true,
          // Für System-Bausteine ist der nav-Context immer genau das
          // zugehörige Lerntyp-Dashboard — der Baustein steht nur in
          // diesem einen Pfad.
          navigation_context: [fnDashboard(lt)],
        });
      }
    }
  }
  const systemBausteineOut = [];
  for (const bausteinId of [...usedBausteinIds].sort()) {
    const baustein = bausteinByKey.get(bausteinId);
    systemBausteineOut.push({
      baustein_id: bausteinId,
      titel: nullable(baustein?.titel),
      icon: nullable(baustein?.icon),
      export_instruktion: nullable(baustein?.export_instruktion),
      ist_aktiv: baustein ? baustein.ist_aktiv !== false : null,
    });
  }

  return {
    meta,
    einheit: {
      einheit_id: einheit?.id || null,
      fach: nullable(einheit?.fach),
      jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
      titel_der_einheit: nullable(einheit?.titel_der_einheit),
      gesamtziele: Array.isArray(einheit?.gesamtziele) ? einheit.gesamtziele : [],
      // airgap-1.10.0: Konkrete Inhalte der einheits-globalen Orientierungs-/
      // Onboarding-Phase (Snapshot aus Einheiten.onboarding_konfiguration).
      // Der generische Vertrag dazu steht in Payload 1 (`onboarding_contract`).
      onboarding: buildOnboardingForStructure(einheit?.onboarding_konfiguration),
      // airgap-1.12.0: Update-Lifecycle-Informationen für die MBK.
      // Effektive Strategie = override (Export-Center) > Strategie (Fachschaftsleitung).
      update_strategy: nullable(einheit?.update_strategy),
      update_strategy_override: nullable(einheit?.update_strategy_override),
      effektive_update_strategy: nullable(
        einheit?.update_strategy_override || einheit?.update_strategy
      ),
      is_update: einheit?.export_published_at ? true : false,
      last_published_at: nullable(einheit?.export_published_at),
    },
    themenfelder: themenfelderOut,
    lernpakete_ohne_themenfeld: orphans.map(renderLernpaketEntry),
    allgemeine_aufgaben: allgemeineAufgabenOut,
    lernpfade,
    // Deduplizierte Bausteine, die im Lernpfad referenziert werden.
    system_bausteine: systemBausteineOut,
    // Konkrete Quell-ID → SCORM-Dateiname-Tabelle. Komplementär zu
    // Payload 1 → scorm_delivery_contract (generische Regel).
    scorm_file_mapping: scormFileMapping,
  };
}

/**
 * Helper: Extrahiert aus einem `scorm_file_mapping`-Array (wie es
 * `buildStructurePayload` liefert) eine Map<refId, string[]>, die die
 * `navigation_context`-Liste pro Quell-ID bereitstellt.
 *
 * Wird vom UI-Layer benötigt, um beim Bauen von Payload 3/4 die `back_targets`
 * jedem Item beizugeben — ohne Cross-Lookup auf das Strukturpayload.
 *
 * Eingang: Array von Mapping-Einträgen mit `source_id` und `navigation_context`.
 *          `kind: 'dashboard'` wird übersprungen (Dashboards sind selbst die
 *          back-targets, sie werden niemals als refId in Payload 3/4 referenziert).
 */
export function extractNavigationContextByRefId(scormFileMapping = []) {
  const m = new Map();
  for (const entry of scormFileMapping) {
    if (!entry || entry.kind === 'dashboard') continue;
    if (!entry.source_id || !Array.isArray(entry.navigation_context)) continue;
    m.set(entry.source_id, entry.navigation_context);
    // Themenfeld-Bündel und Projekt-Bündel werden über die enthaltenen
    // Aufgabe-IDs aufgelöst — diese erben den nav-Context des Bündels.
    if (Array.isArray(entry.contained_aufgabe_ids)) {
      for (const aaId of entry.contained_aufgabe_ids) {
        m.set(aaId, entry.navigation_context);
      }
    }
  }
  return m;
}

// ── 5. Payload 5: Systembaustein-Briefings (airgap-1.6.0) ───────────────────

/**
 * Liefert für einen Lerntyp-Pfad eine kompakte Item-Liste, in der die
 * MBK den Kontext rund um einen Baustein findet (welcher Sektor, welche
 * Geschwister, welche Themenfelder etc.).
 *
 * Output ist bewusst schlank — die ausführliche Lernlandkarte ist Teil
 * des Strukturpayloads (Payload 2). Hier reichen die Header-Felder, damit
 * die MBK pro Baustein × Lerntyp gezielt ein passendes Briefing schreiben
 * kann (z.B. „nenne in der Einführung die drei Themenfelder X, Y, Z").
 */
function summarizeLerntypPfad(sektoren, themenfelderById) {
  return (sektoren || []).map((sektor) => {
    const themenfeldTitel = sektor?.themenfeld_id
      ? nullable(sektor?.titel_snapshot)
        || nullable(themenfelderById.get(sektor.themenfeld_id)?.titel)
      : null;
    return {
      sektor_id: sektor?.sektor_id || null,
      sektor_typ: sektor?.sektor_typ || null,
      sektor_typ_label: getSektorTypLabel(sektor?.sektor_typ),
      titel: nullable(sektor?.titel),
      themenfeld_id: sektor?.themenfeld_id || null,
      themenfeld_titel: themenfeldTitel,
      items: (sektor?.items || []).map((it) => ({
        instance_id: it?.instance_id || null,
        type: it?.type || null,
        ref_id: it?.ref_id || null,
        parent_instance_id: it?.parent_instance_id || null,
      })),
    };
  });
}

/**
 * Payload 5 (Single Item): Briefing für EINEN Baustein × Lerntyp.
 *
 * Enthält:
 *   - GPS (Einheit-Meta, Fach, Jahrgang)
 *   - Lerntyp-Schlüssel
 *   - Baustein-Definition (id, titel, icon, export_instruktion)
 *   - Den vollständigen Lernpfad dieses Lerntyps (alle Sektoren + Items)
 *   - Eine reduzierte Lernlandkarte (Themenfelder + Lernpaket-Titel)
 *
 * Auf Basis dieses Briefings erzeugt die MBK eine HTML-Datei
 * `system-<lerntyp>-<baustein_id>.html`, die im Lernpfad an genau dieser
 * Stelle vom Merger eingehängt wird.
 */
export function buildSystembausteinPayloadItem({
  einheit,
  lerntyp,
  bausteinId,
  systemBaustein,
  lerntypPfad = [],
  themenfelderById = new Map(),
  lernpakete = [],
  lernziele = [],
  navigationContext = [],
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  if (!bausteinId || !lerntyp) return null;

  // Reduzierte Lernlandkarte für Bausteine wie sys_map_full / sys_map_reduced.
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }
  const lernlandkarte = (lernpakete || [])
    .slice()
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
    .map((lp) => ({
      lernpaket_id: lp.id,
      titel: nullable(lp.titel_des_pakets),
      themenfeld_id: lp.themenfeld_id || null,
      themenfeld_titel: lp.themenfeld_id
        ? nullable(themenfelderById.get(lp.themenfeld_id)?.titel)
        : null,
      lernziele: (zieleByPaket.get(lp.id) || []).map((lz) =>
        nullable(lz.formulierung_fachsprache)
      ).filter(Boolean),
    }));

  return {
    meta: makeMeta({
      payloadType: 'mbk_systembaustein_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      nowIso,
    }),
    target: {
      kind: 'systembaustein',
      reference_id: makeSystembausteinReferenceId(lerntyp, bausteinId),
      lerntyp,
      baustein_id: bausteinId,
    },
    gps: {
      fach: nullable(einheit?.fach),
      jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
      titel_einheit: nullable(einheit?.titel_der_einheit),
      gesamtziele: Array.isArray(einheit?.gesamtziele) ? einheit.gesamtziele : [],
    },
    baustein: systemBaustein
      ? {
        baustein_id: bausteinId,
        titel: nullable(systemBaustein.titel),
        icon: nullable(systemBaustein.icon),
        admin_beschreibung: nullable(systemBaustein.admin_beschreibung),
        export_instruktion: nullable(systemBaustein.export_instruktion),
      }
      : {
        baustein_id: bausteinId,
        titel: null,
        icon: null,
        admin_beschreibung: null,
        export_instruktion: null,
      },
    lerntyp_pfad: summarizeLerntypPfad(lerntypPfad, themenfelderById),
    lernlandkarte,
    output_contract: {
      format: 'full_html',
      filename: fnSystemBaustein(bausteinId, lerntyp),
    },
    injection_points: {
      title: nullable(systemBaustein?.titel) || bausteinId,
      back_targets: Array.isArray(navigationContext) ? [...navigationContext].sort() : [fnDashboard(lerntyp)],
    },
  };
}

/**
 * Payload 5 als BUNDLE: alle Baustein × Lerntyp-Briefings einer Einheit.
 *
 * Strikte Regel (Spec): Pro Lerntyp wird nur dann ein Briefing erzeugt,
 * wenn der Baustein im jeweiligen Lernpfad tatsächlich referenziert ist
 * (1:1-Zuordnung Pfad ↔ Briefing ↔ SCORM-Datei).
 */
export function buildSystembausteinPayloadBundle({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  systemBausteine = [],
  navigationContextByRefId = new Map(),
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  const themenfelderById = new Map((themenfelder || []).map((tf) => [tf.id, tf]));
  const bausteinByKey = new Map((systemBausteine || []).map((b) => [b.baustein_id, b]));
  const items = [];

  const navFor = (refId) => {
    const v = navigationContextByRefId?.get
      ? navigationContextByRefId.get(refId)
      : null;
    return Array.isArray(v) ? v : [];
  };

  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    const seenInLerntyp = new Set();
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        if (item?.type !== 'system' || !item?.ref_id) continue;
        // Platzhalter-Bausteine (`sys_platzhalter_*`) sind reine Arbeitshilfen
        // im Lernpfad-Architekt — sie kennzeichnen Drop-Zonen für später noch
        // einzufügende echte Aufgaben/Bündel. Sie dürfen NIEMALS als eigenes
        // KI-Briefing exportiert werden, weil sonst die MBK „Container-Karten"
        // erfindet, die im Schülerpfad gar nicht erscheinen sollen. Konsistent
        // mit dem Filter in summarizeSektor und scormFileMapping.
        if (isPlatzhalterItem(item)) continue;
        if (seenInLerntyp.has(item.ref_id)) continue;
        seenInLerntyp.add(item.ref_id);
        const refId = makeSystembausteinReferenceId(lt, item.ref_id);
        const briefing = buildSystembausteinPayloadItem({
          einheit,
          lerntyp: lt,
          bausteinId: item.ref_id,
          systemBaustein: bausteinByKey.get(item.ref_id) || null,
          lerntypPfad: sektoren,
          themenfelderById,
          lernpakete,
          lernziele,
          navigationContext: navFor(refId),
          systemContextHash,
          uiConfigHash,
          nowIso,
        });
        if (briefing) items.push(briefing);
      }
    }
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_systembaustein_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      itemCount: items.length,
      nowIso,
    }),
    items,
  };
}

// ── 3. Payload 3: Aufgabeninhalte (pro Lernpaket / pro Aufgabe) ─────────────

/**
 * Erzeugt EINEN Item-Eintrag für Payload 3 zu einem Lernpaket.
 * Enthält die vollständigen Aufgabeninhalte (field_values, MasterAufgaben),
 * die für Aktivitäten ohne KI-Modus relevant sind. KI-Aktivitäten werden
 * als kompakte Struktur durchgereicht — ihr eigentliches Briefing landet
 * in Payload 4.
 */
export function buildTaskContentItemForLernpaket({
  lernpaket,
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  masterAufgaben = [],
  navigationContext = [],
}) {
  // MasterAufgaben pro activity_id gruppieren.
  const masterByActivity = new Map();
  for (const m of masterAufgaben || []) {
    if (!m?.activity_id) continue;
    if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
    masterByActivity.get(m.activity_id).push(m);
  }

  const renderMaster = (m) => ({
    master_id: m.id,
    titel: nullable(m.titel),
    reihenfolge: m.reihenfolge ?? null,
    field_values: m.field_values && typeof m.field_values === 'object' ? m.field_values : {},
    content_status: nullable(m.content_status),
  });

  const renderActivity = (pa) => {
    const katalog = katalogById?.get(pa?.aktivitaet_id) || null;
    const masters = (masterByActivity.get(pa.id) || [])
      .slice()
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(renderMaster);

    return {
      activity_id: pa.id,
      aktivitaet_name: nullable(katalog?.name),
      aktivitaet_katalog_id: pa.aktivitaet_id || null,
      phase: nullable(pa.phase),
      reihenfolge: pa.reihenfolge ?? null,
      erstellungs_modus: pa.erstellungs_modus || 'manuell',
      // airgap-1.9.0: Master-Anzeige-Modus (shuffle/alle). Steuert, wie mehrere
      // MasterAufgaben dieser Aktivität dem Schüler präsentiert werden. Siehe
      // master_anzeige_modus_contract in Payload 1. Default 'shuffle'.
      master_anzeige_modus: (pa.master_anzeige_modus === 'alle' || pa.master_anzeige_modus === 'shuffle')
        ? pa.master_anzeige_modus
        : 'shuffle',
      // KI-Aktivitäten: Inhalte stehen im Briefing → hier nur Hinweis-Felder.
      // Manuelle Aktivitäten: vollständige field_values + MasterAufgaben.
      field_values: pa.erstellungs_modus === 'ki'
        ? null
        : (pa.field_values && typeof pa.field_values === 'object' ? pa.field_values : {}),
      master_aufgaben: pa.erstellungs_modus === 'ki' ? [] : masters,
      // AP2 §1.4: Transkript ist Top-Level — gehört zu Inhalten, nicht Briefing.
      transkript: nullable(pa.transkript),
      alt_text: nullable(pa.alt_text),
      content_status: nullable(pa.content_status),
    };
  };

  const phasenSorted = [...(phaseAktivitaeten || [])].sort(
    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
  );

  // Liste der KI-Aktivitäten, an deren Position die Hülle Platzhalter
  // (`<div data-mbk-placeholder="activity" data-activity-id="...">`) setzen
  // muss. Reine UUID-Liste — die MBK weiß so, wo der Merger Fragmente
  // einsetzen wird.
  const placeholderActivityIds = phasenSorted
    .filter((pa) => pa?.erstellungs_modus === 'ki')
    .map((pa) => pa.id);

  return {
    item_type: 'lernpaket',
    reference_id: lernpaket?.id || null,
    titel: nullable(lernpaket?.titel_des_pakets),
    themenfeld_id: lernpaket?.themenfeld_id || null,
    reihenfolge_nummer: lernpaket?.reihenfolge_nummer ?? null,
    geschaetzte_dauer_minuten: lernpaket?.geschaetzte_dauer_minuten ?? null,
    kernbegriffe: Array.isArray(lernpaket?.kernbegriffe) ? lernpaket.kernbegriffe.filter(Boolean) : [],
    lernziele: (lernziele || []).map((lz) => ({
      lernziel_id: lz.id || null,
      formulierung_fachsprache: nullable(lz.formulierung_fachsprache),
      kategorie: nullable(lz.kategorie),
      schueler_uebersetzung: nullable(lz.schueler_uebersetzung),
    })),
    aktivitaeten: phasenSorted.map(renderActivity),
    placeholder_activity_ids: placeholderActivityIds,
    // airgap-1.4.0: Reine Metadaten, die MBK kombiniert sie mit
    // ui_default_header_html aus Payload 1 zu Header/Footer.
    injection_points: {
      title: nullable(lernpaket?.titel_des_pakets),
      back_targets: Array.isArray(navigationContext) ? [...navigationContext].sort() : [],
    },
  };
}

/**
 * Erzeugt EINEN Item-Eintrag für Payload 3 zu einer AllgemeineAufgabe
 * (Ebene 2 oder 3). Im KI-Modus reichen wir nur Header + Briefing-Marker
 * durch — das eigentliche Briefing kommt in Payload 4.
 */
export function buildTaskContentItemForAllgemeineAufgabe({ aufgabe, navigationContext = [] }) {
  const istKi = aufgabe?.erstellungs_modus === 'ki';
  return {
    item_type: 'allgemeine_aufgabe',
    reference_id: aufgabe?.id || null,
    titel: nullable(aufgabe?.titel),
    anforderungsebene: nullable(aufgabe?.anforderungsebene),
    aufgaben_typ: nullable(aufgabe?.aufgaben_typ),
    aufgabentyp_projekt: nullable(aufgabe?.aufgabentyp_projekt),
    mission_type: nullable(aufgabe?.mission_type),
    schwierigkeitsgrad: aufgabe?.schwierigkeitsgrad ?? null,
    themenfeld_id: aufgabe?.themenfeld_id || null,
    erstellungs_modus: istKi ? 'ki' : 'manuell',

    // Manueller Modus: alle Inhalte. KI-Modus: null (kommt aus Payload 4).
    aufgabenstellung: istKi ? null : nullable(aufgabe?.aufgabenstellung),
    aufgaben_bild_url: istKi ? null : nullable(aufgabe?.aufgaben_bild_url),
    materialien: istKi ? [] : (Array.isArray(aufgabe?.materialien) ? aufgabe.materialien : []),
    erwartungshorizont: istKi ? null : nullable(aufgabe?.erwartungshorizont),
    musterloesung: istKi ? null : nullable(aufgabe?.musterloesung),

    // Abgabe-Spezifikation (auch im KI-Modus relevant für die MBK).
    ergebnis_form: nullable(aufgabe?.ergebnis_form),
    ergebnis_dateiformat: nullable(aufgabe?.ergebnis_dateiformat),
    output_formats: Array.isArray(aufgabe?.output_formats) ? aufgabe.output_formats : [],
    custom_format: nullable(aufgabe?.custom_format),
    quality_focus: nullable(aufgabe?.quality_focus),
    rubric_criteria: Array.isArray(aufgabe?.rubric_criteria) ? aufgabe.rubric_criteria : [],

    // Brian-Dialog (durchgereicht).
    brian_dialog: (aufgabe?.brian_dialog_name || aufgabe?.brian_learner_instruction || aufgabe?.brian_system_instruction || aufgabe?.brian_completion_rule)
      ? {
        dialog_name: nullable(aufgabe?.brian_dialog_name),
        learner_instruction: nullable(aufgabe?.brian_learner_instruction),
        system_instruction: nullable(aufgabe?.brian_system_instruction),
        completion_rule: nullable(aufgabe?.brian_completion_rule),
      }
      : null,

    alt_text: nullable(aufgabe?.alt_text),
    // airgap-1.4.0: Metadaten für Header/Footer-Injection.
    injection_points: {
      title: nullable(aufgabe?.titel),
      back_targets: Array.isArray(navigationContext) ? [...navigationContext].sort() : [],
    },
  };
}

/**
 * Payload 3 als BUNDLE: alle Task-Content-Items einer Einheit in einem Array.
 * Pro Item kann der UI-Layer alternativ `buildTaskContentItemFor*` einzeln
 * aufrufen und den Item-Eintrag direkt persistieren.
 */
export function buildTaskContentBundle({
  einheit,
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  masterAufgaben = [],
  allgemeineAufgabenEbene23 = [],
  // airgap-1.4.0: Map<refId, string[]> mit Dashboard-Filenames pro Item.
  // Wird typischerweise aus dem `navigation_context` der Payload-2-Einträge
  // abgeleitet (siehe buildStructurePayload). Default = leere Map → keine
  // back_targets.
  navigationContextByRefId = new Map(),
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  // Nach Lernpaket gruppieren.
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }
  const phasenByPaket = new Map();
  for (const pa of phaseAktivitaeten) {
    if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
    phasenByPaket.get(pa.lernpaket_id).push(pa);
  }
  const masterByPaket = new Map();
  for (const m of masterAufgaben) {
    if (!masterByPaket.has(m.lernpaket_id)) masterByPaket.set(m.lernpaket_id, []);
    masterByPaket.get(m.lernpaket_id).push(m);
  }

  const navFor = (refId) => {
    const v = navigationContextByRefId?.get
      ? navigationContextByRefId.get(refId)
      : null;
    return Array.isArray(v) ? v : [];
  };

  const lernpaketItems = (lernpakete || [])
    .slice()
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
    .map((lp) =>
      buildTaskContentItemForLernpaket({
        lernpaket: lp,
        lernziele: zieleByPaket.get(lp.id) || [],
        phaseAktivitaeten: phasenByPaket.get(lp.id) || [],
        katalogById,
        masterAufgaben: masterByPaket.get(lp.id) || [],
        navigationContext: navFor(lp.id),
      })
    );

  const aufgabeItems = (allgemeineAufgabenEbene23 || []).map((aa) =>
    buildTaskContentItemForAllgemeineAufgabe({
      aufgabe: aa,
      navigationContext: navFor(aa.id),
    })
  );

  const items = [...lernpaketItems, ...aufgabeItems];

  return {
    meta: makeMeta({
      payloadType: 'mbk_task_content_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      itemCount: items.length,
      nowIso,
    }),
    items,
  };
}

// ── 4. Payload 4: Micro-Briefings (pro KI-Aktivität / pro KI-Aufgabe) ───────

/**
 * GPS-Block: positioniert die Aktivität/Aufgabe im didaktischen Kontext der
 * Einheit (Themenfeld → Lernpaket → Phase → Position-in-Phase).
 * Wird vom MBK-Brief als „Standortbestimmung" gelesen.
 */
function buildGpsForActivity({ einheit, aktivitaet, lernpaket, themenfeld, phaseAktivitaetenInPaket = [] }) {
  // Position innerhalb der Phase berechnen.
  const samePhase = phaseAktivitaetenInPaket
    .filter((pa) => pa.phase === aktivitaet?.phase)
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
  const positionInPhase = samePhase.findIndex((pa) => pa.id === aktivitaet?.id);

  return {
    fach: nullable(einheit?.fach),
    jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
    titel_einheit: nullable(einheit?.titel_der_einheit),
    themenfeld: themenfeld
      ? {
        themenfeld_id: themenfeld.id,
        titel: nullable(themenfeld.titel),
      }
      : null,
    lernpaket: lernpaket
      ? {
        lernpaket_id: lernpaket.id,
        titel: nullable(lernpaket.titel_des_pakets),
      }
      : null,
    phase: aktivitaet?.phase
      ? {
        name: aktivitaet.phase,
        position: positionInPhase >= 0 ? positionInPhase + 1 : null,
        total_in_phase: samePhase.length || null,
        ist_letztes_element_der_phase: positionInPhase >= 0 && positionInPhase === samePhase.length - 1,
      }
      : null,
  };
}

/**
 * Payload 4: Micro-Briefing für EINE LernpaketPhaseAktivitaet im KI-Modus.
 *
 * Liefert `null`, wenn die Aktivität nicht im KI-Modus ist — Aufrufer können
 * sich darauf verlassen, dass jedes nicht-null-Ergebnis ein vollständiges
 * Micro-Briefing ist.
 */
export function buildMicroPayloadForActivity({
  einheit,
  aktivitaet,
  lernpaket,
  themenfeld = null,
  phaseAktivitaetenInPaket = [],
  lernziele = [],
  katalogById = new Map(),
  masterAufgabenForActivity = [],
  navigationContext = [],
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  if (!aktivitaet) return null;
  const istOffene = isOffeneAufgabeActivity(aktivitaet, katalogById);
  // Ein Micro-Briefing wird erzeugt, wenn die Aktivität entweder explizit
  // im KI-Modus läuft oder strukturell eine "Offene Aufgabe" ist.
  if (aktivitaet.erstellungs_modus !== 'ki' && !istOffene) return null;

  const katalog = katalogById?.get(aktivitaet.aktivitaet_id) || null;

  // Briefing-Auflösung:
  //   - KI-Modus: explizites ki_briefing-Objekt (Standard- oder Offen-Variante)
  //   - Offene Aufgabe: aus field_values.description bzw. den
  //     MasterAufgaben.field_values.description ein virtuelles
  //     "offen"-Briefing zusammensetzen, damit die MBK genau weiß, wie
  //     die Aufgabe zu erzeugen ist.
  let briefing = null;
  if (aktivitaet.ki_briefing && typeof aktivitaet.ki_briefing === 'object') {
    briefing = aktivitaet.ki_briefing;
  } else if (istOffene) {
    const fvDescription = nullable(aktivitaet?.field_values?.description);
    const masterDescriptions = (masterAufgabenForActivity || [])
      .slice()
      .sort((a, b) => (a?.reihenfolge || 0) - (b?.reihenfolge || 0))
      .map((m) => nullable(m?.field_values?.description))
      .filter(Boolean);
    const funktionsweise = fvDescription
      || masterDescriptions[0]
      || null;
    briefing = {
      variant: 'offen',
      offen: {
        lernziel: null,
        funktionsweise,
        visuelle_vorlage: null,
      },
      // Liste aller Master-Varianten als Zusatzkontext, falls die
      // Lehrkraft mehrere Master-Varianten gepflegt hat.
      master_descriptions: masterDescriptions,
    };
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_micro_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      nowIso,
    }),
    target: {
      kind: 'activity',
      reference_id: aktivitaet.id,
      aktivitaet_name: nullable(katalog?.name),
      aktivitaet_katalog_id: aktivitaet.aktivitaet_id || null,
    },
    gps: buildGpsForActivity({
      einheit,
      aktivitaet,
      lernpaket,
      themenfeld,
      phaseAktivitaetenInPaket,
    }),
    zieloptik: {
      lernziele: (lernziele || []).map((lz) => nullable(lz.formulierung_fachsprache)).filter(Boolean),
      kernbegriffe: Array.isArray(lernpaket?.kernbegriffe) ? lernpaket.kernbegriffe.filter(Boolean) : [],
    },
    source_of_truth: {
      transkript: nullable(aktivitaet.transkript),
      // Field-values einer KI-Aktivität enthalten typischerweise nur die
      // Quell-URL (bei Medien) bzw. nichts. Wir reichen sie vollständig durch,
      // damit die MBK z. B. die Video-URL kennt, ohne sie aus Payload 3 zu
      // kreuzen.
      field_values: aktivitaet.field_values && typeof aktivitaet.field_values === 'object'
        ? aktivitaet.field_values
        : {},
    },
    blueprint: {
      ki_briefing: briefing,
    },
    output_contract: {
      format: 'fragment',
      filename: fnFragment(aktivitaet.id),
      placeholder_target: lernpaket?.id ? fnLernpaket(lernpaket.id) : null,
      marker_format:
        '<!-- mbk:fragment activity-id="{{id}}" system-context-hash="{{hash}}" -->'
        + '...HTML...'
        + '<!-- /mbk:fragment -->',
    },
    // airgap-1.4.0: Fragmente erben den nav-Context ihrer Hülle (= Lernpaket).
    injection_points: {
      title: nullable(lernpaket?.titel_des_pakets),
      back_targets: Array.isArray(navigationContext) ? [...navigationContext].sort() : [],
    },
  };
}

/**
 * Payload 4: Micro-Briefing für EINE AllgemeineAufgabe im KI-Modus.
 * Liefert `null`, wenn die Aufgabe nicht im KI-Modus ist.
 */
export function buildMicroPayloadForAllgemeineAufgabe({
  einheit,
  aufgabe,
  themenfeld = null,
  navigationContext = [],
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  if (!aufgabe || aufgabe.erstellungs_modus !== 'ki') return null;

  const briefing = aufgabe.ki_briefing && typeof aufgabe.ki_briefing === 'object'
    ? aufgabe.ki_briefing
    : null;

  // Placeholder-Target ist das Bündel, in das die Aufgabe später eingewoben
  // wird: Ebene-3-/Projekt-Anker → Projekt-Bündel; sonst das Themenfeld-
  // Bündel (oder Orphan, wenn kein TF gesetzt ist).
  const istEbene3 = aufgabe.anforderungsebene === '3 - Projekt';
  const istProjektAnker = aufgabe.aufgaben_typ === 'projekt_anker';
  let placeholderTarget = null;
  if ((istEbene3 || istProjektAnker) && einheit?.id) {
    placeholderTarget = fnProjektBundle(einheit.id);
  } else if (themenfeld?.id) {
    placeholderTarget = fnThemenfeldBundle(themenfeld.id);
  } else {
    placeholderTarget = fnThemenfeldBundleOrphan();
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_micro_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      nowIso,
    }),
    target: {
      kind: 'allgemeine_aufgabe',
      reference_id: aufgabe.id,
      titel: nullable(aufgabe.titel),
      anforderungsebene: nullable(aufgabe.anforderungsebene),
      aufgaben_typ: nullable(aufgabe.aufgaben_typ),
    },
    gps: {
      fach: nullable(einheit?.fach),
      jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
      titel_einheit: nullable(einheit?.titel_der_einheit),
      themenfeld: themenfeld
        ? { themenfeld_id: themenfeld.id, titel: nullable(themenfeld.titel) }
        : null,
      lernpaket: null,
      phase: null,
    },
    zieloptik: {
      lernziele: [],
      kernbegriffe: [],
    },
    source_of_truth: {
      transkript: null,
      field_values: {},
    },
    blueprint: {
      ki_briefing: briefing,
    },
    output_contract: {
      format: 'fragment',
      filename: fnFragment(aufgabe.id),
      placeholder_target: placeholderTarget,
      marker_format:
        '<!-- mbk:fragment activity-id="{{id}}" system-context-hash="{{hash}}" -->'
        + '...HTML...'
        + '<!-- /mbk:fragment -->',
    },
    // airgap-1.4.0: Metadaten für Header/Footer-Injection.
    injection_points: {
      title: nullable(aufgabe?.titel),
      back_targets: Array.isArray(navigationContext) ? [...navigationContext].sort() : [],
    },
  };
}

/**
 * Payload 4 als BUNDLE: alle Micro-Briefings einer Einheit (filter:
 * erstellungs_modus === 'ki') in einem Array.
 */
export function buildMicroPayloadBundle({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  phaseAktivitaeten = [],
  katalogById = new Map(),
  masterAufgaben = [],
  allgemeineAufgaben = [],
  // airgap-1.4.0: siehe buildTaskContentBundle. Map<refId, string[]>.
  // KI-Aktivitäten erben über lernpaket_id den Context ihres Lernpakets;
  // KI-AllgemeineAufgaben verwenden ihre eigene aufgabe_id.
  navigationContextByRefId = new Map(),
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  const themenfeldById = new Map((themenfelder || []).map((tf) => [tf.id, tf]));
  const lernpaketById = new Map((lernpakete || []).map((lp) => [lp.id, lp]));
  const phasenByPaket = new Map();
  for (const pa of phaseAktivitaeten) {
    if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
    phasenByPaket.get(pa.lernpaket_id).push(pa);
  }
  const zieleByPaket = new Map();
  for (const lz of lernziele) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }
  // MasterAufgaben pro activity_id gruppieren — für offene Aufgaben, deren
  // didaktischer Inhalt häufig nicht direkt auf der Aktivität, sondern in
  // den zugehörigen MasterAufgaben (field_values.description) liegt.
  const masterByActivity = new Map();
  for (const m of masterAufgaben) {
    if (!m?.activity_id) continue;
    if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
    masterByActivity.get(m.activity_id).push(m);
  }

  const navFor = (refId) => {
    const v = navigationContextByRefId?.get
      ? navigationContextByRefId.get(refId)
      : null;
    return Array.isArray(v) ? v : [];
  };

  const items = [];

  // KI-Aktivitäten + offene Aufgaben aus Lernpaketen.
  for (const pa of phaseAktivitaeten) {
    if (!isMicroBriefingActivity(pa, katalogById)) continue;
    const lp = lernpaketById.get(pa.lernpaket_id) || null;
    const tf = lp?.themenfeld_id ? themenfeldById.get(lp.themenfeld_id) || null : null;
    const item = buildMicroPayloadForActivity({
      einheit,
      aktivitaet: pa,
      lernpaket: lp,
      themenfeld: tf,
      phaseAktivitaetenInPaket: phasenByPaket.get(pa.lernpaket_id) || [],
      lernziele: zieleByPaket.get(pa.lernpaket_id) || [],
      katalogById,
      masterAufgabenForActivity: masterByActivity.get(pa.id) || [],
      // Fragment erbt nav-Context von der Hülle (= Lernpaket).
      navigationContext: lp ? navFor(lp.id) : [],
      systemContextHash,
      uiConfigHash,
      nowIso,
    });
    if (item) items.push(item);
  }

  // KI-AllgemeineAufgaben.
  for (const aa of allgemeineAufgaben || []) {
    if (aa.erstellungs_modus !== 'ki') continue;
    const tf = aa.themenfeld_id ? themenfeldById.get(aa.themenfeld_id) || null : null;
    const item = buildMicroPayloadForAllgemeineAufgabe({
      einheit,
      aufgabe: aa,
      themenfeld: tf,
      navigationContext: navFor(aa.id),
      systemContextHash,
      uiConfigHash,
      nowIso,
    });
    if (item) items.push(item);
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_micro_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      itemCount: items.length,
      nowIso,
    }),
    items,
  };
}