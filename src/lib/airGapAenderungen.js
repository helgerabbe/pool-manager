/**
 * airGapAenderungen.js
 *
 * Was sich in der AKTUELLEN Air-Gap-Version geändert hat — in einem Satz je
 * Feld, in der Sprache des Kursbaus.
 *
 * Warum das hier steht (Bitte der MBK, 9. September 2026): Der Umbau der
 * Lernlandkarte von einer Liste zu einem Baum hat den Bau angehalten, weil er
 * die Änderung erst mit dem Export selbst erfuhr. Seitdem gilt: Jede
 * strukturelle Änderung wird angekündigt — als Stichpunktliste in `meta`
 * JEDES Payloads (damit der Bau beim ersten Export mit neuer Version selbst
 * darauf hinweisen kann) UND als Ticket-Issue im Repository einen Tag vorher.
 *
 * PFLEGE: Bei jedem Hochzählen von MBK_AIRGAP_VERSION hier `version` mitziehen
 * und die Stichpunkte durch die NEUEN ersetzen — die Liste beschreibt immer
 * genau den Sprung auf die aktuelle Version, nicht die Geschichte.
 */

/* Bewusst OHNE Import von MBK_AIRGAP_VERSION: mbkPayloadBasis liest diese
   Liste, ein Rückimport wäre ein Ringschluss. Version hier mitpflegen. */
export const AIRGAP_AENDERUNGEN = Object.freeze({
  version: 'airgap-1.22.0',
  vorherige_version: 'airgap-1.21.0',
  stichpunkte: Object.freeze([
    'lernpaket_zugang steht jetzt zusätzlich an jedem Lernpaket selbst — als '
    + 'zugang_je_lerntyp (ein Wert pro Intensitätsstufe). Bisher lag der Wert '
    + 'nur am Pfad-Item.',
    'Die Intensitätsstufen-Diagnose im Onboarding liefert ihre Adresse jetzt '
    + 'als url; brian_url bleibt zusätzlich erhalten.',
    'meta.aenderungen ist neu: Jedes Payload nennt hier die Änderungen '
    + 'gegenüber der Vorversion (dieses Feld).',
  ]),
  hinweis:
    'Diese Liste gilt für den Sprung von vorherige_version auf version. Sie '
    + 'wird zusätzlich als Ticket-Issue (Label ticket + engine) im Repository '
    + 'angekündigt, bevor der erste Export mit der neuen Version rausgeht.',
});