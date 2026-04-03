import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const requestTracker = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Nur Administratoren dürfen einladen
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur Administratoren dürfen Benutzer einladen' }, { status: 403 });
    }

    // Rate Limiting: max 20 Einladungen pro Minute
    const now = Date.now();
    const userKey = user.email;
    if (!requestTracker.has(userKey)) {
      requestTracker.set(userKey, []);
    }
    const userRequests = requestTracker.get(userKey).filter(t => now - t < 60000);
    if (userRequests.length >= 20) {
      return Response.json({ error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' }, { status: 429 });
    }
    userRequests.push(now);
    requestTracker.set(userKey, userRequests);

    const body = await req.json();
    const { email, rolle } = body;

    if (!email || !rolle) {
      return Response.json({ error: 'Email und Rolle sind erforderlich' }, { status: 400 });
    }

    // Validiere Rolle
    const GUELTIGE_ROLLEN = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft', 'Betrachter', 'Moodle-Designer'];
    if (!GUELTIGE_ROLLEN.includes(rolle)) {
      return Response.json({ error: 'Ungültige Rolle' }, { status: 400 });
    }

    // Nur Admins dürfen andere Admins einladen
    if (rolle === 'Administrator') {
      return Response.json({ error: 'Nur Systemadministratoren können Admin-Benutzer erstellen' }, { status: 403 });
    }

    // Prüfe ob User bereits existiert
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Benutzer mit dieser E-Mail existiert bereits' }, { status: 400 });
    }

    // Sende Einladung
    try {
      await base44.users.inviteUser(email, rolle === 'Administrator' ? 'admin' : 'user');
    } catch (err) {
      console.error('inviteUser error:', err);
      return Response.json({ error: 'Fehler beim Senden der Einladung', details: err.message }, { status: 500 });
    }

    // ✅ Speichere Audit-Log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'CREATE',
        resource_type: 'User',
        resource_id: email,
        changes: { invited_role: rolle },
        status: 'success'
      });
    } catch (e) {
      console.warn('Audit-Log schreiben fehlgeschlagen:', e);
    }

    return Response.json({
      success: true,
      message: `Einladung an ${email} gesendet`,
      email,
      rolle
    });

  } catch (error) {
    console.error('[inviteUserSecure] Fehler:', error);
    return Response.json({ error: error.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});