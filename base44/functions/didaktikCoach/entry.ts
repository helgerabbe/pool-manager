import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SYSTEM_PROMPT = `Rolle: Didaktischer Coach für Poolzeiten.
Kontext: Zerlege Unterrichtsthemen in 'Lernpakete' (max. 45-90 Min, nur Anforderungsebene 1). Jedes Paket enthält 1-3 Lernziele, streng getrennt in 'Fachwissen' (deklarativ) und 'Fähigkeit/Fertigkeit' (prozedural, 'Ich kann...').
Ablauf: 1. Frage nach Fach/Thema/Ideen. 2. Mache einen feingranularen Strukturvorschlag. 3. Passe ihn nach Feedback an. 4. Wenn der Nutzer zustimmt, gib den finalen Entwurf exakt in diesem Text-Format aus:

Einheit: [Titel]
Lernpaket 1: [Titel]
- Fachwissen: Ich kann...
- Fähigkeit/Fertigkeit: Ich kann...

WICHTIG: Erstelle keine Transferaufgaben (Ebene 2/3) in diesem Schritt. Antworte immer auf Deutsch.`;

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const requestLog = new Map();

function isRateLimited(userIdentifier) {
  if (!userIdentifier) return true;

  const now = Date.now();
  const key = `${userIdentifier}::didaktikCoach`;
  const timestamps = requestLog.get(key) || [];

  while (timestamps.length > 0 && now - timestamps[0] >= RATE_LIMIT_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  return messages
    .filter(message => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
    .slice(-20)
    .map(message => ({
      role: message.role,
      content: message.content.slice(0, 6000),
    }));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method must be POST' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(user.email)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const cleanMessages = normalizeMessages(body?.messages);
    const documentUrls = Array.isArray(body?.documentUrls)
      ? body.documentUrls.filter(url => typeof url === 'string' && url.trim()).slice(0, 10)
      : [];

    if (!cleanMessages || cleanMessages.length === 0) {
      return Response.json({ error: 'messages array required' }, { status: 400 });
    }

    const structuredMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(documentUrls.length > 0
        ? [{ role: 'system', content: 'Nutze ausschließlich die angehängten Kontext-Dokumente für deinen Vorschlag. Erfinde keine Inhalte aus Dateinamen oder URLs.' }]
        : []),
      ...cleanMessages,
    ];

    const params = {
      prompt: JSON.stringify(structuredMessages),
      model: 'claude_sonnet_4_6',
    };

    if (documentUrls.length > 0) {
      params.file_urls = documentUrls;
    }

    const reply = await base44.asServiceRole.integrations.Core.InvokeLLM(params);
    return Response.json({ reply: reply || '' });
  } catch (error) {
    console.error('didaktikCoach error:', error);
    return Response.json({ error: error?.message || 'Fehler beim Anrufen der KI' }, { status: 500 });
  }
});