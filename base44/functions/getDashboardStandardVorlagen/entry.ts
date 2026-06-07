import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getDashboardStandardVorlagen
 *
 * Liefert alle DashboardStandardVorlage-Records (eine pro Lerntyp).
 * Lesend für jeden eingeloggten Nutzer erlaubt (das Cockpit nutzt die
 * Vorlagen beim Lazy-Init und beim „Auf Standard zurücksetzen").
 *
 * Das Zusammenführen mit dem Hardcode-Fallback passiert clientseitig
 * (lib/dashboardStandardVorlage.js) — diese Funktion gibt einfach den
 * Roh-Bestand zurück.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vorlagen = await base44.asServiceRole.entities.DashboardStandardVorlage.list();
    return Response.json({ vorlagen: vorlagen || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});