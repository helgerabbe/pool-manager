import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Rollenvergabe beim Login (IServ-SSO): Steht die E-Mail in den
// Schueler-Stammdaten, wird das Konto verknuepft und die Rolle auf
// 'schueler' gesetzt. Admins und bereits zugeordnete Konten bleiben unberuehrt.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'user') return Response.json({ role: user.role });

    const email = (user.email || '').toLowerCase();
    const treffer = await base44.asServiceRole.entities.Schueler.filter({ email }, '-created_date', 1);
    const schueler = treffer[0];
    if (!schueler) return Response.json({ role: user.role });

    if (schueler.user_id !== user.id) {
      await base44.asServiceRole.entities.Schueler.update(schueler.id, { user_id: user.id });
    }
    await base44.asServiceRole.entities.User.update(user.id, { role: 'schueler' });
    return Response.json({ role: 'schueler' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}