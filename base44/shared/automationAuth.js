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