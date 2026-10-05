/**
 * befundStellenFinden — sucht zu EINEM Prüfbefund alle konkreten Stellen der
 * Einheit, die er betrifft (z. B. beide Fassungen eines Textes), mit Zitat.
 * Ändert nichts. Payload: { befund_id }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAnthropicConfig, askAnthropicJson } from '../../shared/anthropicClient.js';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';
import { ladeStellen, stelleOhneRoh } from '../../shared/baumeisterStellen.js';

const SYSTEM = `Du kennst alle Aufgaben einer Unterrichtseinheit. Eine Rückmeldung des Moodle-Teams beschreibt ein Problem.
Finde ALLE Stellen der Einheit, die die Lehrkraft ansehen muss, um das Problem zu beheben (z. B. bei zwei unterschiedlichen Textfassungen BEIDE Stellen).
Regeln:
- Nur Stellen aus der Liste, bis zu 5, wichtigste zuerst. Wähle nie "neu:…".
- Belege jede Stelle mit einem WÖRTLICHEN kurzen Zitat aus ihrem Text.
- "rolle": ein kurzer Satz, was an dieser Stelle steht (z. B. "Erste Textfassung", "Abweichende Fassung").
Antworte NUR mit JSON: {"stellen":[{"ref":"…","zitat":"…","rolle":"…"}]}`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    const { befund_id } = await req.json().catch(() => ({}));
    if (!befund_id) return Response.json({ error: 'befund_id fehlt' }, { status: 400 });

    const befund = await base44.asServiceRole.entities.Pruefbefund.get(befund_id);
    if (!befund) return Response.json({ error: 'Befund nicht gefunden' }, { status: 404 });
    const einheit = await base44.asServiceRole.entities.Einheiten.get(befund.einheit_id);
    if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }
    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) return Response.json({ error: 'Kein Anthropic-Schlüssel hinterlegt' }, { status: 400 });

    const stellen = (await ladeStellen(base44, befund.einheit_id)).filter((s) => s.art !== 'neu');
    const meldung = [befund.fundort, befund.ziel_titel, befund.befund, befund.vorschlag, befund.ki_klartext].filter(Boolean).join('\n');
    // Lange Inhalte: nicht den Anfang, sondern die Ausschnitte rund um Wörter der Meldung zeigen.
    const woerter = [...new Set((meldung.toLowerCase().match(/[a-zäöüß]{5,}/g) || []))];
    const bewertet = stellen.map((s) => {
      const t = s.text.toLowerCase();
      const treffer = woerter.filter((w) => t.includes(w));
      const stellenIdx = treffer.slice(0, 40).map((w) => t.indexOf(w)).sort((a, b) => a - b);
      const ausschnitte = [];
      let ende = -1;
      for (const i of stellenIdx) {
        if (i < ende) continue;
        ausschnitte.push(s.text.slice(Math.max(0, i - 150), i + 250));
        ende = i + 250;
        if (ausschnitte.length >= 4) break;
      }
      return { s, score: treffer.length, auszug: ausschnitte.join(' … ') || s.text.slice(0, 400) };
    }).sort((a, b) => b.score - a.score).slice(0, 30);
    const liste = bewertet.map(({ s, auszug }) => `[${s.ref}] ${s.ort} · ${s.titel}\n${auszug}`).join('\n\n');
    const antwort = await askAnthropicJson(cfg, {
      system: SYSTEM,
      prompt: `RÜCKMELDUNG:\n${meldung}\n\nSTELLEN DER EINHEIT:\n${liste}`,
      maxTokens: 1500,
    });

    const byRef = new Map(stellen.map((s) => [s.ref, s]));
    const gesehen = new Set();
    const treffer = (antwort?.stellen || [])
      .filter((k) => byRef.has(k?.ref) && !gesehen.has(k.ref) && gesehen.add(k.ref))
      .slice(0, 5)
      .map((k) => ({ ...stelleOhneRoh(byRef.get(k.ref)), zitat: k.zitat || '', rolle: k.rolle || '' }));
    return Response.json({ stellen: treffer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}