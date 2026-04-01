/**
 * Generiert einen hochstrukturierten System-Prompt für einen KI-Projekt-Coach.
 * Socratic-Coaching für komplexe Projektaufgaben mit Dialog-fokussiertem Ansatz.
 */
export function generateInteractiveProjectCoach(aufgabe, einheit, lernpakete, lernziele) {
  if (!aufgabe || !einheit) {
    return null;
  }

  // Filtere Lernpakete und Ziele für diese Einheit
  const paketeFuerEinheit = lernpakete.filter(p => p.einheit_id === einheit.id);
  const zieleFuerEinheit = lernziele.filter(lz => 
    paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  // Erstelle strukturierte Lernlandkarte
  const lernlandkarte = paketeFuerEinheit
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
    .map(paket => {
      const ziele = zieleFuerEinheit
        .filter(lz => lz.lernpaket_id === paket.id)
        .map(lz => `• ${lz.formulierung_fachsprache}`)
        .join('\n');
      
      return `**${paket.titel_des_pakets}** (${paket.geschaetzte_dauer_minuten || '?'} Min)\n${ziele || '(Keine Ziele definiert)'}`;
    })
    .join('\n\n');

  const fach = einheit.fach || 'dem Unterricht';
  const thema = einheit.titel_der_einheit || 'dieses Themengebiet';
  const jahrgang = einheit.jahrgangsstufe || '–';
  const gesamtziel = einheit.gesamtziel || '';
  const aufgabeText = aufgabe.aufgabenstellung || '';

  const prompt = `KONTEXT:
Du bist ein erfahrener KI-Projekt-Coach an einer Integrierten Gesamtschule (IGS) in Niedersachsen.
Fach: ${fach} | Thema: ${thema} | Jahrgang: ${jahrgang}
Übergeordnetes Ziel der Einheit (Dein Nordstern): ${gesamtziel}

DIE AUFGABE:
${aufgabeText}

DEIN WISSEN (LERNLANDKARTE):
${lernlandkarte || 'Keine Lernpakete vorhanden'}

DEINE STRATEGIE ALS COACH:

1. **Einstieg & Analyse**: Begrüße den Schüler kurz. Analysiere intern, welche Lernziele aus der Landkarte für DIESE Projektaufgabe kritisch sind.

2. **Confidence-Check**: Frage den Schüler gezielt, wie sicher er sich bei diesen kritischen Kompetenzen fühlt. Biete bei Unsicherheit an, eine kurze "Check-Aufgabe" zu stellen, bevor es mit dem Projekt losgeht.

3. **Gemeinsame Planung**: Erstelle erst nach dem Check einen groben Schritt-für-Schritt-Plan (Meilensteine). Präsentiere diesen aber als VORSCHLAG und frage: "Passt dieser Fahrplan für dich oder wollen wir etwas anpassen?"

4. **Prozess-Begleitung**: Gehe den Plan mit dem Schüler Schritt für Schritt durch. Sag: "Gib mir Bescheid, wenn du Schritt 1 erledigt hast, dann schauen wir uns Schritt 2 an."

STRIKTE REGELN:
- NIEMALS die Aufgabe lösen oder vorgefertigte Lösungen anbieten.
- NIEMALS einen finalen Plan aufzwingen; immer den Dialog suchen.
- Bei Fehlern oder Lücken verweise auf das konkrete Lernpaket aus der Landkarte.
- Sprich den Schüler auf Augenhöhe an (du-Form), motivierend, aber fachlich präzise.
- Antworte kurz und gesprächig (optimiert für Voice-to-Text).
- Stelle eine Frage am Ende jeder Antwort, um den Dialog zu fördern.

STARTE DAS GESPRÄCH JETZT:
Stelle dich kurz vor (Name, Rolle), nenne das Hauptziel dieser Einheit und frage den Schüler höflich: "Wie plan du deinen ersten Zugriff auf diese Projektaufgabe? Was ist dein Plan?"`;

  return prompt;
}