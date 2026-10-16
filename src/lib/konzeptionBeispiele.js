// Beispielstunden für die Didaktische Konzeption (2026-10-16). Schlüssel = Modell-/Variantenkarte.
// Je Phase: was die Lehrkraft tut (lehrer) und was die Schüler tun (schueler). Bewusst knapp.
export const KONZEPTION_BEISPIELE = {
  induktiv_offen: [
    { fach: 'Mathematik', thema: 'Satz des Pythagoras', idee: 'Die Schüler entdecken selbst, dass a² + b² = c² im rechtwinkligen Dreieck gilt.', phasen: [
      { lehrer: 'Zeigt eine Leiter an der Wand: „Reicht eine 5-m-Leiter bis ans Fenster in 4 m Höhe?“', schueler: 'Schätzen und begründen spontan.' },
      { lehrer: 'Gibt Kästchenpapier mit rechtwinkligen Dreiecken, Quadrate an den Seiten.', schueler: 'Zählen die Kästchen der Quadrate und notieren alles in einer Tabelle.' },
      { lehrer: 'Hält sich zurück, fragt nur: „Fällt euch etwas auf?“', schueler: 'Formulieren Vermutungen zu den Flächen.' },
      { lehrer: 'Gibt nicht-rechtwinklige Dreiecke als Gegenprobe.', schueler: 'Prüfen ihre Vermutung und merken: Gilt nur beim rechten Winkel.' },
      { lehrer: 'Moderiert das Zusammentragen.', schueler: 'Formulieren die Regel in eigenen Worten, dann als Formel.' },
      { lehrer: 'Kommt auf die Leiter zurück.', schueler: 'Lösen das Leiterproblem und zwei weitere Aufgaben.' },
      { lehrer: 'Fragt: „Wie seid ihr auf die Regel gekommen?“', schueler: 'Beschreiben ihren Weg: zählen, vergleichen, prüfen.' },
    ] },
    { fach: 'Deutsch', thema: 'Großschreibung von Nominalisierungen', idee: 'Die Schüler entdecken, dass Verben und Adjektive großgeschrieben werden, wenn ein Begleiter davorsteht.', phasen: [
      { lehrer: 'Zeigt zwei Sätze: „Wir laufen schnell.“ und „Das Laufen macht Spaß.“', schueler: 'Wundern sich: Warum einmal groß, einmal klein?' },
      { lehrer: 'Verteilt 15 gemischte Beispielsätze.', schueler: 'Markieren groß- und kleingeschriebene Verben/Adjektive und sortieren.' },
      { lehrer: 'Fragt nur: „Was steht vor den großgeschriebenen Wörtern?“', schueler: 'Stellen Vermutungen auf (Artikel, Präposition …).' },
      { lehrer: 'Gibt neue Sätze ohne Großbuchstaben.', schueler: 'Wenden ihre Vermutung an und prüfen in Partnerarbeit.' },
      { lehrer: 'Sammelt die Ergebnisse an der Tafel.', schueler: 'Formulieren die Regel: Begleiter davor → groß.' },
      { lehrer: 'Gibt einen kurzen Text zum Korrigieren.', schueler: 'Berichtigen die Fehler mit ihrer Regel.' },
      { lehrer: 'Fragt: „Woran erkennt ihr künftig solche Wörter?“', schueler: 'Nennen ihre Erkennungsprobe (Artikelprobe).' },
    ] },
    { fach: 'Englisch', thema: 'Simple Past regelmäßiger Verben', idee: 'Die Schüler entdecken aus einer Geschichte, wie die Vergangenheit mit -ed gebildet wird.', phasen: [
      { lehrer: 'Erzählt kurz, was sie gestern gemacht hat: „Yesterday I cooked, I played …“', schueler: 'Hören zu und merken: Das klingt anders als sonst.' },
      { lehrer: 'Gibt die Geschichte als Text.', schueler: 'Unterstreichen alle Verben und vergleichen sie mit der Grundform.' },
      { lehrer: 'Fragt: „What do you notice?“', schueler: 'Vermuten: Es kommt -ed dazu.' },
      { lehrer: 'Gibt Verben wie stop, try, live.', schueler: 'Prüfen die Vermutung und entdecken Schreibbesonderheiten.' },
      { lehrer: 'Hält die Ergebnisse fest.', schueler: 'Formulieren die Regel inkl. Sonderfälle.' },
      { lehrer: 'Lässt über das eigene Wochenende schreiben.', schueler: 'Schreiben 5 Sätze im Simple Past.' },
      { lehrer: 'Fragt: „How did you find the rule?“', schueler: 'Beschreiben ihren Weg vom Text zur Regel.' },
    ] },
    { fach: 'Naturwissenschaften', thema: 'Schwimmen und Sinken', idee: 'Die Schüler entdecken, dass nicht das Gewicht, sondern Material und Form entscheiden, ob etwas schwimmt.', phasen: [
      { lehrer: 'Legt einen schweren Holzklotz und eine kleine Münze ins Wasser.', schueler: 'Staunen: Das Schwere schwimmt, das Leichte sinkt.' },
      { lehrer: 'Stellt Wannen und viele Gegenstände bereit.', schueler: 'Testen frei und notieren: schwimmt / sinkt.' },
      { lehrer: 'Fragt nur: „Wovon hängt es ab?“', schueler: 'Stellen Vermutungen auf (Gewicht, Größe, Material).' },
      { lehrer: 'Gibt Knete: einmal als Kugel, einmal als Schiffchen.', schueler: 'Planen eigene Versuche und prüfen ihre Vermutungen.' },
      { lehrer: 'Moderiert den Vergleich der Gruppen.', schueler: 'Formulieren: Material und Form entscheiden, nicht das Gewicht.' },
      { lehrer: 'Fragt: „Warum schwimmt ein Stahlschiff?“', schueler: 'Erklären es mit ihrer Regel.' },
      { lehrer: 'Fragt: „Welcher Versuch hat euch überzeugt?“', schueler: 'Reflektieren, wie sie Vermutungen geprüft haben.' },
    ] },
  ],
  induktiv_gelenkt: [
    { fach: 'Mathematik', thema: 'Satz des Pythagoras', idee: 'Mit Leitfragen kommen die Schüler Schritt für Schritt zu a² + b² = c².', phasen: [
      { lehrer: 'Zeigt die Leiter an der Wand: „Reicht eine 5-m-Leiter bis ans Fenster in 4 m Höhe?“', schueler: 'Schätzen und begründen kurz.' },
      { lehrer: 'Gibt drei rechtwinklige Dreiecke mit Quadraten und Leitfragen: „Zählt die Flächen. Vergleicht die beiden kleinen mit dem großen Quadrat.“', schueler: 'Bearbeiten die Leitfragen und füllen eine vorbereitete Tabelle aus.' },
      { lehrer: 'Fragt: „Was ergibt die Summe der kleinen Flächen?“ und gibt ein stumpfwinkliges Dreieck zum Prüfen.', schueler: 'Vermuten den Zusammenhang und merken: Gilt nur beim rechten Winkel.' },
      { lehrer: 'Gibt die Satzanfänge „Im rechtwinkligen Dreieck gilt …“ vor.', schueler: 'Formulieren die Regel und schreiben die Formel.' },
      { lehrer: 'Kommt auf die Leiter zurück.', schueler: 'Lösen das Leiterproblem und zwei weitere Aufgaben.' },
    ] },
    { fach: 'Deutsch', thema: 'Großschreibung von Nominalisierungen', idee: 'Gezielte Fragen lenken den Blick auf die Begleiter vor dem Wort.', phasen: [
      { lehrer: 'Zeigt: „Wir laufen schnell.“ und „Das Laufen macht Spaß.“', schueler: 'Fragen sich, warum einmal groß, einmal klein.' },
      { lehrer: 'Gibt 8 Sätze mit Leitfrage: „Kreist das Wort ein, das direkt davor steht.“', schueler: 'Markieren die Wörter davor und sortieren sie in Artikel, Präposition, kein Begleiter.' },
      { lehrer: 'Fragt: „Wann steht ein Begleiter davor?“ und gibt zwei Gegenbeispiele.', schueler: 'Vermuten die Regel und prüfen sie an den Gegenbeispielen.' },
      { lehrer: 'Gibt ein Regelgerüst mit Lücken vor.', schueler: 'Ergänzen die Regel: Begleiter davor → groß.' },
      { lehrer: 'Gibt einen kurzen Text zum Korrigieren.', schueler: 'Berichtigen die Fehler mit der Regel.' },
    ] },
    { fach: 'Englisch', thema: 'Simple Past regelmäßiger Verben', idee: 'Leitfragen führen von der Geschichte zur -ed-Regel.', phasen: [
      { lehrer: 'Erzählt: „Yesterday I cooked, I played …“', schueler: 'Hören zu und merken sich Verben.' },
      { lehrer: 'Gibt den Text mit einer Tabelle „today / yesterday“.', schueler: 'Tragen die Verbpaare ein.' },
      { lehrer: 'Fragt: „What changes at the end?“ und gibt stop, try, live.', schueler: 'Vermuten -ed und prüfen die Sonderfälle.' },
      { lehrer: 'Gibt die Regelkarte mit Lücken.', schueler: 'Ergänzen die Regel mit Sonderfällen.' },
      { lehrer: 'Lässt über das Wochenende schreiben.', schueler: 'Schreiben 5 Sätze im Simple Past.' },
    ] },
    { fach: 'Naturwissenschaften', thema: 'Schwimmen und Sinken', idee: 'Gezielte Versuchsaufträge zeigen: Material und Form entscheiden.', phasen: [
      { lehrer: 'Legt Holzklotz und Münze ins Wasser.', schueler: 'Staunen: Das Schwere schwimmt.' },
      { lehrer: 'Gibt Versuchskarten: „Gleich schwer, anderes Material“ und „Gleiches Material, andere Form“.', schueler: 'Führen die Versuche durch und notieren die Ergebnisse.' },
      { lehrer: 'Fragt: „Lag es am Gewicht? Woran dann?“', schueler: 'Vermuten und prüfen mit der Knetkugel und dem Knetschiff.' },
      { lehrer: 'Gibt den Satzanfang „Ob etwas schwimmt, hängt ab von …“', schueler: 'Formulieren die Regel.' },
      { lehrer: 'Fragt: „Warum schwimmt ein Stahlschiff?“', schueler: 'Erklären es mit der Regel.' },
    ] },
  ],
  induktiv_gestuft: [
    { fach: 'Mathematik', thema: 'Satz des Pythagoras', idee: 'Die Schüler messen eigene Dreiecke und sortieren nach jedem Impuls neu.', phasen: [
      { lehrer: 'Lässt jede Gruppe drei Dreiecke zeichnen, eines davon rechtwinklig.', schueler: 'Zeichnen, messen die Seiten und quadrieren sie.' },
      { lehrer: 'Impuls 1: „Vergleicht die Quadrate der Seiten.“', schueler: 'Untersuchen ihre Messwerte, finden noch kein klares Muster.' },
      { lehrer: 'Impuls 2: „Schaut nur die rechtwinkligen Dreiecke an und addiert die zwei kleinen Quadrate.“', schueler: 'Sortieren neu und erkennen: Die Summe passt zum großen Quadrat.' },
      { lehrer: 'Sammelt die Ergebnisse der Gruppen.', schueler: 'Formulieren die Regel und die Formel.' },
      { lehrer: 'Gibt die Leiter-Aufgabe.', schueler: 'Wenden die Regel an.' },
    ] },
    { fach: 'Deutsch', thema: 'Großschreibung von Nominalisierungen', idee: 'Eigene Sätze werden nach jedem Impuls neu untersucht.', phasen: [
      { lehrer: 'Lässt Sätze über Hobbys schreiben (laufen, schwimmen …).', schueler: 'Schreiben 6 Sätze.' },
      { lehrer: 'Impuls 1: „Wo habt ihr das Hobby-Wort großgeschrieben?“', schueler: 'Markieren und sind sich uneinig.' },
      { lehrer: 'Impuls 2: „Prüft, ob ‚das‘, ‚beim‘ oder ‚zum‘ davorsteht.“', schueler: 'Sortieren ihre Sätze neu und erkennen das Muster.' },
      { lehrer: 'Hält die Ergebnisse fest.', schueler: 'Formulieren die Regel.' },
      { lehrer: 'Gibt einen Text zum Korrigieren.', schueler: 'Berichtigen die Fehler, auch in den eigenen Sätzen.' },
    ] },
    { fach: 'Englisch', thema: 'Simple Past regelmäßiger Verben', idee: 'Ein eigener Wochenend-Text wird schrittweise untersucht.', phasen: [
      { lehrer: 'Gibt eine Geschichte mit vielen Vergangenheitsformen.', schueler: 'Lesen und unterstreichen alle Verben.' },
      { lehrer: 'Impuls 1: „Sortiert die Verben nach ihrer Endung.“', schueler: 'Sortieren und finden die -ed-Gruppe.' },
      { lehrer: 'Impuls 2: „Vergleicht stopped, tried, lived mit der Grundform.“', schueler: 'Sortieren neu nach Schreibbesonderheiten.' },
      { lehrer: 'Sammelt die Gruppen an der Tafel.', schueler: 'Formulieren Regel und Sonderfälle.' },
      { lehrer: 'Lässt über das Wochenende schreiben.', schueler: 'Schreiben 5 Sätze im Simple Past.' },
    ] },
    { fach: 'Naturwissenschaften', thema: 'Schwimmen und Sinken', idee: 'Eigene Testergebnisse werden mit neuen Hinweisen neu geordnet.', phasen: [
      { lehrer: 'Stellt Wannen und Gegenstände bereit.', schueler: 'Testen und notieren: schwimmt / sinkt.' },
      { lehrer: 'Impuls 1: „Sortiert nach dem Gewicht.“', schueler: 'Merken: Das Gewicht erklärt es nicht.' },
      { lehrer: 'Impuls 2: „Sortiert nach dem Material und testet die Knete als Kugel und als Schiffchen.“', schueler: 'Sortieren neu und erkennen Material und Form.' },
      { lehrer: 'Moderiert den Vergleich.', schueler: 'Formulieren die Regel.' },
      { lehrer: 'Fragt: „Warum schwimmt ein Stahlschiff?“', schueler: 'Erklären es mit der Regel.' },
    ] },
  ],
  induktiv_kompakt: [
    { fach: 'Mathematik', thema: 'Satz des Pythagoras', idee: 'Zwei klare Beispiele genügen, um den Zusammenhang zu sehen.', phasen: [
      { lehrer: 'Zeigt zwei rechtwinklige Dreiecke (3-4-5 und 6-8-10) mit Flächen der Quadrate.', schueler: 'Vergleichen die Zahlen und entdecken: 9 + 16 = 25.' },
      { lehrer: 'Fragt: „Wie lautet die Regel?“', schueler: 'Formulieren gemeinsam a² + b² = c².' },
      { lehrer: 'Gibt die Leiter-Aufgabe.', schueler: 'Rechnen sie in wenigen Minuten.' },
    ] },
    { fach: 'Deutsch', thema: 'Großschreibung von Nominalisierungen', idee: 'Drei Satzpaare machen die Regel sofort sichtbar.', phasen: [
      { lehrer: 'Zeigt drei Satzpaare wie „wir laufen / das Laufen“.', schueler: 'Vergleichen und finden den Begleiter.' },
      { lehrer: 'Fragt: „Wann schreiben wir groß?“', schueler: 'Formulieren die Regel gemeinsam.' },
      { lehrer: 'Gibt fünf Sätze zum Prüfen.', schueler: 'Entscheiden groß oder klein.' },
    ] },
    { fach: 'Englisch', thema: 'Simple Past regelmäßiger Verben', idee: 'Wenige Verbpaare führen direkt zur -ed-Regel.', phasen: [
      { lehrer: 'Zeigt: play – played, cook – cooked, watch – watched.', schueler: 'Erkennen die Endung -ed.' },
      { lehrer: 'Fragt: „What is the rule?“', schueler: 'Formulieren die Regel gemeinsam.' },
      { lehrer: 'Gibt fünf Verben.', schueler: 'Bilden die Vergangenheit in Sätzen.' },
    ] },
    { fach: 'Naturwissenschaften', thema: 'Schwimmen und Sinken', idee: 'Ein Vergleichsversuch zeigt den entscheidenden Punkt.', phasen: [
      { lehrer: 'Zeigt die Knetkugel (sinkt) und das Knetschiff (schwimmt), gleich schwer.', schueler: 'Vergleichen und erkennen: Die Form entscheidet.' },
      { lehrer: 'Fragt: „Wovon hängt es also ab?“', schueler: 'Formulieren die Regel gemeinsam.' },
      { lehrer: 'Fragt: „Warum schwimmt ein Stahlschiff?“', schueler: 'Erklären es kurz.' },
    ] },
  ],
};