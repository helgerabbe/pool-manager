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
 * BEISPIELE (Bitte des Kursbaus, 10. September 2026): Eine Stichpunktliste
 * sagt, DASS ein Baustein neu ist — nicht, wie er aussieht. Der Bau musste die
 * Form deshalb aus dem ersten Export erraten. Kommt ein neuer Baustein hinzu,
 * gehört ab jetzt ein Beispiel-Payload in `beispiele`.
 *
 * PFLEGE: Bei jedem Hochzählen von MBK_AIRGAP_VERSION hier `version` mitziehen
 * und die Stichpunkte (und Beispiele) durch die NEUEN ersetzen — die Liste
 * beschreibt immer genau den Sprung auf die aktuelle Version, nicht die
 * Geschichte.
 */

/* Bewusst OHNE Import von MBK_AIRGAP_VERSION: mbkPayloadBasis liest diese
   Liste, ein Rückimport wäre ein Ringschluss. Version hier mitpflegen. */
export const AIRGAP_AENDERUNGEN = Object.freeze({
  version: 'airgap-1.25.0',
  vorherige_version: 'airgap-1.24.0',
  stichpunkte: Object.freeze([
    'Neu: `art` an jedem Themenfeld in Payload 2 ("inhalt" | "projekt"). '
    + '"projekt" ist das feste Themenfeld „Projektaufgaben": höchstens eines '
    + 'je Einheit, immer an letzter Stelle. Es ist kein Lernstoff – es steht '
    + 'nicht auf der Lernlandkarte und ist keine Arbeitsphase im Arbeitsplan.',
    'Neu: `ist_projekt` an jedem Lernpaket in Payload 2. true = '
    + 'Projekt-Lernpaket (liegt im Themenfeld „Projektaufgaben"). Es hat kein '
    + 'Kompaktwissen und keine eigenen Lernziele (`lernziele` ist leer); '
    + 'baue dafür keinen Wissensspeicher-Pflichtteil.',
    'Ein Themenfeld „Projektaufgaben" ohne Projekt reist nicht mit. Fehlt in '
    + '`themenfelder` ein Eintrag mit art="projekt", hat die Einheit noch kein '
    + 'Projekt-Lernpaket.',
    'Projektaufgaben (Ebene 3) mit `lernpaket_id` stehen nicht mehr im '
    + 'Projekt-Bündel `projekte-einheit-<einheit_id>.html`. Sie gehören zur '
    + 'Datei ihres Lernpakets: Der Mapping-Eintrag kind="lernpaket" nennt sie '
    + 'in `contained_aufgabe_ids`. Das Projekt-Bündel enthält nur noch '
    + 'Projektaufgaben ohne Lernpaket und entfällt, wenn es keine mehr gibt.',
  ]),
  /**
   * Beispiel-Payloads zu den Änderungen dieser Version. Leeres Array = diese
   * Version bringt keinen neuen Baustein, nur Feldänderungen.
   */
  beispiele: Object.freeze([
    Object.freeze({
      was: 'Themenfeld „Projektaufgaben" mit einem Projekt-Lernpaket',
      wo: 'Payload 2 (mbk_structure_payload) → themenfelder[]',
      beispiel: Object.freeze({
        themenfeld_id: 'tf123',
        art: 'projekt',
        titel: 'Projektaufgaben',
        beschreibung: null,
        leitfrage: null,
        reihenfolge: 9999,
        bearbeitungsmodus: 'offen',
        lernpakete: Object.freeze([
          Object.freeze({
            lernpaket_id: 'lp456',
            titel: 'Eine eigene Kurzgeschichte schreiben',
            themenfeld_id: 'tf123',
            ist_projekt: true,
            lernziele: Object.freeze([]),
            aktivitaeten: Object.freeze([]),
          }),
        ]),
      }),
    }),
  ]),
  hinweis:
    'Diese Liste gilt für den Sprung von vorherige_version auf version. Sie '
    + 'wird zusätzlich als Ticket-Issue (Label ticket + engine) im Repository '
    + 'angekündigt, bevor der erste Export mit der neuen Version rausgeht. '
    + 'Welche Schritt-Typen und Aktivitätsnamen es überhaupt gibt, steht '
    + 'dauerhaft und maschinenlesbar in bausteine/katalog.json.',
});