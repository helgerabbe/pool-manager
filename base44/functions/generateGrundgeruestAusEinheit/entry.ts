import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Erstellt aus den bereits vorhandenen Daten einer Einheit (Gesamtziele,
 * Themenfelder, Lernpakete, Lernziele, Aufgaben) per KI einen Vorschlag für
 * das didaktische Grundgerüst (Freitext) der Einheit.
 *
 * Anders als analyzeEinheitGrundgeruest (das einen vorhandenen Freitext
 * strukturiert) liest diese Funktion den IST-Zustand der Einheit aus der DB
 * und verdichtet ihn zu einem zusammenfassenden Grundgerüst-Text.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId } = await req.json().catch(() => ({}));
    if (!einheitId) {
      return Response.json({ error: 'Missing einheitId' }, { status: 400 });
    }

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Berechtigung analog zu analyzeEinheitGrundgeruest
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

    // ── IST-Daten der Einheit aggregieren ──────────────────────────────
    const [themenfelder, lernpakete, aufgaben] = await Promise.all([
      base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheitId }),
      base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId }),
      base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    ]);

    // Lernziele aller Lernpakete einsammeln
    const paketIds = (lernpakete || []).map((p) => p.id);
    let lernziele = [];
    if (paketIds.length > 0) {
      const zielListen = await Promise.all(
        paketIds.map((pid) =>
          base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: pid })
        )
      );
      lernziele = zielListen.flat();
    }

    const istDaten = {
      titel: einheit.titel_der_einheit,
      fach: einheit.fach,
      jahrgangsstufe: einheit.jahrgangsstufe,
      gesamtziele: einheit.gesamtziele || [],
      themenfelder: (themenfelder || [])
        .sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0))
        .map((t) => ({ titel: t.titel, beschreibung: t.beschreibung || null })),
      lernpakete: (lernpakete || []).map((p) => p.titel_des_pakets).filter(Boolean),
      lernziele: lernziele
        .map((lz) => lz.formulierung_fachsprache)
        .filter(Boolean)
        .slice(0, 80),
      aufgaben: (aufgaben || [])
        .map((a) => a.titel || a.aufgabenstellung)
        .filter(Boolean)
        .slice(0, 60),
    };

    const prompt = `Du bist eine didaktische Assistenz. Aus den unten aufgeführten, BEREITS in einer Unterrichtseinheit angelegten Daten sollst du das "Grundgerüst der Einheit" rekonstruieren – also einen zusammenfassenden, gut lesbaren Freitext, der den didaktischen Gesamtkontext beschreibt.

Wichtig:
- Nutze AUSSCHLIESSLICH die vorhandenen Daten. Erfinde keine Materialien, Software oder Inhalte, die nicht ableitbar sind.
- Schreibe schulpraktisch und knapp, in ganzen Sätzen bzw. klaren Stichpunkten.
- Gliedere den Text mit Markdown-Überschriften in genau diese Abschnitte (nur die, für die es Inhalte gibt):
  ## Thema / Gegenstand
  ## Lernziele
  ## Zentrale Begriffe
  ## Software / Materialien
  ## Nicht-Gegenstand / Grenzen
- Bei "Lernziele" fasse die vorhandenen Lernziele und Gesamtziele sinnvoll zusammen (nicht stumpf alle auflisten, wenn es sehr viele sind).
- Wenn zu "Software / Materialien" oder "Grenzen" keine Daten vorliegen, lass den Abschnitt weg.

Vorhandene Daten der Einheit (JSON):
${JSON.stringify(istDaten, null, 2)}

Gib NUR den fertigen Grundgerüst-Freitext (Markdown) zurück, ohne Vorbemerkung.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    const grundgeruest = typeof result === 'string' ? result : (result?.text || result?.content || '');

    return Response.json({ success: true, grundgeruest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});