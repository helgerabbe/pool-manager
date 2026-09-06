/**
 * mbkLernlandkarteContract.js
 *
 * Was die MBK über die Lernlandkarte wissen muss (airgap-1.20.0).
 *
 * Bis 1.19.0 bekam die MBK für die Karten-Bausteine (sys_map_full,
 * sys_map_reduced) nur eine flache Liste von Lernpaketen mit den
 * Fachsprache-Formulierungen der Lernziele — also NICHT das, was die Karte in
 * der App tatsächlich zeigt: die Leitfrage des Themenfelds, die
 * Schülerübersetzung des Lernziels als Knoten, den Aufgaben-Knoten am
 * Themenfeld und die vierstufige Selbsteinschätzung. Dieser Vertrag beschreibt
 * Aufbau und Verhalten der Karte; die konkreten Knoten liefert das Feld
 * `lernlandkarte` des Systembaustein-Briefings.
 */
export const LERNLANDKARTE_CONTRACT = {
  gilt_fuer: ['sys_map_full', 'sys_map_reduced'],
  was_ist_das:
    'Die Lernlandkarte ist eine explorierbare Karte der Einheit. Sie ist KEINE '
    + 'Liste und kein Baumdiagramm mit allen Ebenen gleichzeitig, sondern eine '
    + 'Fokus-Ansicht: Der angetippte Knoten steht in der Mitte, seine '
    + 'Unterknoten legen sich als Kreis darum, der übergeordnete Knoten sitzt '
    + 'links daneben. Getippt wird sich Schritt für Schritt hinein und wieder '
    + 'heraus.',
  knotenarten: {
    einheit: 'Wurzelknoten mit dem Titel der Einheit.',
    themenfeld:
      'Ein Knoten pro Themenfeld. Beschriftung ist die LEITFRAGE des '
      + 'Themenfelds (Feld `leitfrage`); fehlt sie, der Titel.',
    lernziel:
      'Ein Knoten pro Lernziel, hängt am Themenfeld. Beschriftung ist die '
      + 'SCHÜLERÜBERSETZUNG (`schueler_leitfrage`); fehlt sie, die '
      + 'Fachsprache-Formulierung. Aus dem Knoten heraus gibt es einen Knopf '
      + 'zum Wissensspeicher (Kompaktwissen) des zugehörigen Lernpakets.',
    aufgaben:
      'EIN Sammelknoten pro Themenfeld („Zu den Aufgaben"), der die allgemeinen '
      + 'Aufgaben dieses Themenfelds bündelt — Aufgaben hängen bewusst am '
      + 'Themenfeld, nicht am einzelnen Lernziel, weil sie mehrere Lernziele '
      + 'gleichzeitig betreffen können.',
    vorwissen:
      'Optionaler Rückwärtsknoten an der Wurzel mit den verknüpften '
      + 'Basispaketen (nur eine Ebene tief), jeweils mit Sprung in deren '
      + 'Wissensspeicher.',
  },
  selbsteinschaetzung: {
    gilt_fuer: 'sys_map_full',
    beschreibung:
      'Am Lernziel-Knoten schätzt sich der Schüler selbst ein. Vier Stufen von '
      + 'rot nach grün. Kein Eintrag = noch nicht eingeschätzt. Die Einschätzung '
      + 'wird pro Schüler × Lernziel dauerhaft gespeichert und ist jederzeit '
      + 'änderbar.',
    stufen: [
      { wert: 'schwierig', label: 'Kein Plan' },
      { wert: 'unsicher', label: 'Ein bisschen verstanden' },
      { wert: 'teilweise', label: 'Kann das meiste' },
      { wert: 'sicher', label: 'Kann ich' },
    ],
  },
  hinweis_fuer_mbk:
    'Baue die Karte aus dem Feld `lernlandkarte` dieses Briefings — es enthält '
    + 'genau die Knoten in der richtigen Ordnung. Erfinde keine zusätzlichen '
    + 'Ebenen und ziehe die Aufgaben nicht an die Lernziele.',
};