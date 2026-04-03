import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * approvePackageActivities
 *
 * Setzt content_status = 'approved' für alle LernpaketPhaseAktivitaet
 * die zu einem Paket gehören.
 *
 * Params:
 *   paketId  (string) – Pflicht
 *   force    (boolean) – wenn true: unvollständige Aktivitäten mit Standardwerten auffüllen
 *
 * Rückgabe:
 *   { success, approvedCount, incompleteCount, incomplete: [{id, name}] }
 *   Wenn force=false und es unvollständige gibt → success=false, incomplete=[...]
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paketId, force = false } = await req.json();

    if (!paketId) {
      return Response.json({ error: 'paketId is required' }, { status: 400 });
    }

    // Alle Aktivitäten dieses Pakets laden
    const allActivities = await base44.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: paketId
    });

    // Aktivitätskatalog laden um Names zu haben
    const katalog = await base44.entities.AktivitaetenKatalog.list();
    const katalogMap = Object.fromEntries(katalog.map(k => [k.id, k]));

    // Prüfe welche Aktivitäten unvollständig sind
    const incomplete = [];
    for (const activity of allActivities) {
      if (!activity.is_complete) {
        const katalogEntry = katalogMap[activity.aktivitaet_id];
        const name = katalogEntry?.name || 'Unbekannte Aktivität';
        incomplete.push({ id: activity.id, name });
      }
    }

    // Wenn es unvollständige gibt und force=false → abbrechen und zurückgeben
    if (incomplete.length > 0 && !force) {
      return Response.json({
        success: false,
        needsConfirmation: true,
        incompleteCount: incomplete.length,
        totalCount: allActivities.length,
        incomplete,
      });
    }

    // Alle Aktivitäten freigeben (content_status = 'approved')
    let approvedCount = 0;
    for (const activity of allActivities) {
      const updateData = { content_status: 'approved' };

      // Bei unvollständigen Aktivitäten + force: Standardwerte setzen
      if (!activity.is_complete && force) {
        const katalogEntry = katalogMap[activity.aktivitaet_id];
        if (katalogEntry?.form_schema) {
          const defaultFieldValues = {};
          for (const field of katalogEntry.form_schema) {
            if (field.required && !activity.field_values?.[field.field_name]) {
              defaultFieldValues[field.field_name] = field.placeholder || `[${field.label}]`;
            }
          }
          if (Object.keys(defaultFieldValues).length > 0) {
            updateData.field_values = { ...(activity.field_values || {}), ...defaultFieldValues };
          }
        }
        updateData.is_complete = true;
      }

      await base44.entities.LernpaketPhaseAktivitaet.update(activity.id, updateData);
      approvedCount++;
    }

    return Response.json({
      success: true,
      approvedCount,
      incompleteCount: incomplete.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});