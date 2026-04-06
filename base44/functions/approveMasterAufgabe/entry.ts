/**
 * approveMasterAufgabe.js
 *
 * Setzt content_status auf einer MasterAufgabe auf 'approved' oder 'draft'.
 * Einfache Funktion ohne komplexe Scope-Validierung – nur Auth-Check.
 *
 * Parameter:
 * - masterId: MasterAufgabe ID
 * - action: 'approve' | 'unapprove'
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterId, action = 'approve' } = await req.json();

    if (!masterId) {
      return Response.json({ error: 'Missing masterId' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'draft';

    await base44.asServiceRole.entities.MasterAufgabe.update(masterId, {
      content_status: newStatus,
    });

    return Response.json({ success: true, masterId, newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});