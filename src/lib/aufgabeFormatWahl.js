/**
 * lib/aufgabeFormatWahl.js
 * ────────────────────────
 * Übersetzt die Entscheidung des Aufgaben-Assistenten in einen echten Schritt.
 *
 * Der Assistent kennt drei Ausgänge, und alle drei enden in einem Schritt, den
 * die Lehrkraft danach im gewohnten Fenster füllt:
 *
 *   katalog  → Katalog-Schritt mit der Aktivität; rechts steht deren Vorschau,
 *              links das Formular des Formats.
 *   galerie  → OFFENER Schritt, dessen Fragment mit der neutralisierten Vorlage
 *              vorbelegt ist. Rechts sieht die Lehrkraft also sofort, wie das
 *              Format aussieht, und sagt links, was inhaltlich hineinsoll — die
 *              KI ersetzt die Platzhalter. Bewusst KEIN Katalog-Schritt: Das
 *              Ergebnis soll ein fertiges HTML-Fragment in der App sein, nicht
 *              ein Auftrag an die MBK.
 *   neu      → leerer offener Schritt; das Format entsteht im Gespräch.
 *
 * `herkunft.format_gewaehlt` hält fest, dass die Formatfrage schon beantwortet
 * ist. Ohne diesen Merker würde das Schritt-Fenster die Formatsuche erneut
 * anzeigen, obwohl die Lehrkraft sie gerade durchlaufen hat.
 */

import { leererSchritt, SCHRITT_TYPEN } from '@/lib/schrittTypen';

export function schrittAusFormatWahl(wahl, idee = '') {
  const plan = { kurzbeschreibung: String(idee || '').trim(), lernziel: '', dauer_minuten: null };

  if (wahl?.art === 'katalog') {
    const s = leererSchritt(SCHRITT_TYPEN.KATALOG);
    return {
      ...s,
      titel: wahl.name || '',
      plan,
      aktivitaet_id: wahl.aktivitaet_id,
      herkunft: { quelle: 'katalog', vorlage_id: wahl.aktivitaet_id, format_gewaehlt: true },
    };
  }

  if (wahl?.art === 'galerie') {
    const s = leererSchritt(SCHRITT_TYPEN.OFFEN);
    return {
      ...s,
      titel: wahl.name || '',
      plan,
      offen: { ...(s.offen || {}), fragment: wahl.fragment || '' },
      herkunft: { quelle: 'galerie', vorlage_id: wahl.format_id, format_gewaehlt: true },
    };
  }

  const s = leererSchritt(SCHRITT_TYPEN.OFFEN);
  return {
    ...s,
    plan,
    herkunft: { quelle: 'neu', format_gewaehlt: true },
  };
}