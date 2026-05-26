import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_ROLES = ['Administrator', 'Admin'];
const INVITE_ROLES = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft', 'Betrachter', 'Moodle-Designer'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const benutzerProfile = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email.toLowerCase(),
    });
    const benutzerRolle = benutzerProfile[0]?.rolle;
    const isAdmin = user.role === 'admin' || ADMIN_ROLES.includes(user.role) || ADMIN_ROLES.includes(benutzerRolle);

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const rolle = INVITE_ROLES.includes(body.rolle) ? body.rolle : 'Fachlehrkraft';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Gültige E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    const platformRole = rolle === 'Administrator' ? 'admin' : 'user';
    await base44.users.inviteUser(email, platformRole);

    const existing = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const benutzerPayload = {
      user_id: email,
      vorname: body.vorname || '',
      nachname: body.nachname || '',
      rolle,
      fachbereich_zustaendigkeit: Array.isArray(body.fachbereich_zustaendigkeit)
        ? body.fachbereich_zustaendigkeit
        : Array.isArray(body.faecher)
          ? body.faecher
          : [],
      ist_aktiv: true,
    };

    const benutzer = existing[0]
      ? await base44.asServiceRole.entities.Benutzer.update(existing[0].id, benutzerPayload)
      : await base44.asServiceRole.entities.Benutzer.create(benutzerPayload);

    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'CREATE',
      resource_type: 'inviteUserSecure',
      resource_id: email,
      changes: { email, invited_role: rolle, platform_role: platformRole },
      status: 'success',
    });

    return Response.json({ success: true, benutzer });
  } catch (error) {
    console.error('[inviteUserSecure] Fehler:', error);
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});