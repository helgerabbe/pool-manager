import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasUnitWriteAccess } from '../../shared/unitAccess.js';
import { unwrapLLM } from '../../shared/llmUtils.js';

/**
 * Lernpaket-Wizard — Dialog-Modus (Etappe 1, 2026-08-24)
 * ──────────────────────────────────────────────────────
 * Die Lehrkraft beschreibt im Gespräch, welche Aufgaben und Materialien sie
 * für ihr Lernpaket haben möchte. Der Wizard antwortet kollegial UND pflegt
 * dabei einen strukturierten Bauplan (Liste geplanter Aktivitäten mit
 * exaktem Katalog-Typ, Phase und Umsetzungsanleitung). Er kennt Einheit,
 * Lernziele, Bestand und die offenen Ideen aus der Ideenkiste und weist
 * proaktiv auf passende Ideenkiste-Einträge hin.
 *
 * Diese Funktion PERSISTIERT NICHTS — der Bau erfolgt erst, wenn die
 * Lehrkraft im Frontend auf "Bau das jetzt" klickt (dann via
 * applyLernpaketWizardProposal, wie beim bisherigen Vorschlags-Flow).
 *
 * payload: { lernpaketId, nachricht, verlauf[], bauplan, materialien[] }
 * returns: { antwort, bauplan }
 */

const VALID_PHASES = ['Input', 'Übung', 'Abschluss'];
const MAX_ITEMS = 15;

const LERNPAKET_DEFINITION =
  'Ein Lernpaket im Poolmanager ist eine KLEINE, in sich abgeschlossene Lerneinheit, in der Schüler:innen selbstständig EIN, maximal ZWEI Lernziele erarbeiten — Arbeitsumfang etwa eine Unterrichtsstunde. KEIN großer Wurf, das Paket nicht mit Aufgaben vollstopfen — sondern genau die Lernschritte, die zum Erreichen des Lernziels dieses Pakets notwendig sind.';

function kurz(s, max) {
  const str = typeof s === 'string' ? s.trim() : '';
  return str.length > max ? str.slice(0, max) + ' …' : str;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { lernpaketId, nachricht } = body || {};
    if (!lernpaketId || !nachricht || !String(nachricht).trim()) {
      return Response.json({ error: 'lernpaketId und nachricht sind erforderlich.' }, { status: 400 });
    }

    const verlauf = (Array.isArray(body.verlauf) ? body.verlauf : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-16);
    const bisherigerBauplan = body.bauplan && typeof body.bauplan === 'object' ? body.bauplan : null;
    const materialien = (Array.isArray(body.materialien) ? body.materialien : [])
      .slice(0, 10)
      .map((m) => ({ url: String(m?.url || ''), name: String(m?.name || 'Material') }))
      .filter((m) => m.url.startsWith('http'));

    // Lernpaket im User-Kontext laden (RLS), Schreibrechte prüfen.
    const paket = await base44.entities.Lernpakete.get(lernpaketId).catch(() => null);
    if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden.' }, { status: 404 });
    const einheit = await base44.asServiceRole.entities.Einheiten.get(paket.einheit_id).catch(() => null);
    if (!einheit || !(await hasUnitWriteAccess(base44, user, einheit))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Kontext sammeln.
    const [katalog, lernziele, themenfeld, bestand, ideenkiste] = await Promise.all([
      base44.asServiceRole.entities.AktivitaetenKatalog.filter({ is_active: true }, 'name', 200).catch(() => []),
      base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: lernpaketId }, undefined, 100).catch(() => []),
      paket.themenfeld_id
        ? base44.asServiceRole.entities.Themenfeld.get(paket.themenfeld_id).catch(() => null)
        : Promise.resolve(null),
      base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lernpaketId }, undefined, 500).catch(() => []),
      base44.asServiceRole.entities.AufgabenIdee.filter({ einheit_id: paket.einheit_id, status: 'offen' }, undefined, 50).catch(() => []),
    ]);

    const katalogByName = new Map(katalog.map((k) => [k.name, k]));
    const phasenByName = new Map();
    katalog.forEach((k) => {
      if (!phasenByName.has(k.name)) phasenByName.set(k.name, new Set());
      phasenByName.get(k.name).add(k.phase);
    });
    const katalogById = new Map(katalog.map((k) => [k.id, k.name]));

    const werkzeuge = katalog
      .map((k) => `- "${k.name}" (Phase: ${k.phase}): ${kurz(k.beschreibung, 160)}`)
      .join('\n');

    // Bestand mit IDs — Grundlage für Änderungs-Vorschläge (Etappe 2).
    const bestandLive = (bestand || []).filter((a) => a.sync_status !== 'to_delete');
    const bestandById = new Map(bestandLive.map((a) => [a.id, a]));
    const beschreibungVon = (a) =>
      a.ki_briefing?.idee || a.ki_briefing?.offen?.funktionsweise || a.ki_briefing?.offen?.lernziel || '';
    const bestandListe = bestandLive
      .map(
        (a) =>
          `- id "${a.id}": ${katalogById.get(a.aktivitaet_id) || 'Unbekannt'} (${a.phase}, ${
            a.is_complete ? 'Inhalt vorhanden' : 'noch ohne Inhalt'
          }${a.content_status === 'approved' ? ', FREIGEGEBEN — nicht änderbar' : ''}) — Beschreibung: ${
            kurz(beschreibungVon(a), 200) || '(keine)'
          }`
      )
      .join('\n');

    const ideenkisteListe = (ideenkiste || [])
      .map((e) => `- id "${e.id}": "${e.titel}" — ${kurz(e.beschreibung, 200)}`)
      .join('\n');

    const gespraech = verlauf
      .map((m) => `${m.role === 'user' ? 'LEHRKRAFT' : 'WIZARD'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Du bist der "Lernpaket-Wizard" — ein erfahrener didaktischer Partner, der gemeinsam mit einer Lehrkraft im Gespräch EIN Lernpaket plant. Du sprichst mit ihr und pflegst dabei einen strukturierten Bauplan der geplanten Aktivitäten. Rahmen: ${LERNPAKET_DEFINITION}

KONTEXT:
- Fach: ${einheit.fach}, Jahrgangsstufe: ${einheit.jahrgangsstufe}
- Einheit: „${einheit.titel_der_einheit}"${themenfeld ? `, Themenfeld: „${themenfeld.titel}"` : ''}
- Lernpaket: „${paket.titel_des_pakets || '(ohne Titel)'}"
- Lernziele dieses Pakets: ${(lernziele || []).map((lz) => lz.formulierung_fachsprache).filter(Boolean).join(' | ') || '—'}
- Einheiten-Beschreibung (Auszug): ${kurz(einheit.grundgeruest_rohtext, 2000) || '—'}

BEREITS VORHANDENE Aktivitäten in diesem Paket (neue Items ERGÄNZEN sie; ändern kannst du sie über "aenderungen"):
${bestandListe || '(noch keine)'}

OFFENE IDEEN aus der Ideenkiste der Einheit (von der Lehrkraft gesammelt):
${ideenkisteListe || '(keine)'}

HOCHGELADENE MATERIALIEN der Lehrkraft (Index: Name):
${materialien.map((m, i) => `- ${i}: ${m.name}`).join('\n') || '(keine)'}

VERFÜGBARE AUFGABENFORMATE (Werkzeuge) — aktivitaetstyp MUSS exakt einer dieser Namen sein:
${werkzeuge}

BISHERIGER BAUPLAN (JSON, kann leer sein):
${JSON.stringify(bisherigerBauplan || {}, null, 2)}

BISHERIGES GESPRÄCH:
${gespraech || '(noch kein Gespräch)'}

NEUE NACHRICHT DER LEHRKRAFT:
"""
${String(nachricht).trim()}
"""

Deine Aufgabe:
1. antwort: Antworte der Lehrkraft kurz und kollegial (maximal 5 Sätze). Sage, was du in den Bauplan übernommen oder geändert hast, und stelle höchstens EINE gezielte Rückfrage. Wenn offene Ideenkiste-Ideen inhaltlich zu diesem Paket passen, weise EINMAL im Gespräch darauf hin und frage, ob du sie einbauen sollst (nicht in jeder Antwort wiederholen). Der eigentliche Bau passiert NICHT durch dich — die Lehrkraft klickt dafür auf "Bau das jetzt"; wenn der Plan rund wirkt, darfst du sie darauf hinweisen.
2. bauplan: Aktualisiere den Bauplan. Übernimm vorhandene Einträge und ändere nur, was sich aus der neuen Nachricht ergibt. Erfinde nichts, was den Wünschen widerspricht; sinnvoll ergänzen darfst du.
   - leitidee: roter Faden des Pakets in 1–2 Sätzen.
   - items: die geplanten NEUEN Aktivitäten in sinnvoller Reihenfolge. Richtwert: 1–2 für Input/Erarbeitung, 2–4 für Übung, 1 für Abschluss (Bestand mitzählen!). Pro Item:
     - aktivitaetstyp: EXAKTER Name aus der Werkzeug-Liste. Presse kreative Ideen nicht in Lückentext/Miniquiz — "Offene Aufgabe" ist ein vollwertiges Format für alles, was sonst nicht passt.
     - phase: "Input", "Übung" oder "Abschluss" — muss zur Phase des Werkzeugs passen.
     - idee: 1–2 Sätze für die Lehrkraft: Was macht diese Aktivität inhaltlich konkret?
     - lernziel: Was sollen die Schüler:innen dadurch können?
     - funktionsweise: präzise Umsetzungsanleitung mit konkreten Inhalten/Beispielen — danach wird die Aufgabe später gebaut, kein Platzhalter-Text.
     - quelle_url: nur bei Video/Link und nur ECHTE, von der Lehrkraft genannte URLs — niemals erfinden, sonst leer.
     - material_indizes: Indizes der hochgeladenen Materialien, die zu dieser Aktivität gehören (sonst leeres Array).
     - ideenkiste_id: die id des Ideenkiste-Eintrags, falls das Item daraus entstanden ist (sonst leer).
   Die Aufgaben müssen von Schüler:innen OHNE Lehrkraft selbstständig bearbeitbar und überprüfbar sein.
3. aenderungen: Wenn die Lehrkraft eine BESTEHENDE Aktivität anders haben möchte ("mach die Übung leichter", "der Test soll nur 5 Fragen haben"), trage die betroffene Aktivität hier ein — NICHT als neues Item. Pro Eintrag:
   - aktivitaet_id: die id aus der Liste der vorhandenen Aktivitäten (nur diese ids, niemals erfinden; FREIGEGEBENE Aktivitäten sind ausgeschlossen).
   - neue_beschreibung: die vollständig neu formulierte Aufgabenbeschreibung (nicht nur der Änderungswunsch) — so konkret, dass danach gearbeitet werden kann.
   - begruendung: ein kurzer Satz, was du geändert hast.
   Ändere nur, was die Lehrkraft wirklich möchte. Wenn eine dieser Aktivitäten schon Inhalt hat, weise in deiner Antwort darauf hin, dass die bestehenden Inhalte erhalten bleiben und nach der Änderung ggf. neu ausgearbeitet werden müssen. Löschen kannst du nichts — wenn du eine Aktivität für überflüssig hältst, sage es der Lehrkraft, sie entfernt sie selbst.
Schreibe auf Deutsch, in normaler Groß-/Kleinschreibung.`;

    const result = unwrapLLM(await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude-sonnet-5',
      response_json_schema: {
        type: 'object',
        properties: {
          antwort: { type: 'string' },
          bauplan: {
            type: 'object',
            properties: {
              leitidee: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    aktivitaetstyp: { type: 'string' },
                    phase: { type: 'string', enum: VALID_PHASES },
                    idee: { type: 'string' },
                    lernziel: { type: 'string' },
                    funktionsweise: { type: 'string' },
                    quelle_url: { type: 'string' },
                    material_indizes: { type: 'array', items: { type: 'integer' } },
                    ideenkiste_id: { type: 'string' },
                  },
                  required: ['aktivitaetstyp', 'phase', 'idee'],
                },
              },
            },
            required: ['items'],
          },
          aenderungen: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aktivitaet_id: { type: 'string' },
                neue_beschreibung: { type: 'string' },
                begruendung: { type: 'string' },
              },
              required: ['aktivitaet_id', 'neue_beschreibung'],
            },
          },
        },
        required: ['antwort', 'bauplan'],
      },
    }));

    // Validierung: unbekannte Typen verwerfen, Phase gegen Katalog korrigieren.
    const items = (Array.isArray(result?.bauplan?.items) ? result.bauplan.items : [])
      .slice(0, MAX_ITEMS)
      .filter((it) => it && katalogByName.has(it.aktivitaetstyp))
      .map((it) => {
        const phasen = phasenByName.get(it.aktivitaetstyp);
        const phase = phasen.has(it.phase) ? it.phase : [...phasen][0];
        return {
          aktivitaetstyp: it.aktivitaetstyp,
          phase,
          idee: String(it.idee || ''),
          lernziel: String(it.lernziel || ''),
          funktionsweise: String(it.funktionsweise || it.idee || ''),
          quelle_url: String(it.quelle_url || ''),
          material_indizes: (Array.isArray(it.material_indizes) ? it.material_indizes : [])
            .filter((i) => Number.isInteger(i) && i >= 0 && i < materialien.length),
          ideenkiste_id: String(it.ideenkiste_id || ''),
        };
      });

    // Änderungen (Etappe 2): nur echte, nicht freigegebene Aktivitäten dieses Pakets.
    const aenderungen = (Array.isArray(result?.aenderungen) ? result.aenderungen : [])
      .slice(0, MAX_ITEMS)
      .map((ae) => {
        const akt = bestandById.get(String(ae?.aktivitaet_id || ''));
        const neu = String(ae?.neue_beschreibung || '').trim();
        if (!akt || akt.content_status === 'approved' || !neu) return null;
        return {
          aktivitaet_id: akt.id,
          aktivitaet_name: katalogById.get(akt.aktivitaet_id) || 'Aktivität',
          phase: akt.phase,
          hat_inhalt: akt.is_complete === true,
          alte_beschreibung: beschreibungVon(akt),
          neue_beschreibung: neu,
          begruendung: String(ae?.begruendung || ''),
        };
      })
      .filter(Boolean);

    return Response.json({
      antwort: result?.antwort || '',
      bauplan: { leitidee: String(result?.bauplan?.leitidee || ''), items },
      aenderungen,
    });
  } catch (error) {
    console.error('[lernpaketWizardChat] Error:', error);
    return Response.json({ error: error.message || 'Interner Fehler' }, { status: 500 });
  }
}