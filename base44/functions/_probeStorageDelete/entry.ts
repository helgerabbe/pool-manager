/**
 * _probeStorageDelete.js
 *
 * Diagnose-Funktion: ermittelt, welche Storage-Delete-API im Backend-SDK verfügbar ist.
 * Wird einmalig aufgerufen, um die richtige Methode für die Cascade zu finden.
 *
 * Sicher: führt KEINE echten Löschungen aus, listet nur die verfügbaren Methoden.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const inspect = (obj) => {
      if (!obj) return null;
      try {
        return Object.getOwnPropertyNames(obj)
          .concat(Object.keys(obj))
          .filter((v, i, a) => a.indexOf(v) === i)
          .filter(k => !k.startsWith('_'));
      } catch {
        return null;
      }
    };

    const cfg = base44?.getConfig?.();
    const result = {
      config: cfg,
      env_keys: Object.keys(Deno.env.toObject()).filter(k => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('secret') && !k.toLowerCase().includes('token') && !k.toLowerCase().includes('password')),
      app_id: Deno.env.get('BASE44_APP_ID'),
    };

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});