import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { beschreibeAufgabenFormat } from '../../shared/aufgabenFormatBeschreibung.js';

/**
 * aufgabenFormatBeschreibungVorschlag
 * ───────────────────────────────────
 * Sieht sich ein Aufgabenformat an und schlägt Name und Funktionsbeschreibung
 * vor — für den Knopf im Bearbeiten-Dialog der Verwaltung.
 *
 * Bewusst NUR ein Vorschlag: Gespeichert wird nichts. Die Administration liest
 * den Text, korrigiert ihn und speichert selbst. Denn diese Beschreibung
 * entscheidet allein darüber, ob das Format später gefunden wird — sie ungesehen
 * festzuschreiben wäre riskanter als sie leer zu lassen.
 *
 * Request  (POST): { id }
 * Response:        { name, beschreibung }
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur für Administratoren.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return Response.json({ error: 'id ist erforderlich.' }, { status: 400 });

    const format = await base44.asServiceRole.entities.AufgabenFormat.get(id).catch(() => null);
    if (!format?.fragment) {
      return Response.json({ error: 'Dieses Format hat keine Aufgabe zum Ansehen.' }, { status: 400 });
    }

    const vorschlag = await beschreibeAufgabenFormat(base44, format.fragment);
    if (!vorschlag?.beschreibung) {
      return Response.json({ error: 'Es kam kein brauchbarer Vorschlag zurück.' }, { status: 502 });
    }

    return Response.json(vorschlag);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}