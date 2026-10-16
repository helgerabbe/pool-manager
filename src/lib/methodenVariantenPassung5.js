// Passung je Variante (2026-10-16), Teil 5: Erarbeitung & Strukturieren, Block 1.
// Reihenfolge der Werte: induktiv offen/gelenkt/gestuft/kompakt, deduktiv darbietend/lösungsbeispiel/material/kompakt,
// vertieft problemlösend/gestaltend/erkundend/perspektivisch, wiederholung kurz/umfassend.
const K = ['induktiv_offen', 'induktiv_gelenkt', 'induktiv_gestuft', 'induktiv_kompakt', 'deduktiv_darbietend', 'deduktiv_loesungsbeispiel', 'deduktiv_material', 'deduktiv_kompakt', 'vertieft_problemloesend', 'vertieft_gestaltend', 'vertieft_erkundend', 'vertieft_perspektivisch', 'wiederholung_kurz', 'wiederholung_umfassend'];
const v = (...werte) => Object.fromEntries(K.map((k, i) => [k, werte[i]]));

export const VARIANTEN_PASSUNG_5 = {
  'Fragend-entwickelndes Unterrichtsgespräch': v(
    [4, 'Lenkt zu stark für offenes Entdecken.'], [1, 'Leitfragen führen Schritt für Schritt zur Regel.'], [2, 'Fragen als gestufte Impulse.'], [1, 'Schnellster Weg zur gemeinsamen Erkenntnis.'],
    [2, 'Klärt die eingeführte Regel im Gespräch.'], [2, 'Das Lösungsbeispiel wird gemeinsam besprochen.'], [2, 'Sicherung nach der Materialarbeit.'], [1, 'Kurz und gut steuerbar.'],
    [3, 'Höchstens zum Klären des Auftrags.'], [4, 'Kaum Bezug zum Produkt.'], [3, 'Zum Planen der Untersuchung.'], [4, 'Lenkt Positionen zu stark.'],
    [1, 'Schnelles Reaktivieren mit gezielten Fragen.'], [2, 'Strukturiert die Wiederholung im Plenum.']),
  'Merksatz formulieren': v(
    [2, 'Abschluss der Entdeckung: die Regel in eigenen Worten.'], [1, 'Der Merksatz ist das Ziel der gelenkten Erarbeitung.'], [1, 'Schrittweise zum eigenen Merksatz.'], [1, 'Knappes Sichern der Regel.'],
    [2, 'Regel in eigenen Worten wiedergeben.'], [2, 'Aus dem Beispiel die Regel ableiten.'], [1, 'Ergebnis der Materialarbeit festhalten.'], [2, 'Kurzes Sichern.'],
    [4, 'Wenig Bezug zum Fall.'], [4, 'Trägt kein Produkt.'], [3, 'Ergebnis der Untersuchung formulieren.'], [5, 'Kein Bezug.'],
    [2, 'Merksätze aus dem Gedächtnis aufschreiben.'], [1, 'Merksätze der Einheit sammeln und prüfen.']),
  'Concept Mapping': v(
    [3, 'Ordnet Beobachtungen, ersetzt aber nicht das Entdecken.'], [3, 'Zum Sichern der Zusammenhänge.'], [2, 'Begriffe nach und nach ergänzen.'], [4, 'Braucht zu viel Zeit.'],
    [3, 'Ordnet das Neue in Bekanntes ein.'], [4, 'Wenig Bezug zum Lösungsbeispiel.'], [2, 'Material in eine Struktur bringen.'], [5, 'Zu aufwendig.'],
    [3, 'Zusammenhänge des Falls ordnen.'], [2, 'Die Map als Teamprodukt.'], [3, 'Ergebnisse strukturieren.'], [3, 'Positionen und Argumente verknüpfen.'],
    [3, 'Für kurze Wiederholung zu aufwendig.'], [1, 'Zeigt Zusammenhänge und Lücken der ganzen Einheit.']),
  'Strukturlegetechnik': v(
    [3, 'Begriffe ordnen kann Zusammenhänge entdecken lassen.'], [2, 'Gelenkt mit vorgegebenen Karten.'], [2, 'Karten nacheinander legen.'], [3, 'Mit wenigen Karten möglich.'],
    [3, 'Sichert die eingeführte Struktur.'], [4, 'Kaum Bezug.'], [2, 'Material in eine Struktur legen.'], [4, 'Kostet zu viel Zeit.'],
    [3, 'Ordnet die Elemente des Falls.'], [3, 'Legebild als Produkt.'], [3, 'Ergebnisse ordnen.'], [3, 'Argumente gegenüberstellen.'],
    [2, 'Begriffe schnell wieder ordnen.'], [1, 'Ordnet die zentralen Begriffe der Einheit.']),
  'Objekt-Analyse': v(
    [1, 'Ein Gegenstand als Phänomen, das selbst erkundet wird.'], [2, 'Mit Beobachtungsfragen gut lenkbar.'], [2, 'Beobachtungsaufträge als Stufen.'], [3, 'Möglich mit einem klaren Auftrag.'],
    [3, 'Als Anschauung zur Regel.'], [4, 'Kaum Bezug.'], [2, 'Das Objekt ist das Material.'], [4, 'Zu aufwendig.'],
    [2, 'Das Objekt stellt den Fall.'], [3, 'Kann zu einem Produkt anregen.'], [1, 'Untersuchen ist der Kern.'], [3, 'Objekt aus verschiedenen Blickwinkeln.'],
    [4, 'Kaum Wiederholungscharakter.'], [3, 'Als Transfer an einem neuen Objekt.']),
  'Mystery / Rätsel': v(
    [1, 'Rätselhafte Frage, die eigene Lösungswege verlangt.'], [2, 'Mit Hinweisen gut lenkbar.'], [2, 'Infokarten in Stufen ausgeben.'], [4, 'Braucht deutlich mehr Zeit.'],
    [4, 'Gibt die Lösung zu früh vor.'], [4, 'Kaum Bezug.'], [2, 'Die Infokarten sind das Material.'], [5, 'Zu aufwendig.'],
    [1, 'Ideal: Teams lösen ein komplexes Rätsel.'], [3, 'Lösung als Schaubild darstellen.'], [2, 'Zusammenhänge untersuchen.'], [3, 'Verschiedene Erklärungen abwägen.'],
    [4, 'Zu aufwendig.'], [2, 'Wissen der Einheit verknüpfen.']),
  'Fallstudie': v(
    [2, 'Ein realer Fall als Phänomen.'], [3, 'Mit Leitfragen lenkbar.'], [3, 'Fallmaterial in Stufen.'], [5, 'Zu aufwendig.'],
    [3, 'Anwendung der Regel am Fall.'], [3, 'Ein gelöster Fall als Beispiel.'], [2, 'Fallmaterial erschließen.'], [5, 'Zu aufwendig.'],
    [1, 'Teams analysieren und lösen den Fall.'], [3, 'Lösungsvorschlag als Produkt.'], [2, 'Den Fall untersuchen.'], [2, 'Beteiligte Perspektiven abwägen.'],
    [4, 'Zu aufwendig.'], [2, 'Transfer am neuen Fall.']),
  'Schülerexperiment': v(
    [1, 'Eigenes Experimentieren führt zur Entdeckung.'], [1, 'Vermutung prüfen mit angeleitetem Versuch.'], [2, 'Versuchsanleitung in Stufen.'], [3, 'Nur mit einfachem Versuch.'],
    [3, 'Bestätigt die eingeführte Regel.'], [3, 'Versuch nach Musterprotokoll.'], [3, 'Versuch als Material.'], [4, 'Zu aufwendig.'],
    [2, 'Experiment zur Lösung eines Problems.'], [3, 'Versuchsaufbau als Produkt.'], [1, 'Untersuchung selbst planen und durchführen.'], [4, 'Kaum Bezug.'],
    [4, 'Zu aufwendig.'], [3, 'Als Transferversuch.']),
  'Textknacken / Markieren': v(
    [4, 'Wenig Entdeckung, eher Erschließung.'], [3, 'Markierauftrag lenkt auf das Wesentliche.'], [2, 'Text abschnittsweise erschließen.'], [3, 'Mit kurzem Text möglich.'],
    [3, 'Regel im Text wiederfinden.'], [3, 'Lösungsbeispiel genau lesen.'], [1, 'Kernmethode zum Erschließen von Material.'], [3, 'Kurzer Text, schneller Auftrag.'],
    [3, 'Fallmaterial erschließen.'], [3, 'Inhalte für das Produkt sammeln.'], [3, 'Quellen auswerten.'], [3, 'Positionen im Text finden.'],
    [3, 'Bekannten Text erneut markieren.'], [2, 'Kerntexte der Einheit erneut erschließen.']),
  'Insert-Methode': v(
    [4, 'Erschließung statt Entdeckung.'], [3, 'Symbole lenken das Lesen.'], [2, 'Symbole zeigen, wo Hilfe nötig ist.'], [3, 'Mit kurzem Text möglich.'],
    [3, 'Neue Informationen mit Vorwissen abgleichen.'], [4, 'Kaum Bezug.'], [1, 'Material aktiv mit Vorwissen abgleichen.'], [3, 'Nur bei kurzem Text.'],
    [3, 'Fallmaterial erschließen.'], [4, 'Wenig Bezug zum Produkt.'], [3, 'Quellen auswerten.'], [3, 'Zustimmung und Widerspruch markieren.'],
    [3, 'Zeigt schnell, was bekannt ist.'], [2, 'Bekanntes und Neues in der Einheit trennen.']),
};