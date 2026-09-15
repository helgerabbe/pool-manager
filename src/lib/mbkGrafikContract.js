/**
 * mbkGrafikContract.js
 *
 * Grafische Variante (airgap-1.24.0).
 *
 * Eine fertig gebaute Aufgabe wird im Pool-Manager zuerst FUNKTIONAL gebaut
 * und geprüft. Erst danach darf ein Grafik-Assistent darüber schauen. Das
 * Ergebnis liegt IMMER zusätzlich neben dem Original — die Lehrkraft schaltet
 * mit „Diese Variante jetzt übernehmen" um, welche Fassung gilt.
 *
 * Warum der Bau das wissen muss: Ohne diesen Vertrag käme die aufbereitete
 * Fassung im Kurs nie an — die Lehrkraft sieht in der Vorschau ein schön
 * gestaltetes Ergebnis, im Kurs stünde weiter das nüchterne Original. Genau
 * diese stille Abweichung soll es nicht geben.
 */
export const GRAFIK_VARIANTE_CONTRACT = {
  was_ist_das:
    'Manche Aufgaben tragen neben ihrer funktionalen Fassung eine zweite, rein '
    + 'grafisch aufbereitete Fassung. Inhalt, Felder und Bedienung sind in '
    + 'beiden identisch — unterschiedlich ist nur das Aussehen. Welche Fassung '
    + 'gilt, entscheidet die Lehrkraft; ihre Entscheidung steht im Feld '
    + '`design_variante` ("funktional" oder "grafisch").',

  regel:
    'Ist `design_variante` = "grafisch", baue die aufbereitete Fassung. Sonst '
    + '(oder wenn das Feld fehlt) gilt das funktionale Original. Niemals beide '
    + 'Fassungen ausliefern und den Schülern keine Wahl anbieten — es ist EINE '
    + 'Aufgabe, nur in einem anderen Gewand.',

  wo: {
    offener_schritt:
      'Sequenz-Schritt mit typ="offen": Das Feld `fragment` enthält bereits '
      + 'GENAU die gültige Fassung — der Pool-Manager setzt dort die von der '
      + 'Lehrkraft übernommene Variante ein. `design_variante` sagt nur, '
      + 'welche der beiden es ist (zur Nachvollziehbarkeit), `design_meta` '
      + 'nennt Richtung und Erzeugungszeitpunkt. Du musst NICHTS umschalten: '
      + 'baue `fragment` unverändert.',
    slideshow:
      'Katalog-Aktivität „Slideshow": Die Folieninhalte stehen wie immer in '
      + '`field_values.slides`. Ist `field_values.design_variante` = '
      + '"grafisch", wende zusätzlich das Design-Objekt aus '
      + '`field_values.design_polished` auf ALLE Folien an (Farben, Flächen, '
      + 'Typografie, ggf. Hintergrundbilder). Bei "funktional" ignoriere '
      + '`design_polished` vollständig und nutze den Standard-Look der Vorlagen.',
  },

  design_polished_felder:
    'Das Design-Objekt beschreibt ausschließlich Aussehen — es enthält keine '
    + 'Inhalte. Übliche Schlüssel: name, begruendung, hintergrund, textfarbe, '
    + 'akzentfarbe, schrift, panel, bilder. Unbekannte Schlüssel dürfen '
    + 'ignoriert werden; fehlende Schlüssel fallen auf den Standard zurück.',

  hinweis_fuer_mbk:
    'Die grafische Fassung ist von der Fachgruppe angesehen und bewusst '
    + 'übernommen worden. Sie ist damit genauso verbindlich wie das Original: '
    + 'Aufbau, Felder und Rückmeldelogik bleiben unverändert, angepasst werden '
    + 'darf nur die Einbettung in das Kurs-Layout.',
};