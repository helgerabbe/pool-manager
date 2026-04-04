import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email, rolle } = body;

    if (!email || !rolle) {
      return Response.json({ error: 'Email und Rolle sind erforderlich' }, { status: 400 });
    }

    // AuditLog-Eintrag schreiben
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'CREATE',
      resource_type: 'inviteUserSecure',
      resource_id: email,
      changes: { email, invited_role: rolle },
      status: 'success'
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('[inviteUserSecure] Fehler:', error);
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});