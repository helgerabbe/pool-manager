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
    const { metaData, istBasismodul, privat } = body;

    if (!metaData?.fach || !metaData?.titel_der_einheit || !metaData?.jahrgangsstufe) {
      return Response.json({ error: 'Fehlende Pflichtfelder: fach, titel_der_einheit, jahrgangsstufe' }, { status: 400 });
    }

    // ── RBAC (2026-07-18): ÖFFENTLICHE Einheiten dürfen nur Administratoren
    // und die zuständige Fachschaftsleitung erstellen (fach_ausnahmen-
    // Herabstufung wird beachtet). PRIVATE Einheiten darf jede schreibende
    // Rolle (auch Fachlehrkraft) im eigenen Privatbereich anlegen.
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const benutzer = benutzerList?.[0];
    const istAdmin = user.role === 'admin' || benutzer?.rolle === 'Administrator';

    if (privat === true) {
      const schreibRollen = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft'];
      if (!istAdmin && !schreibRollen.includes(benutzer?.rolle)) {
        return Response.json({ error: 'Keine Berechtigung, Einheiten zu erstellen.' }, { status: 403 });
      }
    } else {
      const ausnahme = (benutzer?.fach_ausnahmen || []).find((a) => a?.fach === metaData.fach);
      const effektiveRolle = ausnahme ? ausnahme.rolle : benutzer?.rolle;
      const zustaendig = (benutzer?.fachbereich_zustaendigkeit || []).includes(metaData.fach);
      const istZustaendigeFachschaft = effektiveRolle === 'Fachschaftsleitung' && zustaendig;
      if (!istAdmin && !istZustaendigeFachschaft) {
        return Response.json(
          { error: 'Öffentliche Einheiten können nur von der zuständigen Fachschaftsleitung oder Administratoren erstellt werden. Tipp: Erstellen Sie die Einheit stattdessen privat.' },
          { status: 403 }
        );
      }
    }

    // Schritt 1: Einheit anlegen (als Entwurf – unsichtbar für andere User bis Wizard abgeschlossen)
    // istBasismodul=true stempelt diese Einheit als Basismodul. Identischer Wizard,
    // nur das Flag unterscheidet eine reguläre Einheit von einem Basismodul.
    const einheit = await base44.asServiceRole.entities.Einheiten.create({
      ...metaData,
      ist_basismodul: istBasismodul === true,
      // Privat-Modus: Einheit direkt im Privatbereich des Erstellers anlegen.
      ...(privat === true ? { sichtbarkeit: 'privat', besitzer_email: user.email } : {}),
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