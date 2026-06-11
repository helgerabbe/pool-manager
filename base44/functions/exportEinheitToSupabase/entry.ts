/**
 * exportEinheitToSupabase — Export-Brücke (Phase 3 der Schülerbereich-Migration).
 *
 * Schreibt eine veröffentlichte Einheit inkl. aller Inhalte in die
 * Supabase-Inhaltstabellen (siehe docs/migration/supabase-schema.sql),
 * damit der statische Schüler-Build (VITE_BACKEND=supabase) sie lesen kann.
 *
 * Strategie pro Einheit: Einheit upserten, danach alle Kind-Daten löschen
 * (FK-Cascade räumt lernpaket_aktivitaeten/master_aufgaben/lernziele mit ab)
 * und frisch einfügen → keine veralteten Zeilen. Globale Referenzdaten
 * (aktivitaeten_katalog, system_bausteine) werden per Upsert aktualisiert.
 *
 * Tombstones (sync_status='to_delete') werden NICHT exportiert.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const ERLAUBTE_ROLLEN = ['Administrator', 'Fachschaftsleitung', 'Moodle-Designer'];

function ohneTombstones(rows) {
  return (rows || []).filter((r) => r.sync_status !== 'to_delete');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Berechtigung: Base44-Admin oder App-Rolle aus der Benutzer-Entity.
    let erlaubt = user.role === 'admin';
    if (!erlaubt) {
      const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
      erlaubt = ERLAUBTE_ROLLEN.includes(benutzer?.[0]?.rolle);
    }
    if (!erlaubt) {
      return Response.json({ error: 'Forbidden: keine Export-Berechtigung' }, { status: 403 });
    }

    const { einheitId } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId fehlt' }, { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: 'Supabase-Secrets nicht konfiguriert' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ── 1) Daten aus Base44 laden ───────────────────────────────────────────
    const sr = base44.asServiceRole.entities;
    const einheit = await sr.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const [themenfelder, lernpaketeRaw, aufgabenRaw, katalog, bausteine, snapshots] =
      await Promise.all([
        sr.Themenfeld.filter({ einheit_id: einheitId }),
        sr.Lernpakete.filter({ einheit_id: einheitId }),
        sr.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
        sr.AktivitaetenKatalog.list(),
        sr.SystemBausteine.list(),
        sr.SchuelerInhaltSnapshot.filter({ einheit_id: einheitId }),
      ]);

    const lernpakete = ohneTombstones(lernpaketeRaw);
    const aufgaben = ohneTombstones(aufgabenRaw);

    // Aktivitäten, MasterAufgaben und Lernziele pro Lernpaket.
    const [aktivitaetenListen, masterListen, lernzielListen] = await Promise.all([
      Promise.all(lernpakete.map((p) => sr.LernpaketPhaseAktivitaet.filter({ lernpaket_id: p.id }))),
      Promise.all(lernpakete.map((p) => sr.MasterAufgabe.filter({ lernpaket_id: p.id }))),
      Promise.all(lernpakete.map((p) => sr.Lernziele.filter({ lernpaket_id: p.id }))),
    ]);
    const aktivitaeten = ohneTombstones(aktivitaetenListen.flat());
    const aktivitaetIds = new Set(aktivitaeten.map((a) => a.id));
    const masterAufgaben = masterListen.flat()
      .filter((m) => m.sync_status !== 'to_delete' && aktivitaetIds.has(m.activity_id));
    const lernziele = lernzielListen.flat();

    // ── 2) Nach Supabase schreiben ──────────────────────────────────────────
    const fail = (schritt, error) => {
      throw new Error(`Supabase-Fehler bei '${schritt}': ${error.message}`);
    };

    // Einheit upserten.
    {
      const { error } = await supabase.from('einheiten').upsert({
        id: einheit.id,
        fach: einheit.fach,
        titel_der_einheit: einheit.titel_der_einheit,
        jahrgangsstufe: einheit.jahrgangsstufe ?? null,
        lernpfade_konfiguration: einheit.lernpfade_konfiguration || {},
        onboarding_konfiguration: einheit.onboarding_konfiguration || {},
        daten: einheit,
        exportiert_am: new Date().toISOString(),
      });
      if (error) fail('einheiten', error);
    }

    // Kind-Daten der Einheit leeren (lernpakete-Cascade räumt Aktivitäten,
    // MasterAufgaben und Lernziele mit ab).
    for (const table of ['themenfelder', 'lernpakete', 'allgemeine_aufgaben', 'inhalt_snapshots']) {
      const { error } = await supabase.from(table).delete().eq('einheit_id', einheitId);
      if (error) fail(`${table} (delete)`, error);
    }

    // Globale Referenzdaten upserten.
    if (katalog.length > 0) {
      const { error } = await supabase.from('aktivitaeten_katalog').upsert(
        katalog.map((k) => ({
          id: k.id,
          name: k.name,
          phase: k.phase,
          thumbnail_url: k.thumbnail_url ?? null,
          supports_master: !!k.supports_master,
          form_schema: k.form_schema || [],
          daten: k,
        }))
      );
      if (error) fail('aktivitaeten_katalog', error);
    }
    if (bausteine.length > 0) {
      const { error } = await supabase.from('system_bausteine').upsert(
        bausteine.map((b) => ({
          id: b.id,
          baustein_id: b.baustein_id,
          titel: b.titel,
          icon: b.icon ?? null,
          typ: b.typ || 'baustein',
          admin_beschreibung: b.admin_beschreibung ?? null,
          daten: b,
        })),
        { onConflict: 'baustein_id' }
      );
      if (error) fail('system_bausteine', error);
    }

    // Einheits-Inhalte frisch einfügen.
    if (themenfelder.length > 0) {
      const { error } = await supabase.from('themenfelder').insert(
        themenfelder.map((t) => ({
          id: t.id,
          einheit_id: einheitId,
          titel: t.titel,
          beschreibung: t.beschreibung ?? null,
          reihenfolge: t.reihenfolge ?? null,
          daten: t,
        }))
      );
      if (error) fail('themenfelder', error);
    }
    if (lernpakete.length > 0) {
      const { error } = await supabase.from('lernpakete').insert(
        lernpakete.map((p) => ({
          id: p.id,
          einheit_id: einheitId,
          themenfeld_id: p.themenfeld_id ?? null,
          titel_des_pakets: p.titel_des_pakets,
          reihenfolge_nummer: p.reihenfolge_nummer ?? null,
          geschaetzte_dauer_minuten: p.geschaetzte_dauer_minuten ?? null,
          phasen_konfiguration: p.phasen_konfiguration || {},
          daten: p,
        }))
      );
      if (error) fail('lernpakete', error);
    }
    if (aktivitaeten.length > 0) {
      const { error } = await supabase.from('lernpaket_aktivitaeten').insert(
        aktivitaeten.map((a) => ({
          id: a.id,
          lernpaket_id: a.lernpaket_id,
          aktivitaet_id: a.aktivitaet_id,
          phase: a.phase,
          is_master: !!a.is_master,
          master_anzeige_modus: a.master_anzeige_modus || 'shuffle',
          field_values: a.field_values || {},
          daten: a,
        }))
      );
      if (error) fail('lernpaket_aktivitaeten', error);
    }
    if (masterAufgaben.length > 0) {
      const { error } = await supabase.from('master_aufgaben').insert(
        masterAufgaben.map((m) => ({
          id: m.id,
          activity_id: m.activity_id,
          lernpaket_id: m.lernpaket_id,
          titel: m.titel ?? null,
          reihenfolge: m.reihenfolge ?? null,
          field_values: m.field_values || {},
        }))
      );
      if (error) fail('master_aufgaben', error);
    }
    if (lernziele.length > 0) {
      const { error } = await supabase.from('lernziele').insert(
        lernziele.map((z) => ({
          id: z.id,
          lernpaket_id: z.lernpaket_id,
          formulierung_fachsprache: z.formulierung_fachsprache,
          schueler_uebersetzung: z.schueler_uebersetzung ?? null,
          kategorie: z.kategorie ?? null,
        }))
      );
      if (error) fail('lernziele', error);
    }
    if (aufgaben.length > 0) {
      const { error } = await supabase.from('allgemeine_aufgaben').insert(
        aufgaben.map((a) => ({
          id: a.id,
          einheit_id: einheitId,
          themenfeld_id: a.themenfeld_id ?? null,
          titel: a.titel ?? null,
          aufgaben_typ: a.aufgaben_typ || 'inhalt',
          daten: a,
        }))
      );
      if (error) fail('allgemeine_aufgaben', error);
    }
    if (snapshots.length > 0) {
      const { error } = await supabase.from('inhalt_snapshots').insert(
        snapshots.map((s) => ({
          einheit_id: einheitId,
          geltungsbereich: s.geltungsbereich || 'pfad_instanz',
          lerntyp: s.lerntyp ?? null,
          instance_id: s.instance_id ?? null,
          baustein_id: s.baustein_id,
          themenfeld_id: s.themenfeld_id ?? null,
          inhalt: s.inhalt || {},
          generiert_am: s.generiert_am || new Date().toISOString(),
        }))
      );
      if (error) fail('inhalt_snapshots', error);
    }

    return Response.json({
      success: true,
      einheit: einheit.titel_der_einheit,
      counts: {
        themenfelder: themenfelder.length,
        lernpakete: lernpakete.length,
        aktivitaeten: aktivitaeten.length,
        master_aufgaben: masterAufgaben.length,
        lernziele: lernziele.length,
        allgemeine_aufgaben: aufgaben.length,
        snapshots: snapshots.length,
        katalog: katalog.length,
        system_bausteine: bausteine.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});