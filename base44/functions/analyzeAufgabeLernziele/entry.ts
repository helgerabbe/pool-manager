import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * analyzeAufgabeLernziele
 *
 * KI-gestützte Lernzielanalyse (Phase 1, erweitert).
 *
 * Die KI bekommt drei Wissensquellen mitgegeben und ordnet sie der Aufgabe zu:
 *   1. BESTEHENDE Lernziele der gesamten Einheit (mit Themenfeld-Zuordnung).
 *   2. BESTEHENDE Basis-Lernziele aller Basismodule des Faches (Vorwissen).
 *   3. NEU erfundene, konkret-übbare Lernziele, die noch nirgends existieren.
 * Zusätzlich nennt sie LÜCKEN: konkret-übbare Voraussetzungen, für die es
 * vermutlich ein Basismodul-Lernziel geben müsste, das aber noch nicht existiert.
 *
 * DIDAKTISCHES KERNKRITERIUM:
 *   Es werden NUR konkret übbare Lernziele auf "Lernpaket-Ebene" gesucht —
 *   also Fähigkeiten, die ein Schüler durch ein einzelnes Lernpaket gezielt
 *   trainieren kann. Übergeordnete "Dach-Lernziele" (ganze Einheit / ganzes
 *   Themenfeld) werden herausgefiltert.
 *
 * Diese Funktion SCHREIBT nichts in die DB — sie liefert nur Vorschläge zurück.
 *
 * Payload:
 *   { aufgabeId: string, modus?: 'voll' | 'mehr', vorhandene_texte?: string[] }
 *   - modus 'mehr': es werden NUR neue Vorschläge erzeugt (Button "3 weitere"),
 *     unter Vermeidung der bereits vorhandenen Texte.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { aufgabeId, modus = 'voll', vorhandene_texte = [] } = await req.json();
    if (!aufgabeId) {
      return Response.json({ error: 'aufgabeId fehlt' }, { status: 400 });
    }

    const aufgabe = await base44.entities.AllgemeineAufgabe.get(aufgabeId);
    if (!aufgabe) {
      return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 });
    }

    // ── Kontext laden ───────────────────────────────────────────────────────
    let einheit = null;
    let themenfeld = null;
    try {
      if (aufgabe.einheit_id) einheit = await base44.entities.Einheiten.get(aufgabe.einheit_id);
    } catch { /* ignore */ }
    try {
      if (aufgabe.themenfeld_id) themenfeld = await base44.entities.Themenfeld.get(aufgabe.themenfeld_id);
    } catch { /* ignore */ }

    const fach = einheit?.fach || 'unbekanntes Fach';
    const jahrgang = einheit?.jahrgangsstufe ? `Jahrgangsstufe ${einheit.jahrgangsstufe}` : 'unbekannte Jahrgangsstufe';
    const einheitTitel = einheit?.titel_der_einheit || 'unbekannte Einheit';
    const themenfeldTitel = themenfeld?.titel || 'kein Themenfeld';

    // ── Bestehende Lernziele der Einheit + Themenfeld-Zuordnung ──────────────
    // Kette: Lernziele.lernpaket_id → Lernpakete.themenfeld_id → Themenfeld.titel
    let bestehendeLernziele = [];
    try {
      const themenfelder = einheit?.id
        ? await base44.entities.Themenfeld.filter({ einheit_id: einheit.id })
        : [];
      const tfTitelById = {};
      for (const tf of themenfelder) tfTitelById[tf.id] = tf.titel;

      const lernpakete = einheit?.id
        ? await base44.entities.Lernpakete.filter({ einheit_id: einheit.id })
        : [];
      const paketById = {};
      for (const p of lernpakete) paketById[p.id] = p;

      const paketIds = lernpakete.map((p) => p.id);
      // Lernziele aller Pakete dieser Einheit sammeln.
      const lzListen = await Promise.all(
        paketIds.map((pid) => base44.entities.Lernziele.filter({ lernpaket_id: pid }).catch(() => []))
      );
      const aktuellesThemenfeldId = aufgabe.themenfeld_id || null;
      lzListen.flat().forEach((lz) => {
        const paket = paketById[lz.lernpaket_id];
        const tfId = paket?.themenfeld_id || null;
        bestehendeLernziele.push({
          id: lz.id,
          text: lz.formulierung_fachsprache,
          themenfeld_id: tfId,
          themenfeld_titel: tfId ? (tfTitelById[tfId] || 'Themenfeld') : 'Ohne Themenfeld',
          lernpaket_id: lz.lernpaket_id,
          ist_aktuelles_themenfeld: !!aktuellesThemenfeldId && tfId === aktuellesThemenfeldId,
        });
      });
    } catch (e) {
      console.warn('[analyzeAufgabeLernziele] Bestehende Lernziele laden fehlgeschlagen:', e?.message);
    }

    // ── Basis-Lernziele aller Basismodule des Faches ─────────────────────────
    // Kette: Basismodule(fach) → Basislernpakete(basismodul_id) → BasisLernziel(basislernpaket_id)
    let basisLernziele = [];
    try {
      const module = await base44.entities.Basismodule.filter({ fach });
      const modulTitelById = {};
      for (const m of module) modulTitelById[m.id] = m.titel;

      const pakete = (
        await Promise.all(
          module.map((m) => base44.entities.Basislernpakete.filter({ basismodul_id: m.id }).catch(() => []))
        )
      ).flat();
      const paketById = {};
      for (const p of pakete) paketById[p.id] = p;

      const lzListen = await Promise.all(
        pakete.map((p) => base44.entities.BasisLernziel.filter({ basislernpaket_id: p.id }).catch(() => []))
      );
      lzListen.flat().forEach((bl) => {
        const paket = paketById[bl.basislernpaket_id];
        const modulTitel = paket ? (modulTitelById[paket.basismodul_id] || 'Basismodul') : 'Basismodul';
        basisLernziele.push({
          id: bl.id,
          text: bl.text,
          basismodul_titel: modulTitel,
        });
      });
    } catch (e) {
      console.warn('[analyzeAufgabeLernziele] Basis-Lernziele laden fehlgeschlagen:', e?.message);
    }

    // ── Didaktische Definition (immer im Payload) ────────────────────────────
    const didaktik = `WAS IST EIN KONKRET-ÜBBARES LERNZIEL (LERNPAKET-EBENE)?
Ein Lernpaket ist eine kleine, geschlossene Lerneinheit, in der ein Schüler EINE konkrete Fähigkeit gezielt üben und sich aneignen kann (z.B. durch Erklärvideos, Übungsaufgaben, einen kurzen Test).
Ein passendes Lernziel ist daher KONKRET und ÜBBAR — eine klar abgrenzbare Teilfähigkeit.
- GUT (konkret übbar): "Der Schüler kann den Grundwert aus Prozentwert und Prozentsatz berechnen."
- SCHLECHT (zu übergeordnet, NICHT verwenden): "Der Schüler kann Aufgaben zur Prozentrechnung lösen." oder "Der Schüler kann Zufallsexperimente verstehen."
Übergeordnete "Dach-Lernziele", die sich auf ein ganzes Themenfeld oder eine ganze Einheit beziehen, sind hier UNERWÜNSCHT und müssen herausgefiltert werden.`;

    const aufgabeBlock = `DIE AUFGABE:
- Fach: ${fach}, ${jahrgang}
- Einheit: "${einheitTitel}" / Themenfeld: "${themenfeldTitel}"
- Titel: ${aufgabe.titel || '(kein Titel)'}
- Aufgabenstellung: ${aufgabe.aufgabenstellung || '(keine Aufgabenstellung hinterlegt)'}
${aufgabe.erwartungshorizont ? `- Erwartungshorizont: ${aufgabe.erwartungshorizont}` : ''}
${aufgabe.hinweise_zum_material ? `- Material-Hinweise: ${aufgabe.hinweise_zum_material}` : ''}`;

    // ── Modus "mehr": nur zusätzliche neue Vorschläge ────────────────────────
    if (modus === 'mehr') {
      const vermeiden = (Array.isArray(vorhandene_texte) ? vorhandene_texte : [])
        .map((t, i) => `${i + 1}. ${t}`)
        .join('\n');
      const promptMehr = `Du bist ein erfahrener Fachdidaktiker.

${didaktik}

${aufgabeBlock}

BEREITS VORHANDENE LERNZIELE (NICHT wiederholen, auch nicht sinngemäß):
${vermeiden || '(noch keine)'}

DEINE AUFGABE:
Schlage bis zu 3 ZUSÄTZLICHE, konkret-übbare Lernziele vor, die für diese Aufgabe noch fehlen und sich von den vorhandenen klar unterscheiden.
Wenn dir keine sinnvollen NEUEN Lernziele mehr einfallen (alles Wesentliche ist abgedeckt), gib ein LEERES Array zurück und setze "keine_weiteren" auf true. Erfinde NICHTS Künstliches, nur um die Liste zu füllen.`;

      const resMehr = await base44.integrations.Core.InvokeLLM({
        prompt: promptMehr,
        response_json_schema: {
          type: 'object',
          properties: {
            neue_vorschlaege: { type: 'array', items: { type: 'string' } },
            keine_weiteren: { type: 'boolean' },
          },
          required: ['neue_vorschlaege'],
        },
      });
      return Response.json({
        neue_vorschlaege: Array.isArray(resMehr?.neue_vorschlaege) ? resMehr.neue_vorschlaege : [],
        keine_weiteren: !!resMehr?.keine_weiteren,
      });
    }

    // ── Modus "voll": komplette Analyse ──────────────────────────────────────
    const bestehendeBlock = bestehendeLernziele.length
      ? bestehendeLernziele
          .map((lz) => `[id:${lz.id}] (${lz.ist_aktuelles_themenfeld ? 'AKTUELLES Themenfeld' : `Themenfeld: ${lz.themenfeld_titel}`}) ${lz.text}`)
          .join('\n')
      : '(keine bestehenden Lernziele in dieser Einheit)';

    const basisBlock = basisLernziele.length
      ? basisLernziele.map((bl) => `[id:${bl.id}] (Basismodul: ${bl.basismodul_titel}) ${bl.text}`).join('\n')
      : '(keine Basis-Lernziele für dieses Fach vorhanden)';

    const prompt = `Du bist ein erfahrener Fachdidaktiker und unterstützt eine Lehrkraft bei der Lernzielanalyse einer Aufgabe.

${didaktik}

${aufgabeBlock}

GRUPPE A — BESTEHENDE LERNZIELE DIESER EINHEIT (mit stabiler id):
${bestehendeBlock}

GRUPPE B — BESTEHENDE BASIS-LERNZIELE (Vorwissen) DES FACHES (mit stabiler id):
${basisBlock}

DEINE AUFGABE — gib EXAKT diese vier Ergebnis-Listen zurück:
1. "bestehende": Wähle aus GRUPPE A diejenigen Lernziele aus, die KONKRET zur Lösung dieser Aufgabe gebraucht werden. Gib pro Treffer NUR die "id" zurück (übernimm sie unverändert). Filtere zu übergeordnete Dach-Lernziele heraus.
2. "basismodul": Wähle aus GRUPPE B diejenigen Basis-Lernziele (Vorwissen) aus, die für diese Aufgabe vorausgesetzt werden. Gib pro Treffer NUR die "id" zurück.
3. "neue_vorschlaege": Konkret-übbare Lernziele, die für diese Aufgabe gebraucht werden, aber WEDER in Gruppe A NOCH in Gruppe B vorkommen. Formuliere sie präzise und kompetenzorientiert ("Der Schüler kann …").
4. "basismodul_luecken": Konkret-übbare VORAUSSETZUNGEN (Vorwissen aus anderen Themen), die für diese Aufgabe nötig sind, für die es aber in Gruppe B noch KEIN passendes Basis-Lernziel gibt. Formuliere jede Lücke als konkretes, übbares Lernziel (z.B. "Der Schüler kann den Grundwert aus Prozentwert und Prozentsatz berechnen.") — das ist ein Hinweis, dass hierfür vermutlich ein Basismodul-Lernziel angelegt werden müsste. Wenn es keine solchen Lücken gibt, gib ein leeres Array zurück.

WICHTIG: Erfinde keine ids. Verwende in "bestehende" und "basismodul" ausschließlich ids, die oben wörtlich vorkommen.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          bestehende: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          },
          basismodul: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
          },
          neue_vorschlaege: { type: 'array', items: { type: 'string' } },
          basismodul_luecken: { type: 'array', items: { type: 'string' } },
        },
        required: ['bestehende', 'basismodul', 'neue_vorschlaege', 'basismodul_luecken'],
      },
    });

    // ── Treffer-IDs zu vollständigen Objekten auflösen ───────────────────────
    const bestehendeById = {};
    for (const lz of bestehendeLernziele) bestehendeById[lz.id] = lz;
    const basisById = {};
    for (const bl of basisLernziele) basisById[bl.id] = bl;

    const bestehendeTreffer = (Array.isArray(result?.bestehende) ? result.bestehende : [])
      .map((r) => bestehendeById[r.id])
      .filter(Boolean);

    const basisTreffer = (Array.isArray(result?.basismodul) ? result.basismodul : [])
      .map((r) => basisById[r.id])
      .filter(Boolean);

    return Response.json({
      bestehende: bestehendeTreffer,
      basismodul: basisTreffer,
      neue_vorschlaege: Array.isArray(result?.neue_vorschlaege) ? result.neue_vorschlaege : [],
      basismodul_luecken: Array.isArray(result?.basismodul_luecken) ? result.basismodul_luecken : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});