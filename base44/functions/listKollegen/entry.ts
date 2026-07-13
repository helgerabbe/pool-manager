/**
 * listKollegen
 *
 * Gibt alle aktiven Benutzer (alle Rollen) als Kollegen-Liste zurück —
 * für das "An Kollegen weitergeben"-Dropdown im Privatbereich.
 * Zugriff: jeder authentifizierte User (bewusst nur Name + E-Mail + Rolle).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const PAGE_SIZE = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const all = [];
    let skip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.Benutzer.filter(
        { ist_aktiv: true }, 'nachname', PAGE_SIZE, skip
      );
      if (!page || page.length === 0) break;
      all.push(...page);
      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    const kollegen = all
      .filter((b) => b.user_id && b.user_id !== user.email)
      .map((b) => ({
        email: b.user_id,
        full_name: `${b.vorname || ''} ${b.nachname || ''}`.trim() || b.user_id,
        rolle: b.rolle,
      }));

    return Response.json({ kollegen });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});