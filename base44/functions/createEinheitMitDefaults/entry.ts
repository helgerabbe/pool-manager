/**
 * createEinheitMitDefaults
 * ────────────────────────
 * Atomare Erstellung: Einheit → Themenfeld → Lernpaket (mit Default-Phasen)
 *
 * POST /  payload: { metaData: { fach, titel_der_einheit, jahrgangsstufe, ... } }
 * Returns: { einheit, themenfeld, lernpaket }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEFAULT_PHASEN_KONFIGURATION = {
  Input:     { disabled: false, selected_aktivitaet_id: null, field_values: {} },
  Übung:     { disabled: false, selected_aktivitaet_id: null, field_values: {} },
  Abschluss: { disabled: false, selected_aktivitaet_id: null, field_values: {} },
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { metaData } = await req.json();

  if (!metaData?.fach || !metaData?.titel_der_einheit || !metaData?.jahrgangsstufe) {
    return Response.json({ error: 'Fehlende Pflichtfelder: fach, titel_der_einheit, jahrgangsstufe' }, { status: 400 });
  }

  // Schritt 1: Einheit anlegen
  const einheit = await base44.entities.Einheiten.create({
    ...metaData,
    freigabe_status: 'In Planung',
    sync_status: 'new',
  });

  return Response.json({ einheit });
});