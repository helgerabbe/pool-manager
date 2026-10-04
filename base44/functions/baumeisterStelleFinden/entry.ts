/**
 * baumeisterStelleFinden — Gewerk 1 des Baumeisters: der EINHEITEN-EXPERTE.
 *
 * Bekommt einen sprachlichen Hinweis der Lehrkraft und findet die gemeinte
 * Stelle in der Einheit. Er baut NICHTS — er belegt seine Zuordnung mit einem
 * Zitat und nennt bei Unsicherheit mehrere Kandidaten, damit die Lehrkraft
 * bestätigt, bevor gebaut wird.
 *
 * Payload: { einheit_id, hinweis }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAnthropicConfig, askAnthropicJson } from '../../shared/anthropicClient.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';
import { ladeStellen, stelleOhneRoh } from '../../shared/baumeisterStellen.js';

const SYSTEM = `Du bist der Einheiten-Experte eines Unterrichtsplanungs-Werkzeugs. Du kennst alle Aufgaben einer Unterrichtseinheit.
Deine EINZIGE Aufgabe: Finde heraus, welche Stelle(n) die Lehrkraft mit ihrem Hinweis meint. Du änderst nichts.
Regeln:
- Belege jede Zuordnung mit einem WÖRTLICHEN kurzen Zitat aus dem Text der Stelle.
- Bist du dir nicht sicher, nenne bis zu 3 Kandidaten (wahrscheinlichster zuerst) und setze "eindeutig": false.
- Passt nichts, gib eine leere Kandidatenliste und eine freundliche Rückfrage.
Antworte NUR mit JSON:
{"kandidaten":[{"ref":"<ref aus der Liste>","zitat":"...","begruendung":"ein Satz"}],"eindeutig":true,"rueckfrage":""}`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const { einheit_id, hinweis } = await req.json().catch(() => ({}));
    if (!einheit_id || !String(hinweis || '').trim()) {
      return Response.json({ error: 'einheit_id und hinweis sind Pflicht' }, { status: 400 });
    }

    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) return Response.json({ error: 'Kein Anthropic-Schlüssel hinterlegt' }, { status: 400 });

    const stellen = await ladeStellen(base44, einheit_id);
    if (stellen.length === 0) {
      return Response.json({
        kandidaten: [],
        eindeutig: false,
        rueckfrage: 'In dieser Einheit gibt es keine bearbeitbaren Aufgaben (freigegebene Inhalte sind geschützt).',
      });
    }

    const liste = stellen
      .map((s) => `[${s.ref}] ${s.ort} · ${s.titel}\n${s.text.slice(0, 500)}`)
      .join('\n\n');
    const antwort = await askAnthropicJson(cfg, {
      system: SYSTEM,
      prompt: `HINWEIS DER LEHRKRAFT:\n${hinweis}\n\nSTELLEN DER EINHEIT:\n${liste}`,
      maxTokens: 1500,
    });

    const byRef = new Map(stellen.map((s) => [s.ref, s]));
    const kandidaten = (antwort?.kandidaten || [])
      .filter((k) => byRef.has(k?.ref))
      .slice(0, 3)
      .map((k) => ({ ...stelleOhneRoh(byRef.get(k.ref)), zitat: k.zitat || '', begruendung: k.begruendung || '' }));

    return Response.json({
      kandidaten,
      eindeutig: antwort?.eindeutig === true && kandidaten.length === 1,
      rueckfrage: antwort?.rueckfrage || (kandidaten.length ? '' : 'Ich konnte keine passende Stelle finden. Kannst du genauer beschreiben, welche Aufgabe gemeint ist?'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}