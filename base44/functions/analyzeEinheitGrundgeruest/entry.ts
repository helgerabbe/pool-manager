import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId, rohtext } = await req.json().catch(() => ({}));

    if (!einheitId || !rohtext?.trim()) {
      return Response.json({ error: 'Missing einheitId or rohtext' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    const [benutzerList, membershipList] = await Promise.all([
      base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email }),
      base44.asServiceRole.entities.EinheitMembers.filter({ einheit_id: einheitId, user_email: user.email }),
    ]);

    const profil = benutzerList?.[0];
    const role = profil?.rolle;
    const subjects = profil?.fachbereich_zustaendigkeit || [];
    const allowed = user.role === 'admin'
      || role === 'Administrator'
      || (role === 'Fachschaftsleitung' && subjects.includes(einheit.fach))
      || !!membershipList?.[0];

    if (!allowed) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analysiere den folgenden Freitext als didaktisches Grundgerüst einer Unterrichtseinheit.\n\nEinheit: ${einheit.titel_der_einheit}\nFach: ${einheit.fach}\nJahrgang: ${einheit.jahrgangsstufe}\n\nFreitext:\n${rohtext}\n\nZiel: Strukturieren, fehlende/unklare Informationen sichtbar machen, aber nichts erfinden. Formuliere knapp und schulpraktisch.`,
      response_json_schema: {
        type: 'object',
        properties: {
          thema: { type: 'string' },
          lernziele: { type: 'array', items: { type: 'string' } },
          zentrale_begriffe: { type: 'array', items: { type: 'string' } },
          software_materialien: { type: 'array', items: { type: 'string' } },
          grenzen: { type: 'string' },
          offene_punkte: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['gut', 'unklar', 'lueckenhaft'] },
          kurzfeedback: { type: 'string' },
        },
        required: ['thema', 'lernziele', 'zentrale_begriffe', 'software_materialien', 'grenzen', 'offene_punkte', 'status', 'kurzfeedback'],
      },
    });

    return Response.json({ success: true, analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});