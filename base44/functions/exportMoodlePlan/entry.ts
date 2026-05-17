/**
 * exportMoodlePlan.js
 *
 * Read-only Export-Endpunkt: erzeugt die Moodle-Payload, verändert aber keinen
 * sync_status. Statuswechsel erfolgen ausschließlich nach erfolgreichem Import
 * über confirmExportCompletion.
 *
 * Supabase-Migrationsnotiz:
 * Die komplette Payload-Struktur inkl. Delta-Filterung kann später direkt per
 * PostgreSQL json_build_object/json_agg erzeugt werden. Damit entfallen die
 * manuellen Backend-Queries und Aggregationen vollständig.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLEN = { ADMIN: 'Administrator', FACHSCHAFT: 'Fachschaftsleitung' };
const PAGE_SIZE = 500;

async function listAll(entity, query) {
  const all = [];
  let skip = 0;

  while (true) {
    const page = await entity.filter(query, 'created_date', PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

async function listAllForPaketIds(entity, paketIds, fieldName = 'lernpaket_id') {
  if (paketIds.length === 0) return [];
  const pages = await Promise.all(
    paketIds.map((paketId) => listAll(entity, { [fieldName]: paketId }))
  );
  return pages.flat();
}

async function checkRole(base44, user, allowedRollen, einheitFach = null) {
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role === 'admin') {
    return null;
  }

  const profile = await listAll(base44.asServiceRole.entities.Benutzer, { user_id: user.email });
  const profil = profile[0];
  if (!profil) return Response.json({ error: 'Kein Benutzerprofil' }, { status: 403 });

  if (!allowedRollen.includes(profil.rolle)) {
    return Response.json({ error: `Keine Berechtigung für den Export. Erforderlich: ${allowedRollen.join(' oder ')}` }, { status: 403 });
  }

  if (einheitFach && profil.rolle !== ROLLEN.ADMIN) {
    const faecher = profil.fachbereich_zustaendigkeit || [];
    if (!faecher.includes(einheitFach)) {
      return Response.json({ error: `Keine Zuständigkeit für Fach "${einheitFach}"` }, { status: 403 });
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await req.json().catch(() => ({}));
    const { einheitId, exportType } = body;

    if (!einheitId || !['full', 'delta'].includes(exportType)) {
      return Response.json(
        { error: 'Invalid einheitId or exportType' },
        { status: 400 }
      );
    }

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    const roleError = await checkRole(base44, user, [ROLLEN.ADMIN, ROLLEN.FACHSCHAFT], einheit.fach);
    if (roleError) return roleError;

    const lernpakete = await listAll(e.Lernpakete, { einheit_id: einheitId });
    const paketIds = lernpakete.map((paket) => paket.id);

    const [lernziele, aufgabenbausteine] = await Promise.all([
      listAllForPaketIds(e.Lernziele, paketIds),
      listAllForPaketIds(e.Aufgabenbausteine, paketIds),
    ]);

    let filteredLernpakete = lernpakete;
    let filteredLernziele = lernziele;
    let filteredAufgabenbausteine = aufgabenbausteine;

    if (exportType === 'delta') {
      filteredLernpakete = lernpakete.filter(
        (p) => p.sync_status === 'new' || p.sync_status === 'modified'
      );
      filteredLernziele = lernziele.filter(
        (z) => z.sync_status === 'new' || z.sync_status === 'modified'
      );
      filteredAufgabenbausteine = aufgabenbausteine.filter(
        (a) => a.sync_status === 'new' || a.sync_status === 'modified'
      );
    }

    const moodleSections = filteredLernpakete.map((paket) => {
      const paketLernziele = filteredLernziele.filter(
        (z) => z.lernpaket_id === paket.id
      );
      const paketAufgaben = filteredAufgabenbausteine.filter(
        (a) => a.lernpaket_id === paket.id
      );

      const activities = [];
      const phasenConfig = paket.phasen_konfiguration || {};

      ['Input', 'Übung', 'Abschluss'].forEach((phase) => {
        const phaseData = phasenConfig[phase];
        if (phaseData && !phaseData.disabled && phaseData.field_values) {
          const fieldValues = phaseData.field_values;
          activities.push({
            phase,
            type: 'Activity',
            task_description: fieldValues.task_description || null,
            config: fieldValues,
            sync_status: paket.sync_status,
          });
        }
      });

      paketAufgaben.forEach((aufgabe) => {
        activities.push({
          type: aufgabe.baustein_typ,
          name: aufgabe.aufgabentext_inhalt ? aufgabe.aufgabentext_inhalt.substring(0, 50) : 'Aufgabe',
          content: aufgabe.aufgabentext_inhalt,
          sync_status: aufgabe.sync_status,
        });
      });

      return {
        section_name: `${paket.reihenfolge_nummer}. ${paket.titel_des_pakets}`,
        duration_minutes: paket.geschaetzte_dauer_minuten,
        learning_goals: paketLernziele.map((z) => ({
          formulierung_fachsprache: z.formulierung_fachsprache,
          kategorie: z.kategorie,
          schueler_uebersetzung: z.schueler_uebersetzung,
        })),
        activities,
        sync_status: paket.sync_status,
      };
    });

    return Response.json({
      export_timestamp: new Date().toISOString(),
      export_type: exportType,
      unit_name: einheit.titel_der_einheit,
      unit_subject: einheit.fach,
      unit_grade: einheit.jahrgangsstufe,
      unit_navigation_logic: einheit.navigationslogik,
      sections: moodleSections,
      summary: {
        total_sections: moodleSections.length,
        total_activities: moodleSections.reduce((sum, section) => sum + section.activities.length, 0),
        total_learning_goals: moodleSections.reduce((sum, section) => sum + section.learning_goals.length, 0),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
});