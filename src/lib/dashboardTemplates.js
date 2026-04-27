/**
 * dashboardTemplates.js
 *
 * Single Source of Truth für die didaktischen V2-Standardvorlagen pro
 * Lerntyp ("Dashboards V2"). Wird vom Cockpit per
 * `applyDashboardTemplate` in `lernpfade_konfiguration` geschrieben.
 *
 * Versionierung:
 * - Diese Datei ist Teil des Quellcodes (kein DB-State). Änderungen an
 *   den Templates werden über git versioniert. Das pädagogische Team
 *   kann die Reihenfolge, Modi oder enthaltenen Bausteine direkt hier
 *   feintunen, ohne dass die Frontend-Logik mitziehen muss.
 *
 * Format-Vertrag (validiert durch dashboardTemplates.test.js):
 * - DASHBOARD_TEMPLATES ist ein Objekt mit den vier Lerntyp-Schlüsseln
 *   `minimalist`, `pragmatiker`, `ehrgeizig`, `passioniert`.
 *   (Schlüssel sind bewusst die im restlichen System genutzten Keys –
 *   DB-Konfigurationen, UI-Tabs und Hooks setzen darauf auf.)
 * - Jeder Schlüssel hält ein Array von Sektor-Objekten.
 * - Sektor: { sektor_id: string, titel: string, modus: 'sequenziell'|'frei',
 *   items: Array<{ type: 'system', ref_id: string }> }
 * - sektor_id ist im Template statisch (Präfix `tpl_`), wird beim
 *   Anwenden des Templates in eine UUID umgeschrieben.
 *
 * WICHTIG (Legacy-Support):
 * - Der alte Baustein `sys_landkarte` ist in V2 entfernt. Bestehende
 *   Pfade von Lehrkräften, die `sys_landkarte` enthalten, werden NICHT
 *   verändert – nur das Einspielen neuer Templates ersetzt ihn durch
 *   `sys_map_reduced` bzw. `sys_map_full`. Siehe `applyDashboardTemplate`.
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

// ── Helper ──────────────────────────────────────────────────────────────
const sys = (refId) => ({ type: ITEM_TYPE.SYSTEM, ref_id: refId });

// Spiegel-Konstanten der genutzten System-Bausteine (Tippfehler-Schutz).
const B = Object.freeze({
  // Sektion 0
  sec0Overview: 'sys_sec0_overview',
  sec0Qblock: 'sys_sec0_qblock',
  diagnoseEntry: 'sys_diagnose_entry',
  // Karte
  mapReduced: 'sys_map_reduced',
  mapFull: 'sys_map_full',
  // Stoppschild & Tests
  lehrerCheck: 'sys_lehrer_check',
  zwischentest: 'sys_zwischentest',
  examRegister: 'sys_exam_register',
  externalTest: 'sys_external_test',
  // Platzhalter
  pInfo: 'sys_platzhalter_info',
  pHandlung: 'sys_platzhalter_handlung',
  pMoodleBuendel: 'sys_platzhalter_moodle_buendel',
  pZwischentest: 'sys_platzhalter_zwischentest',
  pBrianBuendel: 'sys_platzhalter_brian_buendel',
  pProjekt: 'sys_platzhalter_projekt',
  // Phase 2: Projektaufgaben-Bündel (1:n-Container) – ersetzt im Ehrgeizig-/
  // Passioniert-Template den alten 1:1-Platzhalter `sys_platzhalter_projekt`.
  projektBuendel: 'sys_projektbuendel',
});

// ── Template: Minimalist ────────────────────────────────────────────────
// Alle Sektoren initial 'sequenziell'.
//
// Aufbau (V2.1):
//   Sektor 0  – Orientierung   : Einführung, Freiwilliger Frageblock, Einstiegsdiagnose
//   Sektor 1  – Lernlandkarte  : nur die verringerte Karte
//   Sektor 2  – Erarbeitung    : Einführung, ggf. Handlung, Lernpaket-Platzhalter
//   Sektor 3  – Zwischentest   : Einstiegsseite, Zwischentest-Platzhalter
const MINIMALIST = [
  {
    sektor_id: 'tpl_min_sec0',
    titel: 'Orientierung',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.sec0Qblock), sys(B.diagnoseEntry)],
  },
  {
    sektor_id: 'tpl_min_sec1',
    titel: 'Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.mapReduced)],
  },
  {
    sektor_id: 'tpl_min_sec2',
    titel: 'Erste Erarbeitungsphase',
    modus: 'sequenziell',
    items: [sys(B.pInfo), sys(B.pHandlung), sys(B.pMoodleBuendel)],
  },
  {
    sektor_id: 'tpl_min_sec3',
    titel: 'Zwischentest',
    modus: 'sequenziell',
    items: [sys(B.pInfo), sys(B.pZwischentest)],
  },
];

// ── Template: Pragmatiker ───────────────────────────────────────────────
//
// Aufbau (V2.2):
//   Sektor 0  – Orientierung           : Einführung, Frageblock, Einstiegsdiagnose
//   Sektor 1  – Lernlandkarte          : nur die verringerte Karte
//   Sektor 2  – Grundlagen und Training: Einführung, ggf. Handlung,
//                                        Lernpaket-Platzhalter, Brian-Bündel
//   Sektor 3  – Abschlusstest          : externer Test
const PRAGMATIKER = [
  {
    sektor_id: 'tpl_prag_sec0',
    titel: 'Orientierung',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.sec0Qblock), sys(B.diagnoseEntry)],
  },
  {
    sektor_id: 'tpl_prag_sec1',
    titel: 'Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.mapReduced)],
  },
  {
    sektor_id: 'tpl_prag_sec2',
    titel: 'Erarbeitungs- und Trainingsphase',
    modus: 'sequenziell',
    items: [sys(B.pInfo), sys(B.pHandlung), sys(B.pMoodleBuendel), sys(B.pBrianBuendel)],
  },
  {
    sektor_id: 'tpl_prag_sec3',
    titel: 'Abschlusstest',
    modus: 'sequenziell',
    items: [sys(B.externalTest)],
  },
];

// ── Template: Ehrgeizig ─────────────────────────────────────────────────
//
// Aufbau (V2.2):
//   Sektor 0 – Orientierung                       : Einführung, Frageblock, Einstiegsdiagnose
//   Sektor 1 – Einstieg & Anmeldung               : volle Karte + Anmeldung
//   Sektor 2 – Grundlagen und Training            : Info, Handlung, Lernpaket, Brian-Bündel
//   Sektor 3 – Vorbereitung auf die schriftliche
//              Arbeit                             : Zwischenprüfung / Diagnosetest
//   Sektor 4 – Projekt                            : Projekt-Platzhalter
const EHRGEIZIG = [
  {
    sektor_id: 'tpl_ehr_sec0',
    titel: 'Orientierung',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.sec0Qblock), sys(B.diagnoseEntry)],
  },
  {
    sektor_id: 'tpl_ehr_sec1',
    titel: 'Einstieg & Anmeldung',
    modus: 'sequenziell',
    items: [sys(B.mapFull), sys(B.examRegister)],
  },
  {
    sektor_id: 'tpl_ehr_sec2',
    titel: 'Erarbeitungs- und Trainingsphase',
    modus: 'sequenziell',
    items: [sys(B.pInfo), sys(B.pHandlung), sys(B.pMoodleBuendel), sys(B.pBrianBuendel)],
  },
  {
    sektor_id: 'tpl_ehr_sec3',
    titel: 'Vorbereitung auf die schriftliche Arbeit',
    modus: 'sequenziell',
    items: [sys(B.zwischentest)],
  },
  {
    sektor_id: 'tpl_ehr_sec4',
    titel: 'Projekt',
    modus: 'frei',
    items: [sys(B.projektBuendel)],
  },
];

// ── Template: Passioniert ───────────────────────────────────────────────
//
// Aufbau (V2.2):
//   Sektor 0 – Orientierung      : Einführung, Frageblock, Einstiegsdiagnose
//   Sektor 1 – Einstieg & Anmeldung : volle Karte + Anmeldung
//   Sektor 2 – Anwendung & Training : Brian-Bündel
//   Sektor 3 – Projekt           : Projekt-Platzhalter
//   Sektor 4 – Abschlusstest     : externer Test
const PASSIONIERT = [
  {
    sektor_id: 'tpl_pass_sec0',
    titel: 'Orientierung',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.sec0Qblock), sys(B.diagnoseEntry)],
  },
  {
    sektor_id: 'tpl_pass_sec1',
    titel: 'Einstieg & Anmeldung',
    modus: 'frei',
    items: [sys(B.mapFull), sys(B.examRegister)],
  },
  {
    sektor_id: 'tpl_pass_sec2',
    titel: 'Anwendung & Training',
    modus: 'frei',
    items: [sys(B.pBrianBuendel)],
  },
  {
    sektor_id: 'tpl_pass_sec3',
    titel: 'Projekt',
    modus: 'frei',
    items: [sys(B.projektBuendel)],
  },
  {
    sektor_id: 'tpl_pass_sec4',
    titel: 'Abschlusstest',
    modus: 'frei',
    items: [sys(B.externalTest)],
  },
];

// ── Public API ──────────────────────────────────────────────────────────
export const DASHBOARD_TEMPLATES = Object.freeze({
  minimalist: MINIMALIST,
  pragmatiker: PRAGMATIKER,
  ehrgeizig: EHRGEIZIG,
  passioniert: PASSIONIERT,
});

export const TEMPLATE_LERN_TYPEN = Object.freeze([
  'minimalist',
  'pragmatiker',
  'ehrgeizig',
  'passioniert',
]);

/**
 * Legacy-Alias-Tabelle: Bestandseinträge der alten Bezeichner werden
 * beim Einspielen eines V2-Templates auf die neuen IDs gemappt.
 * Greift in `applyDashboardTemplate` für Items, die per Template kommen.
 *
 * Hinweis: Die Konstante wird auch von Tests genutzt.
 *
 * @legacy DO NOT REMOVE without a full data migration.
 * ⚠️  Bestandspfade von Lehrkräften enthalten unter Umständen noch die
 *     alte ID `sys_landkarte`. Der Eintrag wird beim Render NICHT durch
 *     einen Fehler ersetzt – aber das Re-Apply eines V2-Templates erwartet
 *     dieses Mapping, um den Sektor sauber auf `sys_map_reduced`
 *     umzuschreiben. Wer den Alias entfernt, muss vorher per
 *     Daten-Migration alle `lernpfade_konfiguration`-Snapshots in der DB
 *     bereinigen, sonst entstehen "weiße Karten"-Renderings im Schüler-Pfad.
 *     Geplanter Cut-over: nach Sprint H (Big-Bang-Migration der
 *     Bestandspfade), bis dahin BLEIBT diese Map zwingend bestehen.
 */
export const LEGACY_BAUSTEIN_ALIAS = Object.freeze({
  // @legacy V1 → V2: Default-Mapping für die alte, eindeutige Karte.
  // Reduced ist der konservativere Default (V1 hatte nur eine Karte für
  // alle Lerntypen, V2 unterscheidet zwischen reduced und full).
  sys_landkarte: 'sys_map_reduced',
});