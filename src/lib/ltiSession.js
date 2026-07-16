/**
 * ltiSession.js — Hilfsfunktionen für die Moodle-LTI-Schülersitzung.
 *
 * Das Token stammt aus ltiLaunch (signiert, 8h gültig) und wird von der
 * MoodleEinstieg-Seite in localStorage abgelegt. Die Signatur wird NICHT im
 * Frontend geprüft (der Schlüssel bleibt im Backend) — jede echte Daten-
 * Operation läuft über die Backend-Funktion ltiApi, die das Token verifiziert.
 */

const STORAGE_KEY = 'lti_session';

export function parseLtiToken(token) {
  try {
    const part = token.split('.')[0];
    const bytes = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    // UTF-8-Dekodierung (Namen mit Umlauten)
    const json = decodeURIComponent(
      bytes.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch (_e) {
    return null;
  }
}

export function speichereLtiToken(token) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function getLtiToken() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

/** Payload der Sitzung, oder null wenn keine/abgelaufene Sitzung vorliegt. */
export function getLtiSession() {
  const token = getLtiToken();
  if (!token) return null;
  const payload = parseLtiToken(token);
  return payload && payload.exp > Date.now() ? payload : null;
}

export function hatGueltigeLtiSession() {
  return Boolean(getLtiSession());
}