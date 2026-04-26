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
  // Diagnose & Karte
  diagnose: 'sys_diagnose',
  mapReduced: 'sys_map_reduced',
  mapFull: 'sys_map_full',
  // Stoppschild & Tests
  lehrerCheck: 'sys_lehrer_check',
  zwischentest: 'sys_zwischentest',
  examRegister: 'sys_exam_register',
  // Platzhalter
  pMoodleBuendel: 'sys_platzhalter_moodle_buendel',
  pBrianBuendel: 'sys_platzhalter_brian_buendel',
  pEbene2: 'sys_platzhalter_ebene2',
  pProjekt: 'sys_platzhalter_projekt',
});

// ── Template: Minimalist ────────────────────────────────────────────────
// Alle Sektoren initial 'sequenziell'.
const MINIMALIST = [
  {
    sektor_id: 'tpl_min_sec1',
    titel: '1. Einstieg & Diagnose',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.diagnose)],
  },
  {
    sektor_id: 'tpl_min_sec2',
    titel: '2. Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.mapReduced)],
  },
  {
    sektor_id: 'tpl_min_sec3',
    titel: '3. Erste Erarbeitungsphase',
    modus: 'sequenziell',
    items: [sys(B.pMoodleBuendel), sys(B.lehrerCheck)],
  },
  {
    sektor_id: 'tpl_min_sec4',
    titel: '4. Vertiefung',
    modus: 'sequenziell',
    items: [sys(B.pMoodleBuendel)],
  },
];

// ── Template: Pragmatiker ───────────────────────────────────────────────
const PRAGMATIKER = [
  {
    sektor_id: 'tpl_prag_sec1',
    titel: '1. Einstieg & Diagnose',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.diagnose)],
  },
  {
    sektor_id: 'tpl_prag_sec2',
    titel: '2. Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.mapReduced)],
  },
  {
    sektor_id: 'tpl_prag_sec3',
    titel: '3. Grundlagen',
    modus: 'sequenziell',
    items: [sys(B.pMoodleBuendel), sys(B.lehrerCheck)],
  },
  {
    sektor_id: 'tpl_prag_sec4',
    titel: '4. Anwendung & Training',
    modus: 'frei',
    items: [sys(B.pBrianBuendel)],
  },
  {
    sektor_id: 'tpl_prag_sec5',
    titel: '5. Vertiefung',
    modus: 'sequenziell',
    items: [sys(B.pMoodleBuendel)],
  },
];

// ── Template: Ehrgeizig ─────────────────────────────────────────────────
// Alle Sektoren initial 'sequenziell'.
const EHRGEIZIG = [
  {
    sektor_id: 'tpl_ehr_sec1',
    titel: '1. Einstieg & Diagnose',
    modus: 'sequenziell',
    items: [sys(B.sec0Overview), sys(B.diagnose)],
  },
  {
    sektor_id: 'tpl_ehr_sec2',
    titel: '2. Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.mapFull)],
  },
  {
    sektor_id: 'tpl_ehr_sec3',
    titel: '3. Grundlagen',
    modus: 'sequenziell',
    items: [sys(B.pMoodleBuendel)],
  },
  {
    sektor_id: 'tpl_ehr_sec4',
    titel: '4. Prüfungsvorbereitung',
    modus: 'sequenziell',
    items: [
      sys(B.pMoodleBuendel),
      sys(B.zwischentest),
      sys(B.examRegister),
      sys(B.pProjekt),
    ],
  },
];

// ── Template: Passioniert ───────────────────────────────────────────────
// Alle Sektoren initial 'frei'.
const PASSIONIERT = [
  {
    sektor_id: 'tpl_pass_sec1',
    titel: '1. Lernlandkarte',
    modus: 'frei',
    items: [sys(B.mapFull)],
  },
  {
    sektor_id: 'tpl_pass_sec2',
    titel: '2. Eigenständige Vertiefung',
    modus: 'frei',
    items: [
      sys(B.pMoodleBuendel),
      sys(B.pEbene2),
      sys(B.pEbene2),
      sys(B.pProjekt),
    ],
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
 */
export const LEGACY_BAUSTEIN_ALIAS = Object.freeze({
  // Default-Mapping für die alte, eindeutige Karte: Reduced ist der
  // konservativere Default (V1 hatte nur eine Karte für alle Lerntypen).
  sys_landkarte: 'sys_map_reduced',
});