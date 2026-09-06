import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

/**
 * lib/assistentEndpunkt.js
 *
 * Adresse und Kopfzeilen für die streamenden Aufrufe des Aufgabengenerators
 * (useAufgabenGenerator, useStrukturVorschlag).
 *
 * Bewusst DERSELBE Weg, den das SDK für Function-Aufrufe nimmt — inklusive
 * Funktions-Version: Der kurze Pfad /functions/<name> lief in der Vorschau
 * nach jeder App-Aktualisierung ins Leere (404), sobald die Funktionen neu
 * ausgerollt waren. Der versionierte SDK-Pfad trifft immer die richtige.
 */

export const ASSISTENT_ENDPOINT = `/api/apps/${appParams.appId}/functions/aufgabeGeneratorChat`;

/** Holt einen gültigen Token — gleiche Logik wie useRealtimeUpdates. */
async function holeToken() {
  try {
    const keys = Object.keys(localStorage);
    const tokenKey = keys.find((k) => k.startsWith('base44_') && k.endsWith('_token'));
    if (tokenKey) {
      const t = localStorage.getItem(tokenKey);
      if (t) return t;
    }
  } catch { /* Storage gesperrt */ }
  try {
    if (typeof base44.auth?.getToken === 'function') return await base44.auth.getToken();
  } catch { /* ignorieren */ }
  return null;
}

/** Kopfzeilen für einen Aufruf: Inhaltstyp, App-Kennung, Funktions-Version, Token. */
export async function assistentHeaders() {
  const token = await holeToken();
  return {
    'content-type': 'application/json',
    'X-App-Id': String(appParams.appId),
    ...(appParams.functionsVersion ? { 'Base44-Functions-Version': appParams.functionsVersion } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}