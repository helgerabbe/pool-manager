/**
 * airGapTaskItemSubLabel.js
 *
 * Hilfs-Funktionen, die für Tab "Aufgaben" (Payload 3) ein aussagekräftiges
 * subLabel und einen KI-Hinweis pro Item berechnen.
 *
 * Hintergrund: Im UI stand früher unter dem Lernpaket-Titel nur erneut
 * "Lernpaket" — redundant. Der Operator möchte stattdessen sehen, welche
 * Art von Aktivitäten in der Aufgabe stecken (z. B. "Lückentext", "Offene
 * Aufgabe") und ob die Aufgabe später noch von der KI erstellt wird.
 *
 * Wichtig: Wir berühren weder das Datenmodell noch den Payload-Builder.
 * Diese Helfer sind reine UI-Aufbereitung.
 */

import { isOffeneAufgabeActivity } from '@/lib/mbkAirGapPayloads';

/**
 * Liefert für ein Lernpaket eine kompakte Aktivitäts-Liste (Reihenfolge
 * stabil) als Strings wie "Lückentext", "🤖 Miniquiz (KI)".
 */
export function describeLernpaketActivities({ phaseAktivitaetenInPaket = [], katalogById = new Map() }) {
  return [...(phaseAktivitaetenInPaket || [])]
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
    .map((pa) => {
      const katalog = katalogById.get(pa.aktivitaet_id);
      const baseName = katalog?.name || 'Aktivität';
      const istOffene = isOffeneAufgabeActivity(pa, katalogById);
      const istKi = pa.erstellungs_modus === 'ki' || istOffene;
      return {
        id: pa.id,
        name: baseName,
        istKi,
        istOffene,
      };
    });
}

/**
 * Berechnet das subLabel + den KI-Hinweis für ein Lernpaket-Item.
 *
 * Regeln:
 *   - Liste aller Aktivitäts-Namen, KI-Aktivitäten mit 🤖-Präfix.
 *   - Ist KEINE manuelle Aktivität enthalten (alle KI/offen)?
 *     → starker Hinweis: das Lernpaket wird vollständig durch die KI gebaut.
 *   - Mischfall (manuell + KI):
 *     → schwächerer Hinweis: einzelne Aktivitäten kommen von der KI.
 */
export function buildLernpaketSubLabel({ phaseAktivitaetenInPaket, katalogById }) {
  const acts = describeLernpaketActivities({ phaseAktivitaetenInPaket, katalogById });
  if (acts.length === 0) {
    return {
      text: 'Keine Aktivitäten',
      kiHint: null,
      kiSeverity: 'none',
    };
  }
  const text = acts
    .map((a) => (a.istKi ? `🤖 ${a.name}` : a.name))
    .join(' · ');

  const kiCount = acts.filter((a) => a.istKi).length;
  if (kiCount === 0) {
    return { text, kiHint: null, kiSeverity: 'none' };
  }
  if (kiCount === acts.length) {
    return {
      text,
      kiHint: 'Alle Aktivitäten werden später durch die KI erstellt.',
      kiSeverity: 'full',
    };
  }
  return {
    text,
    kiHint: `${kiCount} von ${acts.length} Aktivitäten werden später durch die KI erstellt.`,
    kiSeverity: 'partial',
  };
}

/**
 * subLabel + KI-Hinweis für eine AllgemeineAufgabe (Ebene 2 / 3).
 */
const AUFGABEN_TYP_LABELS = {
  inhalt: 'Inhaltsaufgabe',
  buendel: 'Bündel-Aufgabe',
  prozess: 'Prozess-Aufgabe',
  projekt_anker: 'Projekt-Anker',
  handlung: 'Handlungs-Aufgabe',
  auswahl_buendel: 'Auswahl-Bündel',
};

export function buildAllgemeineAufgabeSubLabel(aa) {
  const ebene = aa?.anforderungsebene || '—';
  const typLabel = AUFGABEN_TYP_LABELS[aa?.aufgaben_typ] || 'Allgemeine Aufgabe';
  const text = `${ebene} · ${typLabel}`;
  if (aa?.erstellungs_modus === 'ki') {
    return {
      text: `🤖 ${text}`,
      kiHint: 'Diese Aufgabe wird später durch die KI erstellt.',
      kiSeverity: 'full',
    };
  }
  return { text, kiHint: null, kiSeverity: 'none' };
}