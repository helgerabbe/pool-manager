/**
 * createEinheitMitDefaults
 * ────────────────────────
 * Atomare Erstellung: Einheit → Themenfeld → Lernpaket (mit Default-Phasen)
 *
 * POST /  payload: { metaData: { fach, titel_der_einheit, jahrgangsstufe, ... } }
 * Returns: { einheit, member, themenfeld, lernpaket }
 *
 * @MIGRATION_NOTE (Supabase):
 *   In Base44/Node.js ist diese Sequenz nicht wirklich atomar: Stürzt der
 *   Prozess nach einem Teilschritt ab, können unvollständige Entwürfe
 *   entstehen. In Supabase muss dieser Flow als RPC/Stored Procedure mit
 *   BEGIN ... COMMIT umgesetzt werden, damit Einheit, Membership,
 *   Themenfeld und Lernpaket entweder vollständig oder gar nicht geschrieben
 *   werden.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_PHASEN_KONFIGURATION = {
  Input:     { disabled: false, selected_aktivitaet_id: null, field_values: {} },
  Übung:     { disabled: false, selected_aktivitaet_id: null, field_values: {} },
  Abschluss: { disabled: false, selected_aktivitaet_id: null, field_values: {} },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { metaData } = body;

    if (!metaData?.fach || !metaData?.titel_der_einheit || !metaData?.jahrgangsstufe) {
      return Response.json({ error: 'Fehlende Pflichtfelder: fach, titel_der_einheit, jahrgangsstufe' }, { status: 400 });
    }

    // Schritt 1: Einheit anlegen (als Entwurf – unsichtbar für andere User bis Wizard abgeschlossen)
    const einheit = await base44.asServiceRole.entities.Einheiten.create({
      ...metaData,
      wizard_status: 'entwurf',
      freigabe_status: 'Freigegeben für Bearbeitung',
      sync_status: 'new',
    });

    // Schritt 2: Ersteller als Leitung eintragen, damit reguläre Lehrkräfte
    // ihre frisch erstellte Einheit sofort wieder laden und bearbeiten können.
    const member = await base44.asServiceRole.entities.EinheitMembers.create({
      einheit_id: einheit.id,
      user_email: user.email,
      unit_role: 'LEITUNG',
    });

    // Schritt 3: Erstes Themenfeld anlegen.
    const themenfeld = await base44.asServiceRole.entities.Themenfeld.create({
      einheit_id: einheit.id,
      titel: 'Themenfeld 1',
      reihenfolge: 1,
      content_status: 'approved',
      sync_status: 'new',
    });

    // Schritt 4: Erstes Lernpaket mit Default-Phasen anlegen.
    const lernpaket = await base44.asServiceRole.entities.Lernpakete.create({
      einheit_id: einheit.id,
      themenfeld_id: themenfeld.id,
      reihenfolge_nummer: 1,
      titel_des_pakets: 'Lernpaket 1',
      phasen_konfiguration: DEFAULT_PHASEN_KONFIGURATION,
      content_status: 'draft',
      sync_status: 'new',
    });

    return Response.json({ einheit, member, themenfeld, lernpaket });
  } catch (error) {
    console.error('[createEinheitMitDefaults] Error:', error);
    return Response.json({ error: error.message || 'Interner Fehler' }, { status: 500 });
  }
});