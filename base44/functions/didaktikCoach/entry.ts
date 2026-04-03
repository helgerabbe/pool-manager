import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SYSTEM_PROMPT = `Rolle: Didaktischer Coach für Poolzeiten.
Kontext: Zerlege Unterrichtsthemen in 'Lernpakete' (max. 45-90 Min, nur Anforderungsebene 1). Jedes Paket enthält 1-3 Lernziele, streng getrennt in 'Fachwissen' (deklarativ) und 'Fähigkeit/Fertigkeit' (prozedural, 'Ich kann...').
Ablauf: 1. Frage nach Fach/Thema/Ideen. 2. Mache einen feingranularen Strukturvorschlag. 3. Passe ihn nach Feedback an. 4. Wenn der Nutzer zustimmt, gib den finalen Entwurf exakt in diesem Text-Format aus:

Einheit: [Titel]
Lernpaket 1: [Titel]
- Fachwissen: Ich kann...
- Fähigkeit/Fertigkeit: Ich kann...

WICHTIG: Erstelle keine Transferaufgaben (Ebene 2/3) in diesem Schritt. Antworte immer auf Deutsch.`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, documentUrls = [] } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }

  // Baue einen einzigen Prompt aus dem System-Prompt + Verlauf
  const verlauf = messages.map(m => {
    const rolle = m.role === 'user' ? 'Lehrkraft' : 'Coach';
    return `${rolle}: ${m.content}`;
  }).join('\n\n');

  let contextSection = '';
  if (documentUrls && documentUrls.length > 0) {
    contextSection = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KONTEXTDOKUMENTE ZUR BERÜCKSICHTIGUNG:
Die Lehrkraft hat folgende Dokumente hochgeladen, die du bei der Strukturierung beachten sollst:
- URLs: ${documentUrls.join(', ')}
Extrahiere relevante Inhalte aus diesen Dokumenten (Lehrpläne, Arbeitspläne, etc.) und integriere sie in deinen Vorschlag.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  const fullPrompt = `${SYSTEM_PROMPT}${contextSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GESPRÄCHSVERLAUF:
${verlauf}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Antworte jetzt als Coach (nur Deine Antwort, keine Rollenbezeichnung):`;

  try {
    const params = {
      prompt: fullPrompt,
      model: 'claude_sonnet_4_6',
    };

    // Nur file_urls hinzufügen, wenn es tatsächlich URLs gibt
    if (documentUrls && documentUrls.length > 0) {
      params.file_urls = documentUrls;
    }

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM(params);
    return Response.json({ reply: reply || '' });
  } catch (error) {
    console.error('didaktikCoach error:', error);
    return Response.json({ error: error.message || 'Fehler beim Anrufen der KI' }, { status: 500 });
  }
});