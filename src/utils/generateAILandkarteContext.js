/**
 * Generiert einen strukturierten Text-Kontext für den KI-Tutor
 * basierend auf Themenfeldern, Lernpaketen und Lernzielen.
 * 
 * Phase 4: Robustes Null-Handling & String-Sanitizing
 * - Strikte Prüfung auf null/undefined
 * - Fallback-Strings für fehlende Daten
 * - Saubere Zeilenumbrüche und Trimming
 * 
 * @param {Array} themenfelder - Liste der Themenfelder
 * @param {Array} lernpakete - Liste der Lernpakete
 * @param {Array} lernziele - Liste der Lernziele
 * @param {Object} einheit - Die Einheit mit optionalem gesamtziel
 * @returns {string} Strukturierter Kontext-Text oder leerer String
 */
export function generateAILandkarteContext(themenfelder, lernpakete, lernziele, einheit = null) {
  // Strikte null-Checks
  if (!Array.isArray(themenfelder) || !Array.isArray(lernpakete) || !Array.isArray(lernziele)) {
    return '';
  }

  let context = '';

  // Gesamtziel mit Fallback
  if (einheit) {
    const gesamtzielSauber = sanitizeString(einheit.gesamtziel);
    if (gesamtzielSauber) {
      context += `Übergeordnetes Ziel der Einheit: ${gesamtzielSauber}\n`;
    }
  }

  // Sortiere Themenfelder
  const sortedThemenfelder = [...themenfelder]
    .filter(tf => tf && tf.id) // Null-Filter
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

  sortedThemenfelder.forEach((themenfeld) => {
    const themenfeldTitel = sanitizeString(themenfeld.titel);
    if (!themenfeldTitel) return; // Überspringe Themenfelder ohne Titel

    // Nur Themenfelder mit zugeordneten Paketen einbeziehen
    const paketeFuerThemenfeld = lernpakete.filter(
      (p) => p && p.themenfeld_id === themenfeld.id
    );

    if (paketeFuerThemenfeld.length === 0) return;

    context += `\nThemenfeld: ${themenfeldTitel}\n`;

    // Sortiere Lernpakete
    const sortedPakete = [...paketeFuerThemenfeld]
      .filter(p => p && p.id)
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

    sortedPakete.forEach((paket) => {
      const paketTitel = sanitizeString(paket.titel_des_pakets);
      if (!paketTitel) return;

      context += `  - Lernpaket: ${paketTitel}\n`;

      // Hole alle Lernziele für dieses Paket
      const zieleFuerPaket = lernziele.filter(
        (lz) => lz && lz.lernpaket_id === paket.id
      );

      // Sortiere Lernziele nach Reihenfolge
      const sortedZiele = [...zieleFuerPaket]
        .filter(lz => lz && lz.id)
        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

      sortedZiele.forEach((ziel) => {
        // Nutze formulierung_fachsprache mit Fallback
        const zielText = sanitizeString(ziel.formulierung_fachsprache || ziel.schueler_uebersetzung);
        if (zielText) {
          context += `    * Lernziel: ${zielText}\n`;
        }
      });
    });
  });

  return context.trim();
}

/**
 * Sanitiert einen String für sichere KI-Prompt-Eingabe
 * - Entfernt null/undefined
 * - Trimmt Whitespace
 * - Entfernt mehrfache Leerzeichen
 * - Bereinigt Zeilenumbrüche
 * 
 * @param {string} str - Der zu bereinigende String
 * @returns {string} Bereinigter String oder leerer String
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s{2,}/g, ' ') // Mehrfache Leerzeichen → einzelnes Leerzeichen
    .replace(/\n{3,}/g, '\n\n'); // Mehrfache Zeilenumbrüche → zwei Zeilenumbrüche
}