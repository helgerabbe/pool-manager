/**
 * lernpfadeUtils.js
 *
 * Reine Helfer für das Lernpfad-Cockpit (Tab 7).
 * Single Source of Truth für die "ist Aufgabe bereits in einem Pfad?"-Logik.
 *
 * Datenstruktur (lernpfade_konfiguration[lernTyp]):
 *   [
 *     { sektor_id, titel, modus, aufgaben_ids: ["task_1", "task_2", ...] },
 *     ...
 *   ]
 */

/**
 * Liefert ein Set aller aufgaben_ids, die im angegebenen Lerntyp bereits
 * in irgendeinem Sektor verwendet werden.
 */
export function getUsedAufgabenIds(konfiguration, lernTyp) {
  const sektoren = konfiguration?.[lernTyp] || [];
  const used = new Set();
  for (const s of sektoren) {
    for (const id of s?.aufgaben_ids || []) {
      if (id) used.add(id);
    }
  }
  return used;
}

/**
 * Convenience-Check: Ist die Aufgabe bereits im aktuellen Pfad?
 */
export function isAufgabeInLernpfad(konfiguration, lernTyp, aufgabeId) {
  return getUsedAufgabenIds(konfiguration, lernTyp).has(aufgabeId);
}

// ── Sektor-Helfer ──────────────────────────────────────────────────────────

/**
 * Erzeugt eine zufällige UUID. Fällt auf Math.random zurück, falls
 * crypto.randomUUID nicht verfügbar ist (alte Browser, SSR).
 */
function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Schlanker Fallback (ausreichend für lokale Sektor-IDs).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Default-Sektor wie in der Aufgabenstellung beschrieben.
 */
export function createNewSektor(overrides = {}) {
  return {
    sektor_id: `sec_${uuid()}`,
    titel: 'Neuer Sektor',
    modus: 'sequenziell',
    aufgaben_ids: [],
    ...overrides,
  };
}

/**
 * Liefert die Sektor-Liste eines Lerntyps (immer als Array).
 */
function getSektoren(konfig, lernTyp) {
  return konfig?.[lernTyp] || [];
}

/**
 * Schreibt eine geänderte Sektor-Liste zurück in die Konfiguration.
 */
function setSektoren(konfig, lernTyp, sektoren) {
  return { ...konfig, [lernTyp]: sektoren };
}

/**
 * Sektor anhängen.
 */
export function addSektor(konfig, lernTyp, sektor = createNewSektor()) {
  return setSektoren(konfig, lernTyp, [...getSektoren(konfig, lernTyp), sektor]);
}

/**
 * Beliebige Felder eines Sektors patchen (Titel, Modus, …).
 */
export function patchSektor(konfig, lernTyp, sektorId, patch) {
  const next = getSektoren(konfig, lernTyp).map((s) =>
    s.sektor_id === sektorId ? { ...s, ...patch } : s
  );
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Sektor entfernen (samt aller darin enthaltenen Aufgaben-Verweise).
 */
export function removeSektor(konfig, lernTyp, sektorId) {
  const next = getSektoren(konfig, lernTyp).filter((s) => s.sektor_id !== sektorId);
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Aufgabe an einer bestimmten Position in einen Sektor einfügen.
 * Falls aufgabeId bereits in irgendeinem Sektor des Lerntyps vorkommt → unverändert zurückgeben.
 */
export function insertAufgabeInSektor(konfig, lernTyp, sektorId, aufgabeId, index) {
  if (getUsedAufgabenIds(konfig, lernTyp).has(aufgabeId)) return konfig;
  const next = getSektoren(konfig, lernTyp).map((s) => {
    if (s.sektor_id !== sektorId) return s;
    const ids = [...(s.aufgaben_ids || [])];
    const insertAt = typeof index === 'number' && index >= 0 && index <= ids.length ? index : ids.length;
    ids.splice(insertAt, 0, aufgabeId);
    return { ...s, aufgaben_ids: ids };
  });
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Aufgabe komplett aus einem Lerntyp entfernen (sucht in allen Sektoren).
 */
export function removeAufgabeFromLernTyp(konfig, lernTyp, aufgabeId) {
  const next = getSektoren(konfig, lernTyp).map((s) => ({
    ...s,
    aufgaben_ids: (s.aufgaben_ids || []).filter((id) => id !== aufgabeId),
  }));
  return setSektoren(konfig, lernTyp, next);
}

/**
 * Aufgabe innerhalb eines Sektors umsortieren oder zwischen zwei Sektoren des
 * gleichen Lerntyps verschieben. Reine Reihenfolge-Operation – führt keine
 * Duplikat-Prüfung durch (es wird ja keine neue ID hinzugefügt).
 */
export function moveAufgabe(konfig, lernTyp, fromSektorId, fromIndex, toSektorId, toIndex) {
  const sektoren = getSektoren(konfig, lernTyp);
  const fromSektor = sektoren.find((s) => s.sektor_id === fromSektorId);
  if (!fromSektor) return konfig;
  const aufgabeId = (fromSektor.aufgaben_ids || [])[fromIndex];
  if (!aufgabeId) return konfig;

  const next = sektoren.map((s) => {
    // Source und Target sind identisch → in einer Liste umsortieren.
    if (fromSektorId === toSektorId && s.sektor_id === fromSektorId) {
      const ids = [...(s.aufgaben_ids || [])];
      ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, aufgabeId);
      return { ...s, aufgaben_ids: ids };
    }
    if (s.sektor_id === fromSektorId) {
      const ids = [...(s.aufgaben_ids || [])];
      ids.splice(fromIndex, 1);
      return { ...s, aufgaben_ids: ids };
    }
    if (s.sektor_id === toSektorId) {
      const ids = [...(s.aufgaben_ids || [])];
      const insertAt = typeof toIndex === 'number' && toIndex >= 0 && toIndex <= ids.length ? toIndex : ids.length;
      ids.splice(insertAt, 0, aufgabeId);
      return { ...s, aufgaben_ids: ids };
    }
    return s;
  });
  return setSektoren(konfig, lernTyp, next);
}