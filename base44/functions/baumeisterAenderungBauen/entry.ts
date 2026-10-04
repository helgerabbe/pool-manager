/**
 * baumeisterAenderungBauen — Gewerk 2 des Baumeisters: der BAUER.
 *
 * Arbeitet an GENAU EINER bestätigten Stelle und liefert die neue Fassung
 * samt einem Satz, WAS geändert wurde. Er schreibt nichts in die Datenbank —
 * übernommen wird erst über das Freigabe-Tor des Import-Centers.
 *
 * Payload: { einheit_id, ref, hinweis, zusatz?, basis? }
 *   basis = die zuletzt vorgeschlagene Fassung, wenn die Lehrkraft nachbessern lässt.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAnthropicConfig, askAnthropicJson, askAnthropicText } from '../../shared/anthropicClient.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';
import { ladeStellen, stelleOhneRoh } from '../../shared/baumeisterStellen.js';

const GRUNDREGEL = `Du bist der Bauer eines Unterrichtsplanungs-Werkzeugs. Du setzt den Änderungswunsch einer Lehrkraft an EINER Aufgabe um.
- Ändere nur, was der Wunsch verlangt. Alles andere bleibt Zeichen für Zeichen gleich.
- Verlangt der Wunsch einen Neubau, baue die Aufgabe neu — schülergerecht und vollständig.
- Beschreibe deine Änderung in EINEM kurzen, konkreten Satz (z. B. „Im Hinweis ‚Gleichgültigkeit' durch ‚Resignation' ersetzt.").`;

function wunschText(hinweis, zusatz) {
  return `ÄNDERUNGSWUNSCH:\n${hinweis}${zusatz ? `\n\nERGÄNZUNG DER LEHRKRAFT ZUM LETZTEN VORSCHLAG:\n${zusatz}` : ''}`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const { einheit_id, ref, hinweis, zusatz, basis } = await req.json().catch(() => ({}));
    if (!einheit_id || !ref || !hinweis) {
      return Response.json({ error: 'einheit_id, ref und hinweis sind Pflicht' }, { status: 400 });
    }
    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) return Response.json({ error: 'Kein Anthropic-Schlüssel hinterlegt' }, { status: 400 });

    const stelle = (await ladeStellen(base44, einheit_id)).find((s) => s.ref === ref);
    if (!stelle) return Response.json({ error: 'Die Stelle ist nicht (mehr) bearbeitbar.' }, { status: 404 });

    if (stelle.art === 'aktivitaet' || stelle.art === 'aufgabe') {
      const alt = stelle.roh.field_values;
      const ausgang = basis && typeof basis === 'object' ? basis : alt;
      const felder = (stelle.roh.form_schema || [])
        .map((f) => `- ${f.field_name} (${f.type}): ${f.label}`)
        .join('\n');
      const antwort = await askAnthropicJson(cfg, {
        system: `${GRUNDREGEL}\nDie Aufgabe ist ein Objekt aus Feldwerten. Behalte Feldnamen und Datenformat exakt bei (Arrays bleiben Arrays, Objekte bleiben Objekte). Antworte NUR mit JSON: {"field_values":{...ALLE Felder...},"aenderung":"..."}`,
        prompt: `AUFGABENART: ${stelle.titel}\nFELDER:\n${felder}\n\nAKTUELLE FELDWERTE:\n${JSON.stringify(ausgang, null, 2)}\n\n${wunschText(hinweis, zusatz)}`,
        maxTokens: 8000,
      });
      if (!antwort?.field_values || typeof antwort.field_values !== 'object') {
        return Response.json({ error: 'Die KI hat keine verwertbare Fassung geliefert. Bitte erneut versuchen.' }, { status: 502 });
      }
      return Response.json({
        stelle: stelleOhneRoh(stelle),
        form_schema: stelle.roh.form_schema,
        alt,
        neu: stelle.art === 'aufgabe'
          ? Object.fromEntries(Object.keys(alt).map((k) => [k, String(antwort.field_values[k] ?? ausgang[k] ?? '')]))
          : { ...ausgang, ...antwort.field_values },
        aenderung: antwort.aenderung || '',
      });
    }

    // Offene Aufgabe: HTML als reiner Text — in JSON verpackt wäre es fehleranfällig.
    const alt = stelle.roh.fragment;
    const ausgang = typeof basis === 'string' && basis ? basis : alt;
    const { text } = await askAnthropicText(cfg, {
      system: `${GRUNDREGEL}\nDie Aufgabe ist ein HTML-Fragment (<div class="aufgabe"> mit eigenem <style>/<script>). Gib zurück:\nerste Zeile: AENDERUNG: <dein Satz>\ndanach NUR das vollständige neue Fragment, ohne Markdown-Zäune.`,
      prompt: `AKTUELLES FRAGMENT:\n${ausgang}\n\n${wunschText(hinweis, zusatz)}`,
      maxTokens: 20000,
    });
    const zeile = text.match(/AENDERUNG:\s*(.+)/);
    const start = text.indexOf('<');
    const neu = start >= 0 ? text.slice(start).replace(/```\s*$/, '').trim() : '';
    if (!neu) {
      return Response.json({ error: 'Die KI hat kein HTML geliefert. Bitte erneut versuchen.' }, { status: 502 });
    }
    return Response.json({ stelle: stelleOhneRoh(stelle), alt, neu, aenderung: zeile ? zeile[1].trim() : '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}