/**
 * dashboardTemplates.js
 *
 * Statisches Template-Repository für das Magic-Raster (Phase 2).
 *
 * Dieses Modul ist die Single Source of Truth für die didaktischen
 * V1-Standardvorlagen pro Lerntyp. Die Templates dienen später als
 * Blaupause, die in eine leere `lernpfade_konfiguration` geladen werden
 * kann (Phase 3 / 4). Sie enthalten ausschließlich System-Bausteine –
 * inhaltliche Aufgaben (`type: 'aufgabe'`) werden NIE hartcodiert,
 * sondern müssen von der Lehrkraft per Drag & Drop aus dem Pool ergänzt
 * werden. Stellen, an denen später eine echte Aufgabe rein muss, werden
 * mit Platzhalter-Bausteinen (`sys_platzhalter_*`) markiert.
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
 * - Jeder Schlüssel hält ein Array von Sektor-Objekten.
 * - Sektor: { sektor_id: string, titel: string, modus: 'sequenziell'|'frei',
 *   items: Array<{ type: 'system', ref_id: string }> }
 * - sektor_id ist im Template statisch (Präfix `tpl_`), wird beim
 *   Anwenden des Templates in eine UUID umgeschrieben (Phase 3).
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

// ── Helper: System-Item bauen ───────────────────────────────────────────
// Kleiner Builder, der Tippfehler im `type`-Feld ausschließt und die
// Templates unten lesbarer macht.
const sys = (refId) => ({ type: ITEM_TYPE.SYSTEM, ref_id: refId });

// Die in den Templates verwendeten Baustein-IDs. Werden in Phase 1 vom
// `seedSystemBausteine`-Endpoint angelegt; sind hier nur als Konstanten
// gespiegelt, damit sich Tippfehler statisch finden lassen.
const B = Object.freeze({
  diagnose: 'sys_diagnose',
  landkarte: 'sys_landkarte',
  lehrerCheck: 'sys_lehrer_check',
  zwischentest: 'sys_zwischentest',
  // Platzhalter (Phase 1)
  pHandlung: 'sys_platzhalter_handlung',
  pBasispaket: 'sys_platzhalter_basispaket',
  pEbene2: 'sys_platzhalter_ebene2',
  pProjekt: 'sys_platzhalter_projekt',
});

// ── Template: Minimalist ────────────────────────────────────────────────
// Fokus: kleinschrittig, viel Handlung. Wenige Sektoren, niedrige
// kognitive Eintrittshürde.
const MINIMALIST = [
  {
    sektor_id: 'tpl_min_sec1',
    titel: 'Start: Einstieg & erste Handlung',
    modus: 'sequenziell',
    items: [sys(B.diagnose), sys(B.pHandlung)],
  },
  {
    sektor_id: 'tpl_min_sec2',
    titel: 'Inhalt: Grundlagen festigen',
    modus: 'sequenziell',
    items: [sys(B.pEbene2), sys(B.pBasispaket), sys(B.lehrerCheck)],
  },
];

// ── Template: Pragmatiker ───────────────────────────────────────────────
// Fokus: Effizienz, Fast-Track. Klarer Zielpfad mit Diagnose,
// Schnellüberblick, Übungs-Cluster und Zwischentest.
const PRAGMATIKER = [
  {
    sektor_id: 'tpl_prag_sec1',
    titel: 'Start: Diagnose & Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.diagnose), sys(B.landkarte)],
  },
  {
    sektor_id: 'tpl_prag_sec2',
    titel: 'Grundlagen: Fast-Track',
    modus: 'sequenziell',
    items: [sys(B.pBasispaket), sys(B.lehrerCheck)],
  },
  {
    sektor_id: 'tpl_prag_sec3',
    titel: 'Training: 3 Inhaltsaufgaben (Ebene 2)',
    modus: 'frei',
    items: [sys(B.pEbene2), sys(B.pEbene2), sys(B.pEbene2)],
  },
  {
    sektor_id: 'tpl_prag_sec4',
    titel: 'Abschluss: Zwischentest',
    modus: 'sequenziell',
    items: [sys(B.zwischentest)],
  },
];

// ── Template: Ehrgeizig ─────────────────────────────────────────────────
// Fokus: Tiefe, Umfang, Prüfungsvorbereitung. Mehr Übungsaufgaben als
// Pragmatiker, expliziter Vorbereitungssektor.
//
// Hinweis zum letzten Sektor: Für die "Vorbereitung auf die schriftliche
// Arbeit" gibt es (noch) keinen eigenen System-Baustein. Wir verwenden
// daher den Standard-Platzhalter `sys_platzhalter_ebene2`. Eine
// Titel-Anpassung kann erst beim Anwenden des Templates erfolgen, weil
// System-Bausteine ihren Titel aus der Entität ziehen – Items selbst
// haben kein eigenes Titel-Feld. Das ist als Folgeticket dokumentiert.
const EHRGEIZIG = [
  {
    sektor_id: 'tpl_ehr_sec1',
    titel: 'Start: Diagnose & Lernlandkarte',
    modus: 'sequenziell',
    items: [sys(B.diagnose), sys(B.landkarte)],
  },
  {
    sektor_id: 'tpl_ehr_sec2',
    titel: 'Grundlagen: Fast-Track',
    modus: 'sequenziell',
    items: [sys(B.pBasispaket), sys(B.lehrerCheck)],
  },
  {
    sektor_id: 'tpl_ehr_sec3',
    titel: 'Training: 5 Inhaltsaufgaben (Ebene 2)',
    modus: 'frei',
    items: [
      sys(B.pEbene2),
      sys(B.pEbene2),
      sys(B.pEbene2),
      sys(B.pEbene2),
      sys(B.pEbene2),
    ],
  },
  {
    sektor_id: 'tpl_ehr_sec4',
    titel: 'Prüfungsvorbereitung',
    // Zwischentest + Vorbereitung-Aufgabe (s. Hinweis oben).
    modus: 'sequenziell',
    items: [sys(B.zwischentest), sys(B.pEbene2)],
  },
];

// ── Template: Passioniert ───────────────────────────────────────────────
// Fokus: Autonomie, Projekte. Direkteinstieg in Ebene 2, Basispaket nur
// als Backup, abschließend ein Projekt.
const PASSIONIERT = [
  {
    sektor_id: 'tpl_pass_sec1',
    titel: 'Start: Orientierung & Direkteinstieg',
    modus: 'sequenziell',
    items: [sys(B.landkarte), sys(B.pEbene2)],
  },
  {
    sektor_id: 'tpl_pass_sec2',
    titel: 'Vertiefung: Eigenes Tempo',
    modus: 'frei',
    items: [
      sys(B.pBasispaket),
      sys(B.pEbene2),
      sys(B.pEbene2),
      sys(B.pEbene2),
    ],
  },
  {
    sektor_id: 'tpl_pass_sec3',
    titel: 'Exzellenz: Projekt-Aufgabe',
    modus: 'sequenziell',
    items: [sys(B.pProjekt)],
  },
];

// ── Public API ──────────────────────────────────────────────────────────
export const DASHBOARD_TEMPLATES = Object.freeze({
  minimalist: MINIMALIST,
  pragmatiker: PRAGMATIKER,
  ehrgeizig: EHRGEIZIG,
  passioniert: PASSIONIERT,
});

// Liste der unterstützten Lerntyp-Schlüssel – nützlich für Tests und
// spätere UI-Logik, die über alle Templates iteriert.
export const TEMPLATE_LERN_TYPEN = Object.freeze([
  'minimalist',
  'pragmatiker',
  'ehrgeizig',
  'passioniert',
]);