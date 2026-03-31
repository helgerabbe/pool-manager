import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, exportType } = await req.json();

    if (!einheitId || !['full', 'delta'].includes(exportType)) {
      return Response.json(
        { error: 'Invalid einheitId or exportType' },
        { status: 400 }
      );
    }

    // ──── 1. Hole Einheit ────
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // ──── 2. Hole alle Lernpakete für die Einheit ────
    const lernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      einheit_id: einheitId,
    });

    // ──── 3. Hole alle Lernziele und Aufgabenbausteine ────
    const lernzieleRaw = await base44.asServiceRole.entities.Lernziele.list();
    const aufgabenbausteineRaw = await base44.asServiceRole.entities.Aufgabenbausteine.list();

    const lernziele = lernzieleRaw.filter((z) =>
      lernpakete.some((p) => p.id === z.lernpaket_id)
    );
    const aufgabenbausteine = aufgabenbausteineRaw.filter((a) =>
      lernpakete.some((p) => p.id === a.lernpaket_id)
    );

    // ──── 4. Delta-Filter anwenden ────
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

    // ──── 5. Transformiere in Moodle-Format ────
    const moodleSections = filteredLernpakete.map((paket) => {
      const paketLernziele = filteredLernziele.filter(
        (z) => z.lernpaket_id === paket.id
      );
      const paketAufgaben = filteredAufgabenbausteine.filter(
        (a) => a.lernpaket_id === paket.id
      );

      const activities = [];

      // Sammle Aktivitäten aus den 3 Phasen
      const phasenConfig = paket.phasen_konfiguration || {};
      ['Input', 'Übung', 'Abschluss'].forEach((phase) => {
        const phaseData = phasenConfig[phase];
        if (phaseData && !phaseData.disabled && phaseData.field_values) {
          const fieldValues = phaseData.field_values;
          activities.push({
            phase: phase,
            type: 'Activity',
            config: fieldValues,
            sync_status: paket.sync_status,
          });
        }
      });

      // Füge Aufgabenbausteine hinzu
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
        activities: activities,
        sync_status: paket.sync_status,
      };
    });

    // ──── 6. Update sync_status auf 'exported' ────
    const idsToUpdate = [
      ...filteredLernpakete.map((p) => p.id),
      ...filteredLernziele.map((z) => z.id),
      ...filteredAufgabenbausteine.map((a) => a.id),
    ];

    // Update Lernpakete
    for (const paket of filteredLernpakete) {
      await base44.asServiceRole.entities.Lernpakete.update(paket.id, {
        sync_status: 'exported',
      });
    }

    // Update Lernziele
    for (const ziel of filteredLernziele) {
      await base44.asServiceRole.entities.Lernziele.update(ziel.id, {
        sync_status: 'exported',
      });
    }

    // Update Aufgabenbausteine
    for (const aufgabe of filteredAufgabenbausteine) {
      await base44.asServiceRole.entities.Aufgabenbausteine.update(aufgabe.id, {
        sync_status: 'exported',
      });
    }

    // ──── 7. Gib strukturiertes Export-Objekt zurück ────
    const exportData = {
      export_timestamp: new Date().toISOString(),
      export_type: exportType,
      unit_name: einheit.titel_der_einheit,
      unit_subject: einheit.fach,
      unit_grade: einheit.jahrgangsstufe,
      sections: moodleSections,
      summary: {
        total_sections: moodleSections.length,
        total_activities: moodleSections.reduce((sum, s) => sum + s.activities.length, 0),
        total_learning_goals: moodleSections.reduce((sum, s) => sum + s.learning_goals.length, 0),
      },
    };

    return Response.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});