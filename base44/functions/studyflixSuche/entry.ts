import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Sucht im Studyflix-Katalog und ergänzt die Einbett-Adressen mit dem geschützten Partner-Key. */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { suche = '', fachbereich = '' } = await req.json().catch(() => ({}));
    if (!suche.trim() && !fachbereich.trim()) return Response.json({ error: 'Suchbegriff fehlt.' }, { status: 400 });

    const query = { status: 'Veröffentlicht' };
    if (suche.trim()) {
      const re = { $regex: esc(suche.trim()), $options: 'i' };
      query.$or = [{ titel: re }, { themen: re }, { playlist: re }, { kurzbeschreibung: re }];
    }
    if (fachbereich.trim()) query.fachbereiche = { $regex: esc(fachbereich.trim()), $options: 'i' };

    const page = await base44.entities.StudyflixVideo.filter(query, { sort: 'titel', limit: 30 });
    const key = encodeURIComponent(secrets.get('STUDYFLIX_PARTNER_KEY') || '');
    const videos = (page.items || []).map((v) => ({
      video_id: v.video_id, titel: v.titel, dauer: v.dauer, kurzbeschreibung: v.kurzbeschreibung,
      themen: v.themen, fachbereiche: v.fachbereiche, zielgruppen: v.zielgruppen, thumbnail_url: v.thumbnail_url,
      video_embed: `https://studyflix.de/embed?partner_key=${key}&id=${v.video_id}`,
      artikel_embed: `https://studyflix.de/embed_article?partner_key=${key}&id=${v.video_id}`,
      quiz_embed: `https://studyflix.de/embed_quiz?partner_key=${key}&id=${v.video_id}`,
    }));
    return Response.json({ videos, mehr: !!page.has_more });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}