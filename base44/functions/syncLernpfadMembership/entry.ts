/**
 * syncLernpfadMembership
 *
 * Idempotente Synchronisation der Junction-Tabelle `LernpfadAufgabeMembership`
 * mit der `lernpfade_konfiguration` einer Einheit.
 *
 * Wird vom Cockpit (Tab 7) nach jedem Save aufgerufen. Hält den `pfad_status`
 * bestehender Einträge stabil (locked_for_export ↔ draft) und legt nur fehlende
 * Memberships als `draft` an. Memberships, deren Aufgabe nicht mehr im Pfad
 * vorkommt, werden gelöscht (CASCADE bei Item-Removal).
 *
 * Payload: { einheitId: string }
 * Auth   : eingeloggter Nutzer (RBAC für Edit kommt aus dem Structural-Lock).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId } = await req.json();
    if (!einheitId) {
      return Response.json({ error: 'einheitId required' }, { status: 400 });
    }

    // Aktuellen Stand der Einheit laden (asServiceRole, damit auch ohne RLS-Zugriff
    // gelesen werden kann – die Schreibrechte werden ohnehin clientseitig durchs Lock geprüft).
    let einheit;
    try {
      einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    } catch (err) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }
    if (!einheit) {
      return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    }

    const konfig = einheit.lernpfade_konfiguration || {};

    // SOLL-Zustand aus der konfiguration ableiten:
    // Map<aufgabe_id, Map<lerntyp, sektor_id>>
    const desired = new Map();
    for (const lerntyp of VALID_LERNTYPEN) {
      const sektoren = Array.isArray(konfig[lerntyp]) ? konfig[lerntyp] : [];
      for (const sektor of sektoren) {
        const items = Array.isArray(sektor?.items) ? sektor.items : [];
        for (const item of items) {
          if (!item || item.type !== 'aufgabe' || !item.ref_id) continue;
          if (!desired.has(item.ref_id)) desired.set(item.ref_id, new Map());
          desired.get(item.ref_id).set(lerntyp, sektor.sektor_id);
        }
      }
    }

    // IST-Zustand: alle Memberships dieser Einheit laden.
    const existing = await base44.asServiceRole.entities.LernpfadAufgabeMembership.filter({
      einheit_id: einheitId,
    });

    const summary = { created: 0, updated: 0, deleted: 0 };

    // 1. Bestehende durchgehen → entweder behalten/aktualisieren oder löschen.
    for (const m of existing || []) {
      const desiredForAufgabe = desired.get(m.aufgabe_id);
      const desiredSektor = desiredForAufgabe?.get(m.lerntyp);

      if (!desiredSektor) {
        // Aufgabe ist in diesem Lerntyp nicht mehr enthalten → löschen.
        await base44.asServiceRole.entities.LernpfadAufgabeMembership.delete(m.id);
        summary.deleted += 1;
        continue;
      }

      // Eintrag bleibt – ggf. sektor_id anpassen, pfad_status NIEMALS verändern.
      if (m.sektor_id !== desiredSektor) {
        await base44.asServiceRole.entities.LernpfadAufgabeMembership.update(m.id, {
          sektor_id: desiredSektor,
        });
        summary.updated += 1;
      }

      // Aus desired entfernen, damit am Ende nur noch fehlende übrig bleiben.
      desiredForAufgabe.delete(m.lerntyp);
      if (desiredForAufgabe.size === 0) desired.delete(m.aufgabe_id);
    }

    // 2. Restliche desired-Einträge sind neu anzulegen (immer als 'draft').
    for (const [aufgabe_id, lerntypMap] of desired.entries()) {
      for (const [lerntyp, sektor_id] of lerntypMap.entries()) {
        await base44.asServiceRole.entities.LernpfadAufgabeMembership.create({
          einheit_id: einheitId,
          aufgabe_id,
          lerntyp,
          sektor_id,
          pfad_status: 'draft',
        });
        summary.created += 1;
      }
    }

    return Response.json({ ok: true, summary });
  } catch (error) {
    console.error('[syncLernpfadMembership] Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});