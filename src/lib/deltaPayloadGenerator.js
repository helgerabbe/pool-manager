/**
 * deltaPayloadGenerator.js
 * 
 * Selektive Delta-Export-Logik für präzise Moodle-Synchronisation
 * - Filtert nur veränderte Entitäten seit letztem Export
 * - Validiert Abhängigkeiten (z.B. Lernziel → Lernpaket)
 * - Liefert Header-Daten als Referenz
 */

/**
 * Generiert einen Delta-Export-Payload für eine Einheit
 * 
 * @param {Object} einheit - Die Einheit mit allen Relationen
 * @param {Array} allLernpakete - Alle Lernpakete der Einheit
 * @param {Array} allLernziele - Alle Lernziele aller Pakete
 * @param {Array} allAufgaben - Alle Aufgabenbausteine
 * @param {Array} allThemenfelder - Alle Themenfelder
 * @param {string|null} lastExportedAt - Timestamp des letzten Exports
 * @param {boolean} deltaOnly - Wenn true, nur geänderte Items; wenn false, alles
 * @returns {Object} Export-Payload mit Delta-Struktur
 * @throws {Error} Bei Validierungsfehlern
 */
export function generateDeltaPayload(
  einheit,
  allLernpakete,
  allLernziele,
  allAufgaben,
  allThemenfelder,
  lastExportedAt,
  deltaOnly = true
) {
  if (!einheit?.id) {
    throw new Error('Einheit ist erforderlich');
  }

  const lastExportDate = lastExportedAt ? new Date(lastExportedAt) : null;

  // ── Filter-Helper ──────────────────────────────────────────────────────

  /**
   * Prüft ob eine Entität seit letztem Export geändert wurde
   */
  const hasChanged = (item) => {
    if (!lastExportDate) return true; // Noch nie exportiert = alles changed
    const itemUpdatedDate = new Date(item.updated_date);
    return itemUpdatedDate > lastExportDate;
  };

  /**
   * Filtert Items basierend auf Delta-Modus
   */
  const filterItems = (items) => {
    return deltaOnly ? items.filter(hasChanged) : items;
  };

  // ── Sammle gefilterte Daten ────────────────────────────────────────────

  // 1. Themenfelder dieser Einheit
  const themenfelderFuerEinheit = allThemenfelder.filter(
    (tf) => tf.einheit_id === einheit.id
  );
  const themenfeldIds = new Set(themenfelderFuerEinheit.map((tf) => tf.id));

  const changedThemenfelder = filterItems(themenfelderFuerEinheit);

  // 2. Lernpakete dieser Einheit
  const paketeFuerEinheit = allLernpakete.filter(
    (p) => p.einheit_id === einheit.id
  );
  const paketIds = new Set(paketeFuerEinheit.map((p) => p.id));

  const changedPakete = filterItems(paketeFuerEinheit);

  // Sammle ALLE Paket-IDs, nicht nur geänderte (für Abhängigkeitsprüfung)
  const allPaketIds = paketIds;

  // 3. Lernziele (nur aus den Paketen dieser Einheit)
  const zieleAusAllenPaketen = allLernziele.filter(
    (lz) => allPaketIds.has(lz.lernpaket_id)
  );
  const changedZiele = filterItems(zieleAusAllenPaketen);
  const zielIds = new Set(changedZiele.map((z) => z.id));

  // 4. Aufgabenbausteine (nur aus Zielen/Paketen dieser Einheit)
  const aufgabenAusAllenZielen = allAufgaben.filter(
    (a) => allPaketIds.has(a.lernpaket_id)
  );
  const changedAufgaben = filterItems(aufgabenAusAllenZielen);

  // ── Abhängigkeitsprüfung ──────────────────────────────────────────────

  validateDeltaDependencies({
    einheit,
    themenfelder: changedThemenfelder,
    pakete: changedPakete,
    ziele: changedZiele,
    aufgaben: changedAufgaben,
    allPakete: paketeFuerEinheit,
    allZiele: zieleAusAllenPaketen,
  });

  // ── Generiere Payload ─────────────────────────────────────────────────

  const now = new Date().toISOString();

  const payload = {
    timestamp: now,
    export_type: deltaOnly ? 'moodle_delta' : 'moodle_full',
    delta_since: lastExportedAt || null,
    is_delta_export: deltaOnly,

    // Header: Referenz-Daten der Einheit (immer mitgeliefert)
    einheit: {
      id: einheit.id,
      titel_der_einheit: einheit.titel_der_einheit,
      fach: einheit.fach,
      jahrgangsstufe: einheit.jahrgangsstufe,
      gesamtziel: einheit.gesamtziel,
      freigabe_status: einheit.freigabe_status,
      updated_date: einheit.updated_date,
      last_synced_at: einheit.last_synced_at,
      last_exported_at: einheit.last_exported_at,
    },

    // Delta-Struktur: Nur geänderte/neue Inhalte
    delta: {
      // Themenfelder (wenn sich strukturell geändert)
      themenfelder: changedThemenfelder.map((tf) => ({
        id: tf.id,
        einheit_id: tf.einheit_id,
        titel: tf.titel,
        beschreibung: tf.beschreibung,
        reihenfolge: tf.reihenfolge,
        bearbeitungsmodus: tf.bearbeitungsmodus,
        updated_date: tf.updated_date,
      })),

      // Lernpakete (neue oder geänderte Metadaten)
      lernpakete: changedPakete.map((p) => ({
        id: p.id,
        einheit_id: p.einheit_id,
        themenfeld_id: p.themenfeld_id,
        titel_des_pakets: p.titel_des_pakets,
        geschaetzte_dauer_minuten: p.geschaetzte_dauer_minuten,
        reihenfolge_nummer: p.reihenfolge_nummer,
        updated_date: p.updated_date,
      })),

      // Lernziele (neue oder geänderte)
      lernziele: changedZiele.map((lz) => ({
        id: lz.id,
        lernpaket_id: lz.lernpaket_id,
        formulierung_fachsprache: lz.formulierung_fachsprache,
        kategorie: lz.kategorie,
        schueler_uebersetzung: lz.schueler_uebersetzung,
        updated_date: lz.updated_date,
      })),

      // Aufgabenbausteine (neue oder geänderte)
      aufgabenbausteine: changedAufgaben.map((a) => ({
        id: a.id,
        lernpaket_id: a.lernpaket_id,
        lernziel_id: a.lernziel_id,
        baustein_typ: a.baustein_typ,
        aufgabentext_inhalt: a.aufgabentext_inhalt,
        anforderungsebene: a.anforderungsebene,
        schwierigkeitsgrad: a.schwierigkeitsgrad,
        updated_date: a.updated_date,
      })),
    },

    // Statistik
    statistics: {
      is_delta: deltaOnly,
      themenfelder_count: changedThemenfelder.length,
      lernpakete_count: changedPakete.length,
      lernziele_count: changedZiele.length,
      aufgabenbausteine_count: changedAufgaben.length,
      total_changed_count:
        changedThemenfelder.length +
        changedPakete.length +
        changedZiele.length +
        changedAufgaben.length,
    },

    // Audit-Info
    audit: {
      einheit_id: einheit.id,
      einheit_title: einheit.titel_der_einheit,
      export_timestamp: now,
      last_exported_at: lastExportedAt,
    },
  };

  return payload;
}

/**
 * Validiert Delta-Export auf Abhängigkeitsprobleme
 */
function validateDeltaDependencies({
  einheit,
  themenfelder,
  pakete,
  ziele,
  aufgaben,
  allPakete,
  allZiele,
}) {
  const issues = [];

  // Prüfung 1: Wenn Lernziel neu, muss Paket referenzierbar sein
  ziele.forEach((ziel) => {
    const paketExists = allPakete.some((p) => p.id === ziel.lernpaket_id);
    if (!paketExists) {
      issues.push(
        `Lernziel "${ziel.formulierung_fachsprache}" referenziert nicht existierendes Paket ${ziel.lernpaket_id}`
      );
    }
  });

  // Prüfung 2: Wenn Aufgabenbaustein neu, muss Lernziel existieren
  aufgaben.forEach((aufgabe) => {
    if (aufgabe.lernziel_id) {
      const zielExists = allZiele.some((z) => z.id === aufgabe.lernziel_id);
      if (!zielExists) {
        issues.push(
          `Aufgabenbaustein "${aufgabe.baustein_typ}" referenziert nicht existierendes Lernziel ${aufgabe.lernziel_id}`
        );
      }
    }
  });

  // Prüfung 3: Wenn Themenfeld geändert, muss Einheit noch existieren
  themenfelder.forEach((tf) => {
    if (tf.einheit_id !== einheit.id) {
      issues.push(
        `Themenfeld "${tf.titel}" gehört zu anderer Einheit: ${tf.einheit_id}`
      );
    }
  });

  if (issues.length > 0) {
    throw new Error(
      `Delta-Validierungsfehler:\n${issues.map((i) => `• ${i}`).join('\n')}`
    );
  }
}

/**
 * Extrahiert die IDs aller Entitäten die im Payload enthalten sind
 */
export function getPayloadEntityIds(payload) {
  return {
    themenfeldIds: payload.delta.themenfelder.map((t) => t.id),
    paketIds: payload.delta.lernpakete.map((p) => p.id),
    zielIds: payload.delta.lernziele.map((z) => z.id),
    aufgabenIds: payload.delta.aufgabenbausteine.map((a) => a.id),
  };
}