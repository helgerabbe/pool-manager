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
 * @param {Array} [allAllgemeineAufgaben=[]] - Alle AllgemeineAufgabe-Datensätze
 *        (optional). Wenn übergeben, werden die einheit-zugehörigen Aufgaben
 *        in den Slot `delta.allgemeine_aufgaben` aufgenommen. Sprint G
 *        ergänzt dort die typ-spezifischen Felder (lernpaket_logik,
 *        erforderliche_anzahl, interne_reihenfolge, hinweise_zum_material).
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
  deltaOnly = true,
  allAllgemeineAufgaben = []
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

  // 5. AllgemeineAufgaben dieser Einheit (Sprint G – Brian-Anschluss)
  const allgemeineFuerEinheit = (allAllgemeineAufgaben || []).filter(
    (a) => a.einheit_id === einheit.id && a.sync_status !== 'to_delete'
  );
  const allgemeineById = new Map(allgemeineFuerEinheit.map((a) => [a.id, a]));

  // 5a. Erst die per Delta-Filter geänderten Aufgaben sammeln …
  const changedAllgemeineCore = filterItems(allgemeineFuerEinheit);

  // 5b. … dann referenzierte Kinder von Bündel-/Auswahl-/Anker-Aufgaben
  //      transitiv mit hineinziehen, auch wenn sie selbst unverändert sind.
  //      Hintergrund: Wird ein `auswahl_buendel` exportiert, MUSS jede
  //      referenzierte Ebene-2-Aufgabe im selben Payload mitkommen, sonst
  //      ist das Brian-Bündel im Zielsystem nicht zusammensetzbar.
  //      Lernpaket-Referenzen aus `buendel.verlinkte_lernpaket_ids` werden
  //      analog ergänzend in den lernpakete-Slot gehoben.
  const expandedAllgemeineMap = new Map(changedAllgemeineCore.map((a) => [a.id, a]));
  const additionalLernpaketIds = new Set();

  changedAllgemeineCore.forEach((a) => {
    const typ = a.aufgaben_typ || 'inhalt';

    // Brian-Bündel und Projekt-Anker referenzieren weitere AllgemeineAufgaben.
    if (typ === 'auswahl_buendel' || typ === 'projekt_anker') {
      const refField =
        typ === 'auswahl_buendel' ? 'verlinkte_aufgaben_ids' : 'verlinkte_projekt_ids';
      const refIds = Array.isArray(a[refField]) ? a[refField] : [];
      refIds.forEach((id) => {
        if (!expandedAllgemeineMap.has(id) && allgemeineById.has(id)) {
          expandedAllgemeineMap.set(id, allgemeineById.get(id));
        }
      });
    }

    // Moodle-Bündel referenziert Lernpakete – diese ggf. zusätzlich exportieren.
    if (typ === 'buendel') {
      const refIds = Array.isArray(a.verlinkte_lernpaket_ids) ? a.verlinkte_lernpaket_ids : [];
      refIds.forEach((id) => additionalLernpaketIds.add(id));
    }
  });

  const changedAllgemeineAufgaben = Array.from(expandedAllgemeineMap.values());

  // 5c. Zusätzliche Lernpakete aus Bündel-Referenzen einreihen, sofern sie
  //     zur Einheit gehören und nicht ohnehin schon im changedPakete-Set sind.
  if (additionalLernpaketIds.size > 0) {
    const alreadyIn = new Set(changedPakete.map((p) => p.id));
    paketeFuerEinheit.forEach((p) => {
      if (additionalLernpaketIds.has(p.id) && !alreadyIn.has(p.id)) {
        changedPakete.push(p);
      }
    });
  }

  // ── Abhängigkeitsprüfung ──────────────────────────────────────────────

  validateDeltaDependencies({
    einheit,
    themenfelder: changedThemenfelder,
    pakete: changedPakete,
    ziele: changedZiele,
    aufgaben: changedAufgaben,
    allgemeineAufgaben: changedAllgemeineAufgaben,
    allPakete: paketeFuerEinheit,
    allZiele: zieleAusAllenPaketen,
    allAllgemeineIds: new Set(allgemeineFuerEinheit.map((a) => a.id)),
    allPaketIds: new Set(paketeFuerEinheit.map((p) => p.id)),
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

      // AllgemeineAufgabe (Sprint G – Brian-Anschluss).
      // Die typ-spezifischen Felder (lernpaket_logik, erforderliche_anzahl,
      // interne_reihenfolge, hinweise_zum_material) werden NUR dann ins
      // Export-Objekt aufgenommen, wenn sie auf der Aufgabe befüllt sind –
      // als flache Key-Value-Paare gemäß Sprint-G-Vorgabe.
      allgemeine_aufgaben: changedAllgemeineAufgaben.map((a) =>
        mapAllgemeineAufgabeForExport(a)
      ),
    },

    // Statistik
    statistics: {
      is_delta: deltaOnly,
      themenfelder_count: changedThemenfelder.length,
      lernpakete_count: changedPakete.length,
      lernziele_count: changedZiele.length,
      aufgabenbausteine_count: changedAufgaben.length,
      allgemeine_aufgaben_count: changedAllgemeineAufgaben.length,
      total_changed_count:
        changedThemenfelder.length +
        changedPakete.length +
        changedZiele.length +
        changedAufgaben.length +
        changedAllgemeineAufgaben.length,
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
 * Mapped einen AllgemeineAufgabe-Datensatz auf das Brian-/Moodle-Export-Format.
 *
 * Sprint G: Die typ-spezifischen Felder werden ausschließlich dann
 * ausgegeben, wenn sie für den jeweiligen aufgaben_typ relevant UND
 * tatsächlich befüllt sind. So bleibt das Export-JSON für nicht-relevante
 * Typen sauber (kein `interne_reihenfolge` auf einem `inhalt`-Task).
 */
function mapAllgemeineAufgabeForExport(a) {
  const typ = a.aufgaben_typ || 'inhalt';
  const out = {
    id: a.id,
    einheit_id: a.einheit_id,
    themenfeld_id: a.themenfeld_id || null,
    aufgaben_typ: typ,
    anforderungsebene: a.anforderungsebene,
    titel: a.titel || null,
    aufgabenstellung: a.aufgabenstellung || null,
    content_status: a.content_status,
    moodle_sync_status: a.moodle_sync_status,
    brian_sync_status: a.brian_sync_status,
    updated_date: a.updated_date,
  };

  // Typ-spezifische Felder als flache Key-Value-Paare (nur wenn befüllt).
  if (typ === 'buendel') {
    if (a.lernpaket_logik) out.lernpaket_logik = a.lernpaket_logik;
    if (Array.isArray(a.verlinkte_lernpaket_ids) && a.verlinkte_lernpaket_ids.length > 0) {
      out.verlinkte_lernpaket_ids = a.verlinkte_lernpaket_ids;
    }
  }

  if (typ === 'auswahl_buendel') {
    if (Number.isFinite(a.erforderliche_anzahl)) {
      out.erforderliche_anzahl = a.erforderliche_anzahl;
    }
    if (a.interne_reihenfolge) out.interne_reihenfolge = a.interne_reihenfolge;
    if (Array.isArray(a.verlinkte_aufgaben_ids) && a.verlinkte_aufgaben_ids.length > 0) {
      out.verlinkte_aufgaben_ids = a.verlinkte_aufgaben_ids;
    }
  }

  if (typ === 'handlung') {
    if (a.hinweise_zum_material) {
      out.hinweise_zum_material = a.hinweise_zum_material;
    }
  }

  if (typ === 'projekt_anker') {
    if (Array.isArray(a.verlinkte_projekt_ids) && a.verlinkte_projekt_ids.length > 0) {
      out.verlinkte_projekt_ids = a.verlinkte_projekt_ids;
    }
  }

  return out;
}

/**
 * Validiert Delta-Export auf Abhängigkeitsprobleme.
 *
 * Sprint G – erweitert um die drei neuen Referenz-Beziehungen aus
 * AllgemeineAufgabe:
 *   - buendel.verlinkte_lernpaket_ids       (Moodle-Bündel)
 *   - auswahl_buendel.verlinkte_aufgaben_ids (Brian-Bündel)
 *   - projekt_anker.verlinkte_projekt_ids   (Projekt-Anker)
 *
 * Auflösungsstrategie für Bündel-Auswahl: Auto-Include passiert bereits
 * im Generator (siehe Schritt 5b). Hier prüfen wir defensiv, dass alle
 * Referenz-IDs in der Einheit überhaupt existieren – also keine toten
 * Pointer auf gelöschte oder fremde Datensätze.
 */
function validateDeltaDependencies({
  einheit,
  themenfelder,
  pakete,
  ziele,
  aufgaben,
  allgemeineAufgaben = [],
  allPakete,
  allZiele,
  allAllgemeineIds = new Set(),
  allPaketIds = new Set(),
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

  // Prüfung 4 (Sprint G): AllgemeineAufgabe-Referenzen prüfen.
  allgemeineAufgaben.forEach((a) => {
    const typ = a.aufgaben_typ || 'inhalt';
    const label = a.titel || a.id;

    if (typ === 'buendel') {
      const refIds = Array.isArray(a.verlinkte_lernpaket_ids) ? a.verlinkte_lernpaket_ids : [];
      refIds.forEach((id) => {
        if (!allPaketIds.has(id)) {
          issues.push(
            `Moodle-Bündel "${label}" referenziert nicht existierendes Lernpaket ${id}`
          );
        }
      });
    }

    if (typ === 'auswahl_buendel') {
      const refIds = Array.isArray(a.verlinkte_aufgaben_ids) ? a.verlinkte_aufgaben_ids : [];
      refIds.forEach((id) => {
        if (!allAllgemeineIds.has(id)) {
          issues.push(
            `Brian-Bündel "${label}" referenziert nicht existierende Aufgabe ${id}`
          );
        }
      });
    }

    if (typ === 'projekt_anker') {
      const refIds = Array.isArray(a.verlinkte_projekt_ids) ? a.verlinkte_projekt_ids : [];
      refIds.forEach((id) => {
        if (!allAllgemeineIds.has(id)) {
          issues.push(
            `Projekt-Anker "${label}" referenziert nicht existierende Projekt-Aufgabe ${id}`
          );
        }
      });
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
    allgemeineAufgabenIds: (payload.delta.allgemeine_aufgaben || []).map((a) => a.id),
  };
}