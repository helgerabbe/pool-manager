import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

/** Admin: Ist der Studyflix-Partner-Key hinterlegt, wie groß ist der Katalog? Der Key selbst wird nie zurückgegeben. */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const anzahl = await base44.entities.StudyflixVideo.count({});
    return Response.json({ key_hinterlegt: !!secrets.get('STUDYFLIX_PARTNER_KEY'), anzahl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}