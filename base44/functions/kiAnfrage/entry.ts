/**
 * kiAnfrage — KI-Aufruf für das Frontend (Stunden-Grobentwurf/Feinplanung).
 * Nutzt den Anthropic-Schlüssel aus den Admin-Einstellungen; Internetsuche
 * und Dateianhänge laufen weiter über die Plattform-KI (siehe kiAufruf).
 * Payload: dieselben Felder wie Core.InvokeLLM.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { kiAufruf } from '../../shared/anthropicClient.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    const { prompt, response_json_schema, file_urls, add_context_from_internet, model } = await req.json();
    if (!prompt) return Response.json({ error: 'prompt fehlt' }, { status: 400 });
    const ergebnis = await kiAufruf(base44, { prompt, response_json_schema, file_urls, add_context_from_internet, model });
    return Response.json({ ergebnis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}