/**
 * mbkDashboardContracts.js
 *
 * Feste, inhalts-UNABHÄNGIGE Verträge zum Verhalten der Dashboards, die in
 * Payload 1 (System-Kontext) an die MBK gehen. Sie erklären zwei Angaben, die
 * pro Lernpfad-Item in Payload 2 mitkommen und ohne Erklärung nicht deutbar
 * sind:
 *
 *   1. `lernpaket_zugang`  — wie ein Lernpaket INNEN benutzt werden darf
 *      (Standard / Fast-Track / Wissensspeicher). Bis airgap-1.20.0 fehlte
 *      diese Angabe im Export vollständig: die Lehrkraft stellt sie pro
 *      Lernpaket im Dashboard ein, der Bau erfuhr davon nichts.
 *   2. `arbeitsauftrag`    — der von der Lehrkraft an DIESER Stelle
 *      hinterlegte Auftrag (z. B. Lehrer-Check, Präsentation, externer Test).
 *
 * Die Texte werden aus den App-Definitionen (lib/lernpaketZugang.js) gebildet,
 * damit Vertrag und tatsächliches Verhalten nicht auseinanderlaufen.
 */

import {
  LERNPAKET_ZUGANG_REIHENFOLGE,
  ZUGANG_DEFAULT_BY_LERNTYP,
  ZUGANG_META,
} from '@/lib/lernpaketZugang';

export const LERNPAKET_ZUGANG_CONTRACT = {
  field: 'lernpaket_zugang',
  applies_to: 'lernpfad_item mit item_kind="lernpaket"',
  was_ist_das:
    'Regelt, wie ein Lernpaket INNEN benutzt werden darf — also welche seiner '
    + 'Elemente (Input, Übung, Abschluss) Pflicht sind und in welcher Freiheit '
    + 'der Schüler sich darin bewegt. Nicht zu verwechseln mit '
    + '`lernpaket_innen_modus` (Reihenfolge der Elemente) und nicht mit dem '
    + 'Sektor-Modus (Reihenfolge der Items im Abschnitt).',
  modi: LERNPAKET_ZUGANG_REIHENFOLGE.reduce((acc, key) => {
    acc[key] = {
      label: ZUGANG_META[key]?.label || key,
      bedeutung: ZUGANG_META[key]?.kurz || null,
    };
    return acc;
  }, {}),
  defaults_pro_intensitaetsstufe: { ...ZUGANG_DEFAULT_BY_LERNTYP },
  hinweis_fuer_mbk:
    'Der Wert in Payload 2 ist immer der EFFEKTIVE Zugang (Vorgabe der '
    + 'Intensitätsstufe, ggf. von der Lehrkraft für dieses Lernpaket '
    + 'überschrieben — der reine Override steht zusätzlich in '
    + '`lernpaket_zugang_override`). Baue das Gating der Lernpaket-Seite genau '
    + 'nach diesem Wert: bei "standard" ist das nächste Element gesperrt, bis '
    + 'das vorige erledigt ist; bei "fast_track" sind Input und Übungen frei '
    + 'zugänglich/überspringbar, der Abschluss aber Pflicht; bei '
    + '"wissensspeicher" ist nichts Pflicht und das Lernpaket jederzeit '
    + 'verlassbar (rein zum Nachschlagen).',
};

export const ITEM_ARBEITSAUFTRAG_CONTRACT = {
  field: 'arbeitsauftrag',
  applies_to: 'lernpfad_item (vor allem Systembausteine)',
  was_ist_das:
    'Ein von der Lehrkraft für GENAU DIESE Stelle im Pfad hinterlegter '
    + 'Arbeitsauftrag. Gepflegt wird er dort, wo die Schüler etwas tun, das '
    + 'nur die Lehrkraft festlegen kann — insbesondere Lehrer-Check, '
    + 'Projektpräsentation und externer Test.',
  hinweis_fuer_mbk:
    'Ist das Feld gefüllt, gib den Text an dieser Stelle 1:1 schülersichtbar '
    + 'aus (nicht umformulieren, nicht kürzen, nicht ergänzen). Ist es null, '
    + 'gibt es an dieser Stelle keinen Auftrag — dann NICHTS erfinden, sondern '
    + 'nur den Inhalt des Bausteins zeigen.',
};