/**
 * statusLogic.js — Ampel-Logik für den Workspace (Atom-Modell)
 *
 * Modell:
 *   - Lernziele = atomare Basis-Bausteine (kein anforderungsebene mehr)
 *   - Aufgabenbausteine tragen die Ebene: "1 - Basis", "2 - Transfer", "3 - Projekt"
 *
 * Status-Werte:
 *   'red'    — Leer / kritisch unvollständig
 *   'yellow' — In Bearbeitung (teilweise vorhanden, Lock aktiv, Mapping fehlt)
 *   'green'  — Vollständig
 */

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

function hatInhalt(aufgabe) {
  return aufgabe.aufgabentext_inhalt && aufgabe.aufgabentext_inhalt.trim() !== '';
}

function istTransferOderProjekt(aufgabe) {
  return (
    aufgabe.anforderungsebene === '2 - Transfer' ||
    aufgabe.anforderungsebene === '3 - Projekt' ||
    // Rückwärtskompatibilität mit altem baustein_typ
    aufgabe.baustein_typ === 'Ebene-2-Aufgabe' ||
    aufgabe.baustein_typ === 'Ebene-3-Projekt'
  );
}

/**
 * Status einer Transfer/Projekt-Aufgabe:
 * Grün = Textinhalt vorhanden UND mindestens 1 Lernziel-Atom zugeordnet.
 */
export function getEbene2AufgabeStatus(aufgabe, mappings = []) {
  if (aufgabe.lock_status) return 'yellow';
  const hatText    = hatInhalt(aufgabe);
  const hatMapping = mappings.some(m => m.aufgabe_id === aufgabe.id);
  if (hatText && hatMapping) return 'green';
  if (hatText || hatMapping) return 'yellow';
  return 'red';
}

/**
 * Gibt zurück, ob eine Transfer-Aufgabe Textinhalt hat, aber noch kein Mapping.
 */
export function ebene2FehltMapping(aufgabe, mappings = []) {
  return (
    istTransferOderProjekt(aufgabe) &&
    hatInhalt(aufgabe) &&
    !mappings.some(m => m.aufgabe_id === aufgabe.id)
  );
}

/**
 * Status eines einzelnen Aufgabenbausteins.
 *
 * - Basis-Bausteine (1 - Basis): Inhalt ODER Opt-Out = grün
 * - Transfer/Projekt (2/3):      Inhalt + Mapping = grün
 */
export function getAufgabeStatus(aufgabe, userEmail, mappings = []) {
  if (aufgabe.lock_status && aufgabe.locked_by_user !== userEmail) return 'yellow';
  if (istTransferOderProjekt(aufgabe)) {
    return getEbene2AufgabeStatus(aufgabe, mappings);
  }
  // Basis-Baustein: Inhalt ODER Opt-Out = grün
  if (aufgabe.is_opt_out === true || hatInhalt(aufgabe)) return 'green';
  return 'red';
}

/**
 * Berechnet den Ampel-Status eines Lernziels.
 *
 * Logik:
 *  - Rot:    Keine Aufgabenbausteine vorhanden.
 *  - Gelb:   Aufgaben vorhanden, aber mind. eine ist nicht grün.
 *  - Grün:   Alle Bausteine sind grün (Ebene-2-Mapping-Pflicht inklusive).
 *
 * @param {object}   lernziel
 * @param {object[]} aufgaben
 * @param {string}   paketId
 * @param {string}   userEmail
 * @param {object[]} mappings  — MappingAufgabeBasisziel (optional, für Ebene-2-Prüfung)
 * @returns {'green'|'yellow'|'red'}
 */
export function getLernzielStatus(lernziel, aufgaben, paketId, userEmail = '', mappings = []) {
  const lzAufgaben = aufgaben.filter(
    a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id
  );

  if (lzAufgaben.length === 0) return 'red';

  const statusListe = lzAufgaben.map(a => getAufgabeStatus(a, userEmail, mappings));

  if (statusListe.every(s => s === 'green'))  return 'green';
  if (statusListe.some(s => s === 'red'))     return 'red';
  return 'yellow';
}

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minuten (aligned mit Aktivitäten)

/**
 * Prüft ob ein Lernpaket aktuell aktiv gesperrt ist (Lock nicht abgelaufen).
 * Unterstützt beide Feldnamen für Rückwärtskompatibilität während der Migration.
 */
export function isPaketLocked(paket) {
  const lockedBy = paket.locked_by_user || paket.locked_by;
  if (!lockedBy || !paket.locked_at) return false;
  const age = Date.now() - new Date(paket.locked_at).getTime();
  return age < LOCK_TIMEOUT_MS;
}

/**
 * Berechnet den Ampel-Status eines Lernpakets (neue phasenbasierte Logik).
 *
 * - ROT:   Mindestens eine aktive Phase hat KEINE Aktivität zugeordnet.
 * - GELB:  Paket ist aktuell durch einen anderen Nutzer gesperrt.
 * - GRÜN:  Nicht gesperrt UND alle aktiven Phasen haben eine Aktivität.
 *
 * @param {object}   paket
 * @param {object[]} lernziele  — (nicht mehr primär genutzt, für Kompatibilität erhalten)
 * @param {object[]} aufgaben   — (nicht mehr primär genutzt, für Kompatibilität erhalten)
 * @param {string}   userEmail
 * @param {object[]} mappings   — MappingAufgabeBasisziel
 * @param {object[]} phaseAktivitaeten — LernpaketPhaseAktivitaet (optional, neue Logik)
 * @returns {'green'|'yellow'|'red'}
 */
export function getLernpaketStatus(paket, lernziele, aufgaben, userEmail = '', mappings = [], phaseAktivitaeten = []) {
  const config = paket.phasen_konfiguration || {};
  const PHASE_KEYS = ['Input', 'Übung', 'Abschluss'];

  // 'new': Es wurden noch nie Aktivitäten zugeordnet (komplett leer). In diesem
  // Fall ist das Paket nicht "unvollständig", sondern schlicht frisch angelegt.
  const paketAktivitaeten = phaseAktivitaeten.filter(pa => pa.lernpaket_id === paket.id);
  if (paketAktivitaeten.length === 0) {
    return 'new';
  }

  if (phaseAktivitaeten.length > 0) {
    // Prüfe ob alle aktiven Phasen mindestens eine Aktivität haben
    const hatUnvollstaendigePhase = PHASE_KEYS.some(key => {
      const phase = config[key] || {};
      if (phase.disabled === true) return false; // deaktivierte Phase ignorieren
      // Prüfe ob diese Phase eine Aktivität hat
      return !paketAktivitaeten.some(pa => pa.phase === key);
    });
    if (hatUnvollstaendigePhase) return 'red';
  } else {
    // Fallback auf alte Logik für Rückwärtskompatibilität
    const hatUnvollstaendigePhase = PHASE_KEYS.some(key => {
      const phase = config[key] || {};
      if (phase.disabled === true) return false;
      return !phase.selected_aktivitaet_id;
    });
    if (hatUnvollstaendigePhase) return 'red';
  }

  // GELB: Paket ist von jemand anderem gesperrt
  const lockedBy = paket.locked_by_user || paket.locked_by;
  if (isPaketLocked(paket) && lockedBy !== userEmail) return 'yellow';

  // GRÜN: Alle aktiven Phasen haben eine Aktivität und kein fremder Lock
  return 'green';
}

/**
 * Berechnet den Gesamt-Fortschritt einer Einheit als Prozentwert (0–100).
 * Basis: Anteil der "grünen" Lernpakete.
 *
 * @param {object[]} lernpakete
 * @param {object[]} lernziele
 * @param {object[]} aufgaben
 * @param {string}   userEmail
 * @param {object[]} mappings
 * @param {object[]} phaseAktivitaeten — LernpaketPhaseAktivitaet (optional)
 * @returns {{ prozent: number, gruen: number, gesamt: number }}
 */
export function getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail = '', mappings = [], phaseAktivitaeten = []) {
  const gesamt = lernpakete.length;
  if (gesamt === 0) return { prozent: 0, gruen: 0, gesamt: 0 };

  const gruen = lernpakete.filter(
    p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings, phaseAktivitaeten) === 'green'
  ).length;

  return { prozent: Math.round((gruen / gesamt) * 100), gruen, gesamt };
}

// ── Moodle Sync-Status Logik ──────────────────────────────────────────────────

/**
 * Berechnet den detaillierten Moodle-Sync-Status für eine Einheit oder ein Basismodul.
 *
 * Status-Werte:
 *   'green'   — Synchron: last_synced_at >= updated_date
 *   'blue'    — Exportiert (Warten): last_exported_at > last_synced_at UND updated_date <= last_exported_at
 *   'orange'  — Änderung ausstehend: updated_date > last_synced_at UND (kein Export oder updated_date > last_exported_at)
 *   'red'     — Achtung: Nach Export erneut geändert (last_exported_at gesetzt UND updated_date > last_exported_at)
 *
 * @param {object} entity — Einheit oder Basismodul mit updated_date, last_synced_at, last_exported_at
 * @returns {object} { status: 'green'|'blue'|'orange'|'red', message: string }
 */
export function getDetailedSyncStatus(entity) {
  if (!entity) return { status: 'gray', message: 'Keine Daten' };

  const updatedDate = entity.updated_date ? new Date(entity.updated_date) : null;
  const lastSyncedAt = entity.last_synced_at ? new Date(entity.last_synced_at) : null;
  const lastExportedAt = entity.last_exported_at ? new Date(entity.last_exported_at) : null;

  // ROT: Nach Export erneut geändert
  if (lastExportedAt && updatedDate && updatedDate > lastExportedAt) {
    return {
      status: 'red',
      message: 'Nach Export erneut geändert – Erneuter Export erforderlich',
      icon: 'alert',
    };
  }

  // GRÜN: Synchron
  if (lastSyncedAt && updatedDate && lastSyncedAt >= updatedDate) {
    return {
      status: 'green',
      message: 'In Moodle synchronisiert',
      icon: 'check',
    };
  }

  // BLAU: Exportiert (wartet auf Moodle-Bestätigung)
  if (
    lastExportedAt &&
    lastSyncedAt &&
    lastExportedAt > lastSyncedAt &&
    updatedDate &&
    updatedDate <= lastExportedAt
  ) {
    return {
      status: 'blue',
      message: 'Exportiert – Wartet auf Moodle-Bestätigung',
      icon: 'clock',
    };
  }

  // ORANGE: Änderung ausstehend
  if (updatedDate && (!lastSyncedAt || updatedDate > lastSyncedAt)) {
    return {
      status: 'orange',
      message: 'Änderungen ausstehend – Export erforderlich',
      icon: 'alert-triangle',
    };
  }

  // Standard: Noch nie exportiert oder gesynced
  return {
    status: 'gray',
    message: 'Bereit für Export',
    icon: 'info',
  };
}

/**
 * Formatiert das Exportdatum für die Anzeige.
 *
 * @param {string|Date|null} date
 * @returns {string} — z.B. "1. Apr 2026, 14:30" oder "Noch nicht exportiert"
 */
export function formatExportDate(date) {
  if (!date) return 'Noch nicht exportiert';

  const d = new Date(date);
  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}