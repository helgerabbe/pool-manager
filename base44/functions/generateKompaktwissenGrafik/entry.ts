/**
 * functions/generateKompaktwissenGrafik
 *
 * Erstellt aus dem Kompaktwissen-Text eine schülergerechte Übersichtsgrafik
 * (Merkbild / Lernposter) per KI. Rückgabe: { success, url }.
 *
 * Body: { text }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text = '' } = await req.json().catch(() => ({}));
    const inhalt = String(text).trim().slice(0, 3000);
    if (!inhalt) {
      return Response.json({ success: false, error: 'Es ist noch kein Kompaktwissen-Text vorhanden, aus dem eine Grafik erstellt werden könnte.' });
    }

    const prompt = [
      'Erstelle eine übersichtliche, schülergerechte Lernposter-Grafik (Merkblatt) zu den folgenden Lerninhalten.',
      'Stil: klare, moderne Infografik, flache Vektor-Optik, dunkelblaue Grundfarbe mit orangen und hellblauen Akzenten,',
      'weißer Hintergrund, viel Weißraum, klare Boxen und Pfeile, gut lesbare Schrift in normaler Groß-/Kleinschreibung.',
      'Nutze KURZE deutsche Beschriftungen (Stichworte, keine langen Sätze), keine erfundenen Fachbegriffe, keine Rechtschreibfehler.',
      'Kein Rahmen wie ein Fotorahmen, keine Personen, keine Logos.',
      '',
      'Lerninhalte:',
      inhalt,
    ].join('\n');

    const res = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    const url = res?.url || res?.data?.url;
    if (!url) return Response.json({ success: false, error: 'Die Grafik konnte nicht erstellt werden.' });

    return Response.json({ success: true, url });
  } catch (error) {
    console.error('[generateKompaktwissenGrafik] error', error);
    return Response.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}