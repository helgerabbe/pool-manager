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
  version: 'airgap-1.26.0',
  vorherige_version: 'airgap-1.25.0',
  stichpunkte: Object.freeze([
    'Neuer Aufbau des Lernpakets: Wissensspeicher, Aufgaben, Abschluss. Der '
    + 'Teil „Übung" (Phase `Übung` mit einzelnen Aktivitäten) entfällt. An '
    + 'seine Stelle treten Aufgaben: allgemeine Aufgaben mit `lernpaket_id`. '
    + '„Übung" heißt jetzt „Aufgabe", „Masteraufgabe" heißt „Variante".',
    'Neu: `aufgaben` an jedem Lernpaket in Payload 2 (aufgabe_id, titel, '
    + 'nummer, niveau, pflicht) und `aufgabe_ids` am Lernpaket-Item in '
    + 'Payload 3, jeweils in der Reihenfolge des Lernpakets. Im Kurs stehen '
    + 'die Aufgaben zwischen Wissensspeicher und Abschluss.',
    'Behoben: Aufgaben im Lernpaket reisen jetzt alle mit Inhalt in Payload 3 '
    + '(item_type "allgemeine_aufgabe"). Bisher fehlten dort alle Aufgaben der '
    + 'Ebene 1, also die meisten umgewandelten Übungen; sie standen nur als '
    + 'Kopfzeile in Payload 2.',
    'Geändert: Aufgaben mit `lernpaket_id` gehören zur Datei ihres Lernpakets '
    + '(`task-<lernpaket_id>.html`). Der Mapping-Eintrag kind="lernpaket" '
    + 'nennt sie in `contained_aufgabe_ids`, KI-Aufgaben zusätzlich in '
    + '`placeholder_activity_ids`. Sie stehen nicht mehr im Themenfeld-Bündel. '
    + 'Ein Lernpaket kann jetzt ohne Aktivitäten vorkommen (nur Aufgaben).',
    'An jeder Aufgabe (Payload 2 und 3, bisher nicht angekündigt): `niveau` '
    + '(G = nur Minimalist und Pragmatiker, GE = alle, E = nur Ehrgeizig und '
    + 'Passioniert), `pflicht` (true/false) und `reihenfolge_im_lernpaket`. '
    + '`niveau` ersetzt die Sterne; `schwierigkeitsgrad` ist Altbestand. Baue '
    + 'in jedem Dashboard nur die Aufgaben, deren Niveau zum Lerntyp passt.',
    'Neu: `themenfeld_platz` an der Aufgabe ("einstieg" | "gesamtaufgabe") und '
    + '`plaetze` an jedem Themenfeld in Payload 2 (Aufgaben-IDs je Platz). '
    + 'Diese Aufgaben liegen außerhalb der Lernpakete: der Einstieg vor dem '
    + 'ersten, die Gesamtaufgabe nach dem letzten Lernpaket des Themenfelds. '
    + 'Sie bleiben im Themenfeld-Bündel.',
    'Neu in Payload 3: `sequenz_schritte[i].varianten` an Schritten vom Typ '
    + '"katalog". `field_values` ist Variante 1, `varianten` sind weitere '
    + 'gleichwertige Fassungen. Jeder Schüler bekommt zufällig genau eine; der '
    + 'Fortschritt hängt an der `schritt_id`. Es reisen nur freigegebene '
    + 'Varianten mit. `zufallsauswahl_anzahl` ist Altbestand und immer 0.',
    'Freitextfrage (Schritt-Typ "aufgabe"): neu `aufgabe.bild_url`, ein Bild, '
    + 'das direkt über der Aufgabenstellung steht. `aufgabe.musterloesung` ist '
    + 'bei Texteingabe jetzt Pflicht, auch bei feedback_modus="ki" '
    + '(Grundlage der KI-Rückmeldung).',
    'Neu in Payload 3: `braucht_nacharbeit` an der Aufgabe. true = die '
    + 'Lehrkraft will hier noch nacharbeiten. Rein informativ, kein Grund, die '
    + 'Aufgabe nicht zu bauen.',
    'Ausgeblendete Lernpakete (sync_status "to_delete") reisen in keinem '
    + 'Payload mehr mit, auch nicht ihre Lernziele, Aktivitäten und Aufgaben. '
    + 'Verweise darauf im Arbeitsplan entfallen. Ebenso fehlen die bisherigen '
    + 'Übungs-Aktivitäten, die in Aufgaben umgewandelt wurden. Bitte im Kurs '
    + 'abräumen. Offene Frage an euch: Wie bleibt dabei der Fortschritt der '
    + 'Schüler erhalten?',
    'Abschluss eines Lernpakets: Ohne Abschluss-Element gilt ein Lernpaket als '
    + 'erledigt, wenn alle sichtbaren Pflichtaufgaben bearbeitet sind; ohne '
    + 'Aufgaben sofort. Dieselbe Regel gilt für Projekt-Lernpakete. In '
    + '`master_aufgaben` reisen nur noch freigegebene Varianten mit; die Liste '
    + 'kann kürzer sein als bisher. Jeder Schüler bekommt zufällig eine.',
    'Projektbereich im Arbeitsplan: Die Einträge verweisen jetzt auf die ID '
    + 'des Projekt-Lernpakets, nicht mehr auf die Aufgaben-ID. Alle bisherigen '
    + 'Projektaufgaben liegen in je einem Projekt-Lernpaket (Niveau E); ihre '
    + 'Aufgaben-IDs sind unverändert. Rückmeldungen bitte weiter mit der '
    + 'Aufgaben-ID melden.',
    'Arbeitspläne: Es gibt je Niveau einen Plan. Minimalist ist der '
    + 'Pragmatiker-Plan ohne Kompetenzkarte und Abschlusstest; Passioniert ist '
    + 'die Kopie von Ehrgeizig. Im Export bleiben alle vier Lerntypen '
    + 'enthalten, die Paare haben dieselben Sektor-Kennungen.',
    'Lernziele und Abschluss-Elemente haben kein Niveau und erscheinen bei '
    + 'allen Lerntypen. Wo sie nur für einen Kurs gelten, steht das im Text '
    + '(z. B. „E course: …").',
    'Betroffene Einheiten, bitte neu bauen: „Exploring Australia" (vollständig '
    + 'neu aufgebaut: 21 Lernpakete und 3 Projekte, durchgehend englisch, '
    + 'G-Plan 18 Lernpakete, E-Plan alle), „Kurzgeschichten" und „Kreis und '
    + 'Körper" (alle Übungen in Aufgaben umgewandelt, Kreis-Lernpakete neu '
    + 'aufgebaut).',
  ]),
  /**
   * Beispiel-Payloads zu den Änderungen dieser Version. Leeres Array = diese
   * Version bringt keinen neuen Baustein, nur Feldänderungen.
   */
  beispiele: Object.freeze([
    Object.freeze({
      was: 'Lernpaket mit Aufgaben, Themenfeld mit Gesamtaufgabe',
      wo: 'Payload 2 (mbk_structure_payload) → themenfelder[]',
      beispiel: Object.freeze({
        themenfeld_id: 'tf123',
        art: 'inhalt',
        titel: 'Aboriginal Culture',
        plaetze: Object.freeze({
          einstieg: Object.freeze([]),
          gesamtaufgabe: Object.freeze(['aa900']),
        }),
        lernpakete: Object.freeze([
          Object.freeze({
            lernpaket_id: 'lp456',
            titel: 'Just a rock? Uluru, a sacred place',
            ist_projekt: false,
            aufgaben: Object.freeze([
              Object.freeze({ aufgabe_id: 'aa101', titel: 'Get ready', nummer: 1, niveau: 'GE', pflicht: true }),
              Object.freeze({ aufgabe_id: 'aa104', titel: 'Uluru today', nummer: 2, niveau: 'E', pflicht: true }),
            ]),
          }),
        ]),
      }),
    }),
    Object.freeze({
      was: 'Datei-Zuordnung eines Lernpakets mit Aufgaben',
      wo: 'Payload 2 (mbk_structure_payload) → scorm_file_mapping[]',
      beispiel: Object.freeze({
        kind: 'lernpaket',
        source_id: 'lp456',
        filename: 'task-lp456.html',
        contained_aufgabe_ids: Object.freeze(['aa101', 'aa104']),
        contains_placeholders: false,
        placeholder_activity_ids: Object.freeze([]),
      }),
    }),
    Object.freeze({
      was: 'Element mit Varianten und Freitextfrage mit Bild',
      wo: 'Payload 3 (mbk_task_content_payload) → items[].sequenz_schritte[]',
      beispiel: Object.freeze([
        Object.freeze({
          schritt_id: 's1',
          typ: 'katalog',
          aktivitaet_name: 'Miniquiz',
          field_values: Object.freeze({ hinweis: 'Inhalt der Variante 1' }),
          varianten: Object.freeze([
            Object.freeze({ variante_id: 'v2', field_values: Object.freeze({ hinweis: 'Inhalt der Variante 2' }) }),
          ]),
        }),
        Object.freeze({
          schritt_id: 's2',
          typ: 'aufgabe',
          aufgabe: Object.freeze({
            aufgabenstellung: 'Describe the picture.',
            bild_url: 'https://…/bild.png',
            input_erforderlich: true,
            musterloesung: 'In the picture you can see …',
            feedback_modus: 'ki',
          }),
        }),
      ]),
    }),
  ]),
  hinweis:
    'Diese Liste gilt für den Sprung von vorherige_version auf version. Sie '
    + 'wird zusätzlich als Ticket-Issue (Label ticket + engine) im Repository '
    + 'angekündigt, bevor der erste Export mit der neuen Version rausgeht. '
    + 'Welche Schritt-Typen und Aktivitätsnamen es überhaupt gibt, steht '
    + 'dauerhaft und maschinenlesbar in bausteine/katalog.json.',
});