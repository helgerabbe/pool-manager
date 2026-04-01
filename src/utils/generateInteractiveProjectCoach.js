/**
 * Generiert einen hochstrukturierten System-Prompt für einen KI-Projekt-Coach.
 * 
 * Phase 4: Robustes Null-Handling & String-Sanitizing
 * - Strikte Prüfung auf null/undefined
 * - Fallback-Strings für fehlende Daten
 * - Saubere Formatierung ohne [Object object]
 */

/**
 * Sanitiert einen String für sichere KI-Prompt-Eingabe
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Erstellt eine sauber formatierte Lernlandkarte ohne null-Werte
 */
function buildLernlandkarte(paketeFuerEinheit, lernziele, unzugeordneteZiele) {
  const lernlandkarteTeile = [];

  // Pakete mit ihren Zielen (mit Null-Checks)
  if (Array.isArray(paketeFuerEinheit) && paketeFuerEinheit.length > 0) {
    const paketeTeil = paketeFuerEinheit
      .filter(p => p && p.id) // Null-Filter
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .map(paket => {
        const paketTitel = sanitizeString(paket.titel_des_pakets) || 'Unbenanntes Paket';
        const dauer = paket.geschaetzte_dauer_minuten || '?';
        
        const ziele = lernziele
          .filter(lz => lz && lz.id && lz.lernpaket_id === paket.id)
          .map(lz => {
            const zielText = sanitizeString(lz.formulierung_fachsprache || lz.schueler_uebersetzung);
            return zielText ? `• ${zielText}` : null;
          })
          .filter(Boolean)
          .join('\n');
        
        return `**${paketTitel}** (${dauer} Min)\n${ziele || '(Keine Ziele definiert)'}`;
      })
      .filter(Boolean)
      .join('\n\n');

    if (paketeTeil) {
      lernlandkarteTeile.push(paketeTeil);
    }
  }

  // Unzugeordnete Lernziele
  if (Array.isArray(unzugeordneteZiele) && unzugeordneteZiele.length > 0) {
    const unzugeordnetTeil = `**Nicht zugeordnete Lernziele**\n${unzugeordneteZiele
      .filter(lz => lz && lz.id)
      .map(lz => {
        const zielText = sanitizeString(lz.formulierung_fachsprache || lz.schueler_uebersetzung);
        return zielText ? `• ${zielText}` : null;
      })
      .filter(Boolean)
      .join('\n')}`;
    
    if (unzugeordnetTeil !== '**Nicht zugeordnete Lernziele**\n') {
      lernlandkarteTeile.push(unzugeordnetTeil);
    }
  }

  return lernlandkarteTeile.length > 0
    ? lernlandkarteTeile.join('\n\n').trim()
    : '[Keine Lernziele vorhanden]';
}

/**
 * Generiert einen Projekt-Coach-Prompt mit Null-Handling
 * 
 * @param {Object} aufgabe - Die Projektaufgabe
 * @param {Object} einheit - Die Einheit
 * @param {Array} lernpakete - Liste der Lernpakete
 * @param {Array} lernziele - Liste der Lernziele
 * @returns {string|null} Der generierte Prompt oder null bei kritischen Fehlern
 */
export function generateInteractiveProjectCoach(aufgabe, einheit, lernpakete, lernziele) {
  // Strikte Validierungen
  if (!aufgabe || !einheit) {
    return null;
  }

  if (!Array.isArray(lernpakete) || !Array.isArray(lernziele)) {
    return null;
  }

  // Filtere Lernpakete und Ziele für diese Einheit (mit Null-Checks)
  const paketeFuerEinheit = lernpakete.filter(p => p && p.id && p.einheit_id === einheit.id);
  const zieleFuerEinheit = lernziele.filter(lz =>
    lz && lz.id && paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  // Unzugeordnete Lernziele
  const unzugeordneteZiele = lernziele.filter(lz =>
    lz && lz.id && !paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  // Erstelle saubere Lernlandkarte
  const lernlandkarte = buildLernlandkarte(paketeFuerEinheit, zieleFuerEinheit, unzugeordneteZiele);

  // Sanitize alle kritischen Felder mit Fallbacks
  const fach = sanitizeString(einheit.fach) || 'dem Unterricht';
  const thema = sanitizeString(einheit.titel_der_einheit) || 'dieses Themengebiet';
  const jahrgang = sanitizeString(einheit.jahrgangsstufe) || '–';
  const gesamtziel = sanitizeString(einheit.gesamtziel) || '[Kein Gesamtziel definiert]';
  const aufgabeText = sanitizeString(aufgabe.aufgabenstellung) || '[Keine Aufgabenstellung hinterlegt]';

  const prompt = `KONTEXT:
Du bist ein erfahrener KI-Projekt-Coach an einer Integrierten Gesamtschule (IGS) in Niedersachsen.
Fach: ${fach} | Thema: ${thema} | Jahrgang: ${jahrgang}
Übergeordnetes Ziel der Einheit (Dein Nordstern): ${gesamtziel}

DIE AUFGABE:
${aufgabeText}

DEIN WISSEN (LERNLANDKARTE):
${lernlandkarte}

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
Stelle dich kurz vor (Name, Rolle), nenne das Hauptziel dieser Einheit und frage den Schüler höflich: "Wie planst du deinen ersten Zugriff auf diese Projektaufgabe? Was ist dein Plan?"`;

  return prompt;
}