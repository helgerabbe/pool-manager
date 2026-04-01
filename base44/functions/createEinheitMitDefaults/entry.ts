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

  let themenfeld, lernpaket;
  try {
    // Schritt 2: Default-Themenfeld anlegen
    themenfeld = await base44.entities.Themenfeld.create({
      einheit_id: einheit.id,
      titel: 'Themenfeld 1',
      reihenfolge: 1,
      sync_status: 'new',
    });

    // Schritt 3: Default-Lernpaket mit allen Phasen aktiv
    lernpaket = await base44.entities.Lernpakete.create({
      einheit_id: einheit.id,
      themenfeld_id: themenfeld.id,
      titel_des_pakets: 'Neues Lernpaket',
      reihenfolge_nummer: 1,
      geschaetzte_dauer_minuten: 45,
      phasen_konfiguration: DEFAULT_PHASEN_KONFIGURATION,
      sync_status: 'new',
    });
  } catch (err) {
    // Rollback
    if (themenfeld?.id) await base44.entities.Themenfeld.delete(themenfeld.id).catch(() => {});
    await base44.entities.Einheiten.delete(einheit.id).catch(() => {});
    return Response.json({ error: `Transaktion fehlgeschlagen: ${err.message}` }, { status: 500 });
  }

  return Response.json({ einheit, themenfeld, lernpaket });
});