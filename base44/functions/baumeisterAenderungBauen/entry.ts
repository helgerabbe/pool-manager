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
import { ladeStellen, stelleOhneRoh, schritteAlsFelder } from '../../shared/baumeisterStellen.js';

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

    const alleStellen = await ladeStellen(base44, einheit_id);
    let stelle = alleStellen.find((s) => s.ref === ref);
    if (!stelle) return Response.json({ error: 'Die Stelle ist nicht (mehr) bearbeitbar.' }, { status: 404 });

    // Aufgabe mit Schrittfolge: erst klären, ob ein Schritt GELÖSCHT werden soll.
    const seq = stelle.art === 'aufgabe' ? alleStellen.find((s) => s.ref === `seq:${stelle.ziel_id}`) : null;
    if (seq) {
      const wahl = await askAnthropicJson(cfg, {
        system: 'Entscheide, ob der Änderungswunsch verlangt, einen Schritt der Aufgabenfolge zu ENTFERNEN (z. B. weil Schritte doppelt sind). Antworte NUR mit JSON: {"entfernen":true|false}',
        prompt: `SCHRITTE:\n${seq.text}\n\n${wunschText(hinweis, zusatz)}`,
        maxTokens: 200,
      });
      if (wahl?.entfernen === true) stelle = seq;
    }

    if (stelle.art === 'sequenz') {
      const schritte = stelle.roh.schritte;
      const antwort = await askAnthropicJson(cfg, {
        system: `${GRUNDREGEL}\nDu darfst hier NUR einen Schritt entfernen. Sind zwei Schritte gleich, entferne den späteren. Antworte NUR mit JSON: {"schritt_id":"<id>","grund":"...","aenderung":"..."}`,
        prompt: `SCHRITTE:\n${schritte.map((s) => `[${s.id}] Schritt ${s.nr}: ${s.titel} – ${s.text}`).join('\n')}\n\n${wunschText(hinweis, zusatz)}`,
        maxTokens: 800,
      });
      const weg = schritte.find((s) => s.id === antwort?.schritt_id);
      if (!weg) return Response.json({ error: 'Die KI konnte keinen Schritt zum Entfernen bestimmen. Bitte genauer beschreiben.' }, { status: 502 });
      return Response.json({
        stelle: stelleOhneRoh(stelle),
        alt: schritteAlsFelder(schritte),
        neu: schritteAlsFelder(schritte, weg.id),
        entfernen: { schritt_id: weg.id, grund: antwort.grund || `Schritt ${weg.nr} entfernt` },
        aenderung: antwort.aenderung || `Schritt ${weg.nr} „${weg.titel}" entfernt.`,
      });
    }

    if (stelle.art === 'neu') {
      const { text } = await askAnthropicText(cfg, {
        system: `${GRUNDREGEL}\nBaue eine NEUE offene Aufgabe als HTML-Fragment (<div class="aufgabe"> mit eigenem <style>/<script>, ohne <html>/<body>). Gib zurück:\nerste Zeile: TITEL: <Titel der Aufgabe>\nzweite Zeile: AENDERUNG: <ein Satz>\ndanach NUR das Fragment, ohne Markdown-Zäune.`,
        prompt: `${typeof basis === 'string' && basis ? `BISHERIGER ENTWURF:\n${basis}\n\n` : ''}${wunschText(hinweis, zusatz)}`,
        maxTokens: 20000,
      });
      const start = text.indexOf('<');
      const neu = start >= 0 ? text.slice(start).replace(/```\s*$/, '').trim() : '';
      if (!neu) return Response.json({ error: 'Die KI hat kein HTML geliefert. Bitte erneut versuchen.' }, { status: 502 });
      return Response.json({
        stelle: stelleOhneRoh(stelle),
        alt: '',
        neu,
        titel: (text.match(/TITEL:\s*(.+)/)?.[1] || 'Neue Aufgabe').trim(),
        aenderung: (text.match(/AENDERUNG:\s*(.+)/)?.[1] || 'Neue Aufgabe angelegt.').trim(),
      });
    }

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