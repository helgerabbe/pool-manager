// Didaktisches Grundmodell (Entwurf 2026-10-05): Stundenmodelle mit ihren Phasen.
export const STUNDEN_MODELLE = [
  { key: 'induktiv', name: 'Induktive Erarbeitung', phasen: ['Problem/Phänomen begegnen', 'Beobachten & erkunden', 'Vermutungen bilden', 'Vermutungen prüfen', 'Regel formulieren', 'Anwenden & sichern', 'Rückblick Erkenntnisweg'] },
  { key: 'deduktiv', name: 'Deduktive Erarbeitung', phasen: ['Vorwissen aktivieren / Ausgangsfrage', 'Regel einführen', 'Verstehen & klären', 'Angeleitetes Anwenden', 'Selbstständiger Transfer', 'Ergebnis sichern'] },
  { key: 'uebung_kurz', name: 'Individuelle Übung · kurz', phasen: ['Übungsfokus klären', 'Individuell üben', 'Lernstand kurz prüfen'] },
  { key: 'uebung_mittel', name: 'Individuelle Übung · mittel', phasen: ['Übungsfokus klären', 'Individuelle Arbeitsphase', 'Rückmeldung / Selbstkontrolle', 'Nächste Schritte'] },
  { key: 'uebung_lang', name: 'Individuelle Übung · lang', phasen: ['Arbeitsplan & Orientierung', 'Längere Übungszeit', 'Kontrolle & Korrektur', 'Abschlussbilanz'] },
  { key: 'wiederholung', name: 'Wiederholung', phasen: ['Vorwissen reaktivieren', 'Lücken bestimmen', 'Wiederholen & üben', 'Sicherheit überprüfen', 'Weiterführende Aufgabe', 'Abschlussreflexion'] },
  { key: 'vertieft', name: 'Vertiefte Übung', phasen: ['Aufgabe & Ziel klären', 'Problem erschließen', 'Lösungsideen entwickeln', 'Produkt erstellen', 'Vergleichen & präsentieren', 'Transfer reflektieren'] },
  { key: 'diagnose_kurz', name: 'Diagnose · kurz', phasen: ['Anlass & Kriterien klären', 'Lernstand erheben', 'Rückmelden / einordnen'] },
  { key: 'diagnose_mittel', name: 'Diagnose · mittel', phasen: ['Kriterien transparent machen', 'Lernstand erheben', 'Auswerten', 'Nächste Schritte'] },
  { key: 'diagnose_lang', name: 'Diagnose · lang', phasen: ['Ziel & Kriterien klären', 'Nachweise sammeln', 'Auswerten', 'Konsequenzen festlegen'] },
];

// 1 = passt hervorragend … 5 = passt nicht
export const PASSUNG = {
  1: { label: 'Passt hervorragend', cls: 'bg-green-600 text-white' },
  2: { label: 'Passt gut', cls: 'bg-green-200 text-green-900' },
  3: { label: 'Kann passen', cls: 'bg-yellow-200 text-yellow-900' },
  4: { label: 'Eher unpassend', cls: 'bg-orange-200 text-orange-900' },
  5: { label: 'Passt nicht', cls: 'bg-red-200 text-red-900' },
};

export const BEITRAG = { kern: 'Kernbeitrag', teil: 'Teilbeitrag', bedingt: 'Bedingt' };

// Probe-Einordnung, Schlüssel = Methodenname. phasen: { Phasenname: beitrag }
export const EINORDNUNG_PROBE = {
  'Informierender Unterrichtseinstieg': {
    induktiv: { passung: 3, phasen: { 'Problem/Phänomen begegnen': 'bedingt' }, hinweis: 'Nur den Ablauf erklären, die Erkenntnis nicht vorwegnehmen. Der Überraschungsmoment hat Vorrang.' },
    deduktiv: { passung: 2, phasen: { 'Vorwissen aktivieren / Ausgangsfrage': 'kern' }, hinweis: 'Ziel, Regel und Ablauf einordnen.' },
    uebung_kurz: { passung: 3, phasen: { 'Übungsfokus klären': 'teil' }, hinweis: 'Eine knappe Zielklärung reicht.' },
    uebung_mittel: { passung: 2, phasen: { 'Übungsfokus klären': 'kern' }, hinweis: 'Aufgabenfolge, Wahlmöglichkeiten und Kontrollwege erklären.' },
    uebung_lang: { passung: 1, phasen: { 'Arbeitsplan & Orientierung': 'kern' }, hinweis: 'Bei Stationenlernen fast notwendig: Stationen, Zeit, Wechsel, Material, Ergebnis.' },
    wiederholung: { passung: 3, phasen: { 'Vorwissen reaktivieren': 'teil' }, hinweis: 'Sinnvoll bei Wahlaufgaben oder besonderem Ablauf.' },
    vertieft: { passung: 2, phasen: { 'Aufgabe & Ziel klären': 'teil' }, hinweis: 'Klärt Produkt und Zusammenarbeit, ersetzt aber nicht die Erschließung des Problems.' },
    diagnose_kurz: { passung: 2, phasen: { 'Anlass & Kriterien klären': 'kern' }, hinweis: 'Transparent machen, was erhoben wird und wozu.' },
    diagnose_mittel: { passung: 1, phasen: { 'Kriterien transparent machen': 'kern' }, hinweis: 'Ablauf und Kriterien erklären, ohne Lösungen vorwegzunehmen.' },
    diagnose_lang: { passung: 1, phasen: { 'Ziel & Kriterien klären': 'kern' }, hinweis: 'Bei mehreren Teilen oder Stationen fast notwendig.' },
  },
  'Stummer Impuls': {
    induktiv: { passung: 1, phasen: { 'Problem/Phänomen begegnen': 'kern', 'Beobachten & erkunden': 'teil', 'Vermutungen bilden': 'bedingt' }, hinweis: 'Idealer überraschender Ausgangspunkt. Das Erkunden deckt er nur ab, wenn gezielte Beobachtungsaufträge folgen.' },
    deduktiv: { passung: 3, phasen: { 'Vorwissen aktivieren / Ausgangsfrage': 'teil' }, hinweis: 'Kann eine Leitfrage aufwerfen. Weniger passend, wenn die Stunde mit einer klaren Erklärung beginnt.' },
    uebung_kurz: { passung: 4, phasen: { 'Übungsfokus klären': 'bedingt' }, hinweis: 'Höchstens als sehr kurzer Erinnerungsreiz, sonst kostet er Übungszeit.' },
    uebung_mittel: { passung: 4, phasen: { 'Übungsfokus klären': 'bedingt' }, hinweis: 'Kann einen thematischen Rahmen setzen, ist aber kein Teil des Übens.' },
    uebung_lang: { passung: 3, phasen: { 'Arbeitsplan & Orientierung': 'bedingt' }, hinweis: 'Kann eine Anwendungssituation eröffnen, ersetzt aber nicht die Erklärung des Ablaufs.' },
    wiederholung: { passung: 2, phasen: { 'Vorwissen reaktivieren': 'kern', 'Lücken bestimmen': 'teil' }, hinweis: 'Macht sichtbar, was erinnert wird und was unklar ist.' },
    vertieft: { passung: 2, phasen: { 'Aufgabe & Ziel klären': 'teil', 'Problem erschließen': 'teil' }, hinweis: 'Eröffnet einen Fall oder Konflikt als Ausgangspunkt für Teamarbeit.' },
    diagnose_kurz: { passung: 3, phasen: { 'Lernstand erheben': 'bedingt' }, hinweis: 'Nur mit klarer Frage und nachvollziehbaren Kriterien als Diagnoseaufgabe nutzbar.' },
    diagnose_mittel: { passung: 3, phasen: { 'Lernstand erheben': 'bedingt' }, hinweis: 'Als gemeinsamer Ausgangsreiz für eine Erhebung möglich.' },
    diagnose_lang: { passung: 4, phasen: { 'Nachweise sammeln': 'bedingt' }, hinweis: 'Trägt eine umfassende Evaluation kaum, allenfalls als Einstieg in eine Teilaufgabe.' },
  },
};