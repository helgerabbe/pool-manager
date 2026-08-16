import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * KI-Stunden-Coach (MUG Paket 2) — Dialog-Modus
 * ─────────────────────────────────────────────
 * Die Lehrkraft beschreibt frei (Text oder Diktat), was sie vorhat. Der Coach
 * antwortet im Gespräch UND pflegt dabei eine strukturierte "Bauanleitung":
 *   - Steckbrief (Zielgruppe, Thema, Dauer, Leitziel)
 *   - Verlaufsplan (Phase / Zeit / Inhalt & Handlungsschritte / Methode & Sozialform / Material)
 *   - didaktisch-methodische Hinweise
 *
 * Es werden bewusst NOCH KEINE digitalen Aktivitäten erzeugt — das ist die
 * Ebene davor. Die Bauanleitung wird an der Stunde gespeichert und nie
 * verworfen; die Umsetzung in Phasen erfolgt separat im Frontend.
 *
 * payload: { stunde_id, nachricht }
 * returns: { antwort, plan, verlauf }
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stunde_id, nachricht } = await req.json().catch(() => ({}));
    if (!stunde_id || !nachricht?.trim()) {
      return Response.json({ error: 'stunde_id und nachricht sind erforderlich.' }, { status: 400 });
    }

    const stunde = await base44.asServiceRole.entities.Unterrichtsstunde.get(stunde_id);
    if (!stunde) return Response.json({ error: 'Unterrichtsstunde nicht gefunden.' }, { status: 404 });

    const verlauf = Array.isArray(stunde.coach_verlauf) ? stunde.coach_verlauf : [];
    const plan = stunde.coach_plan || {};

    // Verfügbare digitale Aufgabenarten — der Coach darf sie den digitalen
    // Phasen direkt zuordnen (Mit-Erstellung der Aufgabe, MUG 2026-08-16).
    const katalog = (await base44.asServiceRole.entities.AktivitaetenKatalog
      .filter({ is_active: true }, 'name', 200)
      .catch(() => []))
      .map((k) => `- ${k.name}: ${(k.beschreibung || '').slice(0, 180)}`)
      .join('\n');

    const gespraech = verlauf
      .slice(-12)
      .map((m) => `${m.role === 'user' ? 'LEHRKRAFT' : 'COACH'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Du bist ein erfahrener didaktischer Coach und planst gemeinsam mit einer Lehrkraft EINE einzelne Unterrichtsstunde. Du sprichst mit ihr im Gespräch und pflegst dabei eine strukturierte Bauanleitung der Stunde.

Rahmen der Stunde:
- Fach: ${stunde.fach || 'unbekannt'}
- Jahrgangsstufe: ${stunde.jahrgangsstufe || 'unbekannt'}
- Arbeitstitel: ${stunde.arbeitstitel || '(keiner)'}

Bisherige Bauanleitung (JSON, kann leer sein):
${JSON.stringify(plan, null, 2)}

Bisheriges Gespräch:
${gespraech || '(noch kein Gespräch)'}

Neue Nachricht der Lehrkraft:
"""
${nachricht.trim()}
"""

Deine Aufgabe:
1. Antworte der Lehrkraft kurz und kollegial (maximal 4 Sätze). Sage, was du in die Bauanleitung übernommen hast, und stelle höchstens EINE gezielte Rückfrage zu dem, was noch fehlt.
2. Aktualisiere die Bauanleitung. Übernimm bereits vorhandene Inhalte und ändere nur, was sich durch die neue Nachricht ergibt. Erfinde nichts, was der Beschreibung widerspricht; sinnvoll ergänzen darfst du.
   - steckbrief: zielgruppe, thema, dauer, leitziel. Was noch unklar ist, bleibt leerer String.
   - verlaufsplan: 3-6 Phasen in linearer Reihenfolge. Pro Phase: phasenname, zeit_minuten (Zahl), inhalt (Inhalt & konkrete Handlungsschritte, 2-4 Sätze), methode_sozialform (z. B. Einzelarbeit, Gruppenarbeit, Plenumsgespräch), material, typ.
     typ (genau einer dieser Werte): "analog_input" (Input der Lehrkraft ohne Gerät: Vortrag, Gespräch, Tafel), "digital_input" (digital ausgespielter Input, z. B. Lehrvideo), "analog_aufgabe" (Aufgabe ohne digitale Bearbeitung, z. B. Arbeitsblatt, Partnergespräch), "digital_aufgabe" (Aufgabe, die die Schüler digital am Gerät bearbeiten), "analog_sicherung" (Sicherung/Auswertung im Plenum), "digital_sicherung" (Sicherung über eine digitale Aufgabe). Alle "digital_*"-Arten werden später mit einer Aktivität aus dem Pool-Manager verknüpft.
     Beschreibe hier, WAS in der Phase passieren soll — noch KEINE fertigen digitalen Aufgaben ausformulieren.
     Die Summe der Zeiten soll etwa zur angegebenen Dauer passen.
     NUR bei "digital_*"-Phasen zusätzlich diese drei Felder, wenn die Lehrkraft die Aufgabe erkennbar konkret beschrieben hat:
       ki_erstellen (true/false): true, wenn aus der Beschreibung klar hervorgeht, welche Aufgabe die Schüler digital bearbeiten sollen — die Aufgabe kann dann später direkt mit erzeugt werden. Sonst false.
       ki_aktivitaet: der EXAKTE Name einer Aufgabenart aus der folgenden Liste, die zur beschriebenen Aufgabe passt (nur wenn ki_erstellen true ist, sonst leerer String):
${katalog || '- (keine Aufgabenarten verfügbar)'}
       ki_hinweis: alle inhaltlichen Angaben der Lehrkraft, die für die Erstellung genau dieser Aufgabe wichtig sind (z. B. Achsenbeschriftungen, Begriffe, Eingrenzungen wie „nur afrikanische Länder"). Kurz und konkret, sonst leerer String.
     Setze ki_erstellen nur auf true, wenn du dir bei der Aufgabenart sicher bist. Bereits von der Lehrkraft gesetzte Werte dieser drei Felder NICHT verändern.
   - didaktische_hinweise: didaktisch-methodische Hinweise und alles, was sonst nirgendwo hineinpasst (Fließtext mit Absätzen, keine Markdown-Sonderzeichen).
Schreibe auf Deutsch, in normaler Groß-/Kleinschreibung.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          antwort: { type: 'string' },
          plan: {
            type: 'object',
            properties: {
              steckbrief: {
                type: 'object',
                properties: {
                  zielgruppe: { type: 'string' },
                  thema: { type: 'string' },
                  dauer: { type: 'string' },
                  leitziel: { type: 'string' },
                },
              },
              verlaufsplan: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    phasenname: { type: 'string' },
                    zeit_minuten: { type: 'number' },
                    inhalt: { type: 'string' },
                    methode_sozialform: { type: 'string' },
                    material: { type: 'string' },
                    ki_erstellen: { type: 'boolean' },
                    ki_aktivitaet: { type: 'string' },
                    ki_hinweis: { type: 'string' },
                    typ: {
                      type: 'string',
                      enum: [
                        'analog_input',
                        'digital_input',
                        'analog_aufgabe',
                        'digital_aufgabe',
                        'analog_sicherung',
                        'digital_sicherung',
                      ],
                    },
                  },
                  required: ['phasenname'],
                },
              },
              didaktische_hinweise: { type: 'string' },
            },
          },
        },
        required: ['antwort', 'plan'],
      },
    });

    const neuerPlan = {
      steckbrief: result?.plan?.steckbrief || plan.steckbrief || {},
      verlaufsplan: result?.plan?.verlaufsplan || plan.verlaufsplan || [],
      didaktische_hinweise: result?.plan?.didaktische_hinweise ?? plan.didaktische_hinweise ?? '',
    };
    const neuerVerlauf = [
      ...verlauf,
      { role: 'user', content: nachricht.trim() },
      { role: 'assistant', content: result?.antwort || '' },
    ].slice(-40);

    await base44.asServiceRole.entities.Unterrichtsstunde.update(stunde_id, {
      coach_plan: neuerPlan,
      coach_verlauf: neuerVerlauf,
      coach_plan_updated_at: new Date().toISOString(),
    });

    return Response.json({ antwort: result?.antwort || '', plan: neuerPlan, verlauf: neuerVerlauf });
  } catch (error) {
    console.error('[stundenCoachChat] Error:', error);
    return Response.json({ error: error.message || 'Interner Fehler' }, { status: 500 });
  }
}