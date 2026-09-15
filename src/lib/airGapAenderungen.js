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
  version: 'airgap-1.24.0',
  vorherige_version: 'airgap-1.23.0',
  stichpunkte: Object.freeze([
    'Neu: grafik_variante_contract in Payload 1. Eine fertige Aufgabe kann '
    + 'neben ihrer funktionalen Fassung eine rein grafisch aufbereitete tragen. '
    + 'Welche gilt, entscheidet die Lehrkraft mit „Diese Variante jetzt '
    + 'übernehmen" — Inhalt und Bedienung sind in beiden identisch.',
    'Sequenz-Schritt typ="offen": `fragment` enthält jetzt GENAU die '
    + 'übernommene Fassung (vorher immer das funktionale Original, sodass eine '
    + 'übernommene grafische Variante im Kurs nie ankam). Zusätzlich reisen '
    + '`design_variante` ("funktional"|"grafisch") und `design_meta` mit. '
    + 'Baue weiterhin einfach `fragment` — nichts umschalten.',
    'Katalog-Aktivität „Slideshow": `field_values` kann neu '
    + '`design_variante` und `design_polished` enthalten. Bei "grafisch" '
    + 'wende das Design-Objekt auf alle Folien an, bei "funktional" ignoriere '
    + 'es. Die Folieninhalte in `slides` bleiben unverändert.',
  ]),
  /**
   * Beispiel-Payloads zu den Änderungen dieser Version. Leeres Array = diese
   * Version bringt keinen neuen Baustein, nur Feldänderungen.
   */
  beispiele: Object.freeze([
    Object.freeze({
      was: 'Sequenz-Schritt mit typ="offen" und übernommener grafischer Fassung',
      wo: 'Payload 3 (mbk_task_content_payload) → items[].sequenz_schritte[]',
      beispiel: Object.freeze({
        schritt_id: 'a1b2c3',
        reihenfolge: 2,
        typ: 'offen',
        titel: 'Satzglieder bestimmen',
        fragment: '<div class="aufgabe"><style>…</style>…<script>…</script></div>',
        design_variante: 'grafisch',
        design_meta: Object.freeze({
          richtung: 'light',
          erzeugt_am: '2026-09-15T16:40:00.000Z',
          bilder: Object.freeze([]),
        }),
      }),
    }),
    Object.freeze({
      was: 'field_values der Katalog-Aktivität „Slideshow" mit grafischer Fassung',
      wo: 'Payload 3 (mbk_task_content_payload) → items[].aktivitaeten[].field_values',
      beispiel: Object.freeze({
        aufgabentext: 'Schau dir die Folien an und mache dir Notizen.',
        slides: Object.freeze([]),
        design_variante: 'grafisch',
        design_polished: Object.freeze({
          name: 'Ruhiges Tageslicht',
          begruendung: 'Klare Flächen, wenig Ablenkung — passend zum Lesetext.',
          hintergrund: '#f8fafc',
          textfarbe: '#0f172a',
          akzentfarbe: '#2563eb',
          schrift: 'Inter, sans-serif',
        }),
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