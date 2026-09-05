import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAnthropicConfig, askAnthropicJson } from '../../shared/anthropicClient.js';

/**
 * Lernlandkarte, Etappe 0: Schlägt für BESTEHENDE Themenfelder eine
 * schülergerechte Leitfrage vor und formuliert leere Lernziel-Übersetzungen
 * (`schueler_uebersetzung`) in Schülerfragen um.
 *
 * Reiner Vorschlag — es wird NICHTS gespeichert. Die Administration sichtet
 * die Liste und übernimmt sie über `applyLeitfragen`.
 */
const SYSTEM = `Du formulierst Leitfragen für eine Lernlandkarte in der Schule.
Regeln:
- Immer eine echte Frage, die ein Schüler sich selbst stellen würde.
- Kurz (max. 90 Zeichen), Du-Form vermeiden, keine Fachbegriffe ohne Not.
- Keine Anführungszeichen, kein Markdown.
Antworte ausschließlich mit JSON.`;

async function batches(items, groesse) {
  const res = [];
  for (let i = 0; i < items.length; i += groesse) res.push(items.slice(i, i + groesse));
  return res;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur Administratoren.' }, { status: 403 });
    }

    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) {
      return Response.json(
        { error: 'Der KI-Zugang ist nicht eingerichtet (Integrationen → Anthropic).' },
        { status: 400 }
      );
    }

    const svc = base44.asServiceRole.entities;
    const [alleFelder, allePakete] = await Promise.all([
      svc.Themenfeld.list(),
      svc.Lernpakete.list(),
    ]);

    const offeneFelder = (alleFelder || []).filter((tf) => !String(tf.leitfrage || '').trim());
    const paketeByFeld = new Map();
    for (const p of allePakete || []) {
      if (!p.themenfeld_id) continue;
      if (!paketeByFeld.has(p.themenfeld_id)) paketeByFeld.set(p.themenfeld_id, []);
      paketeByFeld.get(p.themenfeld_id).push(p);
    }

    // Lernziele einsammeln (nur die, deren Schülerformulierung fehlt)
    const alleZiele = [];
    for (const paket of allePakete || []) {
      const ziele = await svc.Lernziele.filter({ lernpaket_id: paket.id }).catch(() => []);
      for (const z of ziele || []) {
        alleZiele.push({ ...z, _paketTitel: paket.titel_des_pakets, _themenfeldId: paket.themenfeld_id });
      }
    }
    const offeneZiele = alleZiele.filter((z) => !String(z.schueler_uebersetzung || '').trim());

    // ── Themenfeld-Leitfragen ────────────────────────────────────────────
    const themenfeldVorschlaege = [];
    for (const gruppe of await batches(offeneFelder, 12)) {
      const eingabe = gruppe.map((tf) => ({
        id: tf.id,
        titel: tf.titel,
        beschreibung: tf.beschreibung || '',
        lernziele: alleZiele
          .filter((z) => z._themenfeldId === tf.id)
          .slice(0, 8)
          .map((z) => z.formulierung_fachsprache),
      }));
      const antwort = await askAnthropicJson(cfg, {
        system: SYSTEM,
        maxTokens: 2000,
        prompt: `Formuliere pro Themenfeld EINE übergreifende Leitfrage, die alle darunterliegenden Lernziele zusammenfasst.
Themenfelder:
${JSON.stringify(eingabe, null, 2)}

Antwortformat: {"vorschlaege":[{"id":"<id>","leitfrage":"..."}]}`,
      });
      for (const v of antwort?.vorschlaege || []) {
        const tf = gruppe.find((x) => x.id === v.id);
        if (!tf || !v.leitfrage) continue;
        themenfeldVorschlaege.push({
          id: tf.id,
          titel: tf.titel,
          einheit_id: tf.einheit_id,
          leitfrage: String(v.leitfrage).trim(),
        });
      }
    }

    // ── Lernziel-Leitfragen ──────────────────────────────────────────────
    const lernzielVorschlaege = [];
    for (const gruppe of await batches(offeneZiele, 20)) {
      const eingabe = gruppe.map((z) => ({
        id: z.id,
        fachsprache: z.formulierung_fachsprache,
        lernpaket: z._paketTitel || '',
      }));
      const antwort = await askAnthropicJson(cfg, {
        system: SYSTEM,
        maxTokens: 2500,
        prompt: `Formuliere jedes Lernziel („Ich kann …") als kurze Schülerfrage um (z. B. „Wie berechne ich den Flächeninhalt eines Quadrats?").
Lernziele:
${JSON.stringify(eingabe, null, 2)}

Antwortformat: {"vorschlaege":[{"id":"<id>","frage":"..."}]}`,
      });
      for (const v of antwort?.vorschlaege || []) {
        const z = gruppe.find((x) => x.id === v.id);
        if (!z || !v.frage) continue;
        lernzielVorschlaege.push({
          id: z.id,
          fachsprache: z.formulierung_fachsprache,
          lernpaket: z._paketTitel || '',
          schueler_uebersetzung: String(v.frage).trim(),
        });
      }
    }

    return Response.json({
      themenfelder: themenfeldVorschlaege,
      lernziele: lernzielVorschlaege,
      offen: { themenfelder: offeneFelder.length, lernziele: offeneZiele.length },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}