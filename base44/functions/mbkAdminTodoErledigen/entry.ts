/**
 * mbkAdminTodoErledigen
 *
 * Setzt einen externen Punkt aus der MBK-Rückmeldung (MbkAdminTodo) auf
 * 'erledigt' oder wieder auf 'offen'. Diese Punkte betreffen Arbeiten außerhalb
 * des Pool-Managers (Moodle-Abgaben, KI-Prompts) und liegen deshalb bei der
 * Administration, nicht bei der Lehrkraft.
 *
 * Payload: { todo_id, status: 'offen' | 'erledigt' }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur Administratoren dürfen diese Punkte abhaken.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const todoId = body?.todo_id;
    const status = body?.status;
    if (!todoId || !['offen', 'erledigt'].includes(status)) {
      return Response.json({ error: 'todo_id und gültiger status sind erforderlich' }, { status: 400 });
    }

    const jetzt = new Date().toISOString();
    const aktualisiert = await base44.asServiceRole.entities.MbkAdminTodo.update(todoId, {
      status,
      erledigt_von: status === 'erledigt' ? user.email : '',
      erledigt_am: status === 'erledigt' ? jetzt : null,
    });

    return Response.json({ ok: true, todo: aktualisiert });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}