/**
 * updateMBKGlobalPromptSecure.js
 *
 * Server-seitiges Update eines `MBKGlobalPrompt`-Eintrags. Schreibt mit
 * Service-Role und umgeht damit die Admin-Only RLS auf der Entity, prüft
 * aber selbst hart, dass der Aufrufer die Rolle Administrator oder
 * Moodle-Designer hat. Beide Rollen sollen den Manager pflegen können —
 * RLS ist auf 'admin' gepinnt, daher dieser Wrapper.
 *
 * Payload:
 *   { id: string, prompt_text?: string, anzeigename?: string, ist_aktiv?: boolean }
 *
 * Antwort: { ok: true, updated: object }
 *
 * Hinweis: Re-Deploy-Trigger nach initialer Anlage.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ROLLE_ADMIN = 'Administrator';
const ROLLE_MOODLE = 'Moodle-Designer';

async function logAuditEvent(base44, event) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: 1,
      status: event.status || 'success',
    });
  } catch (err) {
    console.error('[AUDIT_ERROR]', err.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profil = (await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }))?.[0];
    const rolle = profil?.rolle;
    if (rolle !== ROLLE_ADMIN && rolle !== ROLLE_MOODLE) {
      return Response.json(
        { error: 'Forbidden: Nur Administrator oder Moodle-Designer dürfen MBK-Prompts pflegen.' },
        { status: 403 }
      );
    }

    const { id, prompt_text, anzeigename, ist_aktiv } = await req.json();
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.MBKGlobalPrompt.get(id);
    if (!existing) return Response.json({ error: 'Prompt nicht gefunden' }, { status: 404 });

    const update = {};
    if (typeof prompt_text === 'string') update.prompt_text = prompt_text;
    if (typeof anzeigename === 'string' && anzeigename.trim()) update.anzeigename = anzeigename.trim();
    if (typeof ist_aktiv === 'boolean') update.ist_aktiv = ist_aktiv;

    if (Object.keys(update).length === 0) {
      return Response.json({ ok: true, updated: existing, noop: true });
    }

    await base44.asServiceRole.entities.MBKGlobalPrompt.update(id, update);
    const updated = await base44.asServiceRole.entities.MBKGlobalPrompt.get(id);

    await logAuditEvent(base44, {
      user: user.email,
      action: 'UPDATE',
      resource: 'MBKGlobalPrompt',
      resourceId: id,
      changes: { schluessel: existing.schluessel, fields: Object.keys(update) },
      status: 'success',
    });

    return Response.json({ ok: true, updated });
  } catch (error) {
    console.error('[updateMBKGlobalPromptSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});