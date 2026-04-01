import { base44 } from '@/api/base44Client';

/**
 * Exportiert alle relevanten Daten einer Lerneinheit in ein Moodle-freundliches JSON-Format.
 * 
 * @param {string} einheitId - ID der Einheit
 * @returns {Promise<Object>} Strukturiertes JSON-Objekt für Moodle-Integration
 */
export async function generateMoodleLandkarteJSON(einheitId) {
  try {
    // 1. Lade alle notwendigen Daten parallel
    const [einheit, themenfelder, lernpakete, lernziele, mappings] = await Promise.all([
      base44.entities.Einheiten.filter({ id: einheitId }).then(r => r[0]),
      base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
      base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
      base44.entities.Lernziele.list(),
      base44.entities.AllgemeineAufgabeLernzielMapping.list(),
    ]);

    const allgemeineAufgaben = await base44.entities.AllgemeineAufgabe.filter({
      einheit_id: einheitId,
    });

    // 2. Extrahiere Ebene 3 (Projektaufgaben) - anforderungsebene: "3 - Projekt"
    const projektaufgaben = allgemeineAufgaben.filter(
      a => a.anforderungsebene === '3 - Projekt' || !a.anforderungsebene
    );

    const zielProjekte = projektaufgaben.map(aufgabe => ({
      titel: aufgabe.titel || aufgabe.aufgabenstellung?.substring(0, 50) || 'Unbenannt',
      beschreibung: aufgabe.aufgabenstellung || '',
      schwierigkeit: aufgabe.schwierigkeitsgrad || null,
    }));

    // 3. Sortiere Themenfelder und baue Lernpfad
    const themenfeldMitPaketen = themenfelder
      .filter(tf => lernpakete.some(p => p.themenfeld_id === tf.id))
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

    const lernpfad = themenfeldMitPaketen.map(themenfeld => {
      // Pakete für dieses Themenfeld
      const paketeFuerThemenfeld = lernpakete
        .filter(p => p.themenfeld_id === themenfeld.id)
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

      const stationen = [];

      // Baue Stationen: Lernpakete + deren Lernziele + Allgemeine Aufgaben
      paketeFuerThemenfeld.forEach(paket => {
        // Lernziele für dieses Paket
        const zieleFuerPaket = lernziele.filter(lz => lz.lernpaket_id === paket.id);

        zieleFuerPaket.forEach(lz => {
          // Finde verknüpfte Allgemeine Aufgaben (Ebene 2)
          const verknuepfteAufgaben = allgemeineAufgaben.filter(a =>
            mappings.some(m => m.aufgabe_id === a.id && m.lernziel_id === lz.id) &&
            a.anforderungsebene === '2 - Transfer'
          );

          stationen.push({
            typ: 'lernziel',
            paket_nummer: paket.reihenfolge_nummer || null,
            paket_titel: paket.titel_des_pakets,
            text: lz.schueler_uebersetzung || lz.formulierung_fachsprache,
            kategorie: lz.kategorie || null,
            zugehoerige_aufgaben: verknuepfteAufgaben.map(a => ({
              titel: a.titel || a.aufgabenstellung?.substring(0, 50) || 'Unbenannt',
              beschreibung: a.aufgabenstellung || '',
              schwierigkeit: a.schwierigkeitsgrad || null,
            })),
          });
        });
      });

      return {
        themenfeld: themenfeld.titel,
        modus: themenfeld.bearbeitungsmodus || 'offen',
        reihenfolge: themenfeld.reihenfolge || 0,
        stationen,
      };
    });

    // 4. Zusammenfassung
    return {
      einheit_titel: einheit?.titel_der_einheit || 'Unbenannte Einheit',
      fach: einheit?.fach || null,
      jahrgangsstufe: einheit?.jahrgangsstufe || null,
      freigabe_status: einheit?.freigabe_status || 'In Planung',
      export_zeitstempel: new Date().toISOString(),
      ziel_projekte: zielProjekte,
      lernpfad,
    };
  } catch (error) {
    console.error('Fehler beim Exportieren der Lernlandkarte:', error);
    throw new Error(`Lernlandkarte-Export fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Convenience-Funktion für direkte Moodle-Export-Nutzung:
 * Gibt das JSON direkt als Download-String aus.
 * 
 * @param {string} einheitId - ID der Einheit
 * @returns {Promise<string>} JSON-String für Download
 */
export async function downloadMoodleLandkarteJSON(einheitId) {
  const data = await generateMoodleLandkarteJSON(einheitId);
  return JSON.stringify(data, null, 2);
}