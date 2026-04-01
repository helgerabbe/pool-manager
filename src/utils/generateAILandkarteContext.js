/**
 * Generiert einen strukturierten Text-Kontext für den KI-Tutor
 * basierend auf Themenfeldern, Lernpaketen und Lernzielen.
 * 
 * Nutzt ZWINGEND die offizielle Fachsprache (formulierung_fachsprache)
 * für die Lernziele.
 * 
 * @param {Array} themenfelder - Liste der Themenfelder
 * @param {Array} lernpakete - Liste der Lernpakete
 * @param {Array} lernziele - Liste der Lernziele
 * @returns {string} Strukturierter Kontext-Text
 */
export function generateAILandkarteContext(themenfelder, lernpakete, lernziele) {
  if (!themenfelder || !lernpakete || !lernziele) {
    return '';
  }

  let context = '';

  // Sortiere Themenfelder
  const sortedThemenfelder = [...themenfelder].sort(
    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
  );

  sortedThemenfelder.forEach((themenfeld) => {
    // Nur Themenfelder mit zugeordneten Paketen einbeziehen
    const paketeFuerThemenfeld = lernpakete.filter(
      (p) => p.themenfeld_id === themenfeld.id
    );

    if (paketeFuerThemenfeld.length === 0) return;

    context += `\nThemenfeld: ${themenfeld.titel}\n`;

    // Sortiere Lernpakete
    const sortedPakete = [...paketeFuerThemenfeld].sort(
      (a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)
    );

    sortedPakete.forEach((paket) => {
      context += `  - Lernpaket: ${paket.titel_des_pakets}\n`;

      // Hole alle Lernziele für dieses Paket
      const zieleFuerPaket = lernziele.filter(
        (lz) => lz.lernpaket_id === paket.id
      );

      // Sortiere Lernziele nach Reihenfolge (falls vorhanden)
      const sortedZiele = [...zieleFuerPaket].sort(
        (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
      );

      sortedZiele.forEach((ziel) => {
        // WICHTIG: Nutze formulierung_fachsprache (NICHT schueler_uebersetzung)
        context += `    * Lernziel: ${ziel.formulierung_fachsprache}\n`;
      });
    });
  });

  return context.trim();
}