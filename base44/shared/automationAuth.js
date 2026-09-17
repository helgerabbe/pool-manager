/**
 * automationAuth.js — Erkennt Aufrufe ohne angemeldete Person, die sich über
 * `Authorization: Bearer <AUTOMATION_SECRET>` ausweisen (Workflows, MBK).
 *
 * Eine Stelle für alle Funktionen, die zwei Aufrufwege kennen: angemeldete
 * Person ODER Automation. Vorher stand derselbe Vergleich in mehreren
 * Funktionen — ein vergessener Sonderfall an einer Stelle bliebe dort unbemerkt.
 */

import { secrets } from 'base44:runtime';

export function istAutomationAufruf(req) {
  const erwartet = secrets.get('AUTOMATION_SECRET');
  const kopf = req.headers.get('authorization') || '';
  const mitgegeben = kopf.startsWith('Bearer ') ? kopf.slice(7) : '';
  return !!erwartet && mitgegeben === erwartet;
}

/**
 * Holt die angemeldete Person, ohne bei fehlender Anmeldung zu werfen.
 *
 * Warum eigens: `auth.me()` wirft ohne Sitzung eine Ausnahme. In Funktionen mit
 * zwei Aufrufwegen landete die im catch und wurde zu HTTP 500 — ein Absender mit
 * falschem Schlüssel sah also einen Serverfehler statt „Ausweis stimmt nicht",
 * und im Log stapelten sich Fehlermeldungen (MBK-Meldung 2026-09-16).
 *
 * ACHTUNG, hier lag eine Falle: Auch angemeldete Personen schicken einen
 * `Authorization: Bearer …`-Kopf (ihr Sitzungs-Token). Am Kopf allein lässt sich
 * ein falscher Automation-Schlüssel deshalb NICHT erkennen — wer das versucht,
 * sperrt die eigenen Lehrkräfte aus. Entscheidend ist einzig: Automation-Schlüssel
 * passt nicht UND es gibt keine gültige Sitzung.
 */
export async function holeAngemeldetenNutzer(base44) {
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}

/** Einheitliche Antwort, wenn weder Anmeldung noch Automation-Schlüssel greifen. */
export function ausweisFehler() {
  return Response.json(
    { error: 'Nicht angemeldet oder ungültiger Automation-Schlüssel.' },
    { status: 401 },
  );
}