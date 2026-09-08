import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * lernzielWerkstattAnalyse
 * ────────────────────────
 * „Reverse Engineering" der Lernziele: Liest den ECHTEN Inhalt eines
 * Lernpakets (Aktivitäten, Master-Varianten, allgemeine Aufgaben des
 * Themenfelds) und prüft, welche der eingetragenen Lernziele darin wirklich
 * geübt werden — und welche Lernziele im Material stecken, aber noch fehlen.
 *
 * Schreibt NICHTS. Liefert nur Befund und Vorschläge.
 *
 * Payload: { lernpaket_id }
 * Antwort: { bestand: [{ id, status: 'belegt'|'nicht_belegt', hinweis }],
 *            vorschlaege: [{ formulierung_fachsprache, schueler_uebersetzung,
 *                            kategorie, begruendung, fundstellen[] }],
 *            gescannt: { aktivitaeten, varianten, aufgaben } }
 */

const MAX_TEXT_JE_ELEMENT = 1800;

/** Alle sinnvollen Textstellen eines Feldwerte-Objekts einsammeln. */
function texteAus(wert, out = []) {
  if (wert == null) return out;
  if (typeof wert === 'string') {
    const t = wert.trim();
    if (t.length > 2 && !/^https?:\/\//i.test(t) && !/^data:/i.test(t) && !/^<[a-z!]/i.test(t.slice(0, 2))) out.push(t);
    return out;
  }
  if (Array.isArray(wert)) { wert.forEach((w) => texteAus(w, out)); return out; }
  if (typeof wert === 'object') {
    for (const [k, v] of Object.entries(wert)) {
      if (/url|_id$|^id$|snapshot|html|fragment/i.test(k)) continue;
      texteAus(v, out);
    }
  }
  return out;
}

function kuerze(texte) {
  const s = texte.join(' | ');
  return s.length > MAX_TEXT_JE_ELEMENT ? `${s.slice(0, MAX_TEXT_JE_ELEMENT)} …` : s;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lernpaketId = String(body.lernpaket_id || '').trim();
    if (!lernpaketId) return Response.json({ error: 'lernpaket_id fehlt' }, { status: 400 });

    const paket = await base44.entities.Lernpakete.get(lernpaketId);
    if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });

    const [einheit, themenfeld, ziele, aktivitaeten, master, katalog] = await Promise.all([
      paket.einheit_id ? base44.entities.Einheiten.get(paket.einheit_id).catch(() => null) : null,
      paket.themenfeld_id ? base44.entities.Themenfeld.get(paket.themenfeld_id).catch(() => null) : null,
      base44.entities.Lernziele.filter({ lernpaket_id: lernpaketId }),
      base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lernpaketId }),
      base44.entities.MasterAufgabe.filter({ lernpaket_id: lernpaketId }),
      base44.entities.AktivitaetenKatalog.list(),
    ]);

    const katalogName = new Map((katalog || []).map((k) => [k.id, k.name]));
    const aktiveAktivitaeten = (aktivitaeten || []).filter((a) => a.sync_status !== 'to_delete');

    // ── Inhalt des Pakets als Text ───────────────────────────────────────
    const inhaltBloecke = [];
    for (const a of aktiveAktivitaeten) {
      const texte = texteAus(a.field_values);
      if (a.transkript) texte.push(String(a.transkript).slice(0, 1200));
      if (a.ki_briefing) texteAus(a.ki_briefing, texte);
      const varianten = (master || []).filter((m) => m.activity_id === a.id);
      varianten.forEach((m) => texteAus(m.field_values, texte));
      inhaltBloecke.push(
        `[Aktivität ${katalogName.get(a.aktivitaet_id) || 'unbekannt'} · Phase ${a.phase}${varianten.length ? ` · ${varianten.length} Varianten` : ''}]\n${kuerze(texte) || '(ohne Textinhalt)'}`,
      );
    }

    // Allgemeine Aufgaben, die dieses Paket ausdrücklich nutzen oder im
    // selben Themenfeld liegen.
    let aufgaben = [];
    if (paket.einheit_id) {
      const alle = await base44.entities.AllgemeineAufgabe.filter({ einheit_id: paket.einheit_id }).catch(() => []);
      aufgaben = (alle || []).filter((au) => au.sync_status !== 'to_delete' && (
        (au.verlinkte_lernpaket_ids || []).includes(lernpaketId)
        || (paket.themenfeld_id && au.themenfeld_id === paket.themenfeld_id)
      ));
    }
    for (const au of aufgaben) {
      const texte = [au.titel, au.aufgabenstellung, au.erwartungshorizont].filter(Boolean).map(String);
      (au.sequenz_schritte || []).forEach((s) => {
        if (s.titel) texte.push(String(s.titel));
        if (s.plan?.kurzbeschreibung) texte.push(String(s.plan.kurzbeschreibung));
        if (s.aufgabe?.aufgabenstellung) texte.push(String(s.aufgabe.aufgabenstellung));
        if (s.brian?.aufgabenstellung) texte.push(String(s.brian.aufgabenstellung));
        if (s.field_values) texteAus(s.field_values, texte);
      });
      inhaltBloecke.push(`[Aufgabe im Themenfeld · Ebene ${au.anforderungsebene || '?'}]\n${kuerze(texte)}`);
    }

    if (inhaltBloecke.length === 0) {
      return Response.json({
        bestand: (ziele || []).map((z) => ({ id: z.id, status: 'nicht_belegt', hinweis: 'Das Lernpaket enthält noch keine Inhalte.' })),
        vorschlaege: [],
        gescannt: { aktivitaeten: 0, varianten: 0, aufgaben: 0 },
      });
    }

    const zieleBlock = (ziele || []).length
      ? ziele.map((z) => `[id:${z.id}] ${z.formulierung_fachsprache}`).join('\n')
      : '(noch keine Lernziele eingetragen)';

    const prompt = `Du bist ein erfahrener Fachdidaktiker. Eine Lehrkraft hat ein Lernpaket fertig mit Inhalten gefüllt. Am Anfang hat sie Lernziele formuliert — jetzt soll rückwärts aus dem FERTIGEN Material geprüft werden, welche Lernziele darin tatsächlich stecken.

RAHMEN
- Fach: ${einheit?.fach || 'unbekannt'}, Jahrgangsstufe ${einheit?.jahrgangsstufe || 'unbekannt'}
- Einheit: "${einheit?.titel_der_einheit || ''}" · Themenfeld: "${themenfeld?.titel || 'ohne'}"
- Lernpaket: "${paket.titel_des_pakets}"
${(paket.kernbegriffe || []).length ? `- Kernbegriffe: ${paket.kernbegriffe.join(', ')}` : ''}

WAS EIN LERNZIEL HIER IST
Ein KONKRET ÜBBARES Lernziel auf Lernpaket-Ebene: eine klar abgrenzbare Teilfähigkeit, die durch die Inhalte dieses Pakets gezielt trainiert wird. Keine Dach-Ziele für ganze Themenfelder oder Einheiten.

EINGETRAGENE LERNZIELE (mit stabiler id):
${zieleBlock}

INHALT DES LERNPAKETS (was die Schüler tatsächlich bearbeiten):
${inhaltBloecke.join('\n\n')}

DEINE AUFGABE
1. "bestand": Prüfe JEDES eingetragene Lernziel. status "belegt" = das Material übt diese Fähigkeit erkennbar; "nicht_belegt" = im Material findet sich dazu nichts oder fast nichts. "hinweis": ein Satz, wo es geübt wird bzw. was fehlt. Verwende ausschließlich die ids von oben.
2. "vorschlaege": Lernziele, die im Material erkennbar geübt werden, aber NICHT eingetragen sind (auch nicht sinngemäß). Pro Vorschlag:
   - "formulierung_fachsprache": präzise Ich-Form ("Ich kann …"), fachlich korrekt.
   - "schueler_uebersetzung": dieselbe Aussage in einfacher, motivierender Schülersprache der Jahrgangsstufe (Ich-Form).
   - "kategorie": "Fachwissen" oder "Fähigkeit/Fertigkeit".
   - "begruendung": ein Satz für die Lehrkraft, warum dieses Ziel im Material steckt.
   - "fundstellen": 1–3 kurze Verweise auf die Stelle im Material (z. B. "Miniquiz, Frage 3 zu …").
Höchstens 6 Vorschläge, nur echte Lücken. Ist alles abgedeckt, gib ein leeres Array zurück.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          bestand: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string', enum: ['belegt', 'nicht_belegt'] },
                hinweis: { type: 'string' },
              },
              required: ['id', 'status', 'hinweis'],
            },
          },
          vorschlaege: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                formulierung_fachsprache: { type: 'string' },
                schueler_uebersetzung: { type: 'string' },
                kategorie: { type: 'string', enum: ['Fachwissen', 'Fähigkeit/Fertigkeit'] },
                begruendung: { type: 'string' },
                fundstellen: { type: 'array', items: { type: 'string' } },
              },
              required: ['formulierung_fachsprache', 'schueler_uebersetzung', 'kategorie', 'begruendung'],
            },
          },
        },
        required: ['bestand', 'vorschlaege'],
      },
    });

    const zielIds = new Set((ziele || []).map((z) => z.id));
    const bestand = (Array.isArray(result?.bestand) ? result.bestand : []).filter((b) => zielIds.has(b.id));
    // Ziele, zu denen die KI nichts gesagt hat, gelten als ungeprüft-belegt.
    for (const z of ziele || []) {
      if (!bestand.some((b) => b.id === z.id)) bestand.push({ id: z.id, status: 'belegt', hinweis: '' });
    }

    return Response.json({
      bestand,
      vorschlaege: (Array.isArray(result?.vorschlaege) ? result.vorschlaege : [])
        .filter((v) => String(v?.formulierung_fachsprache || '').trim())
        .map((v) => ({ ...v, fundstellen: Array.isArray(v.fundstellen) ? v.fundstellen : [] })),
      gescannt: {
        aktivitaeten: aktiveAktivitaeten.length,
        varianten: (master || []).length,
        aufgaben: aufgaben.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}