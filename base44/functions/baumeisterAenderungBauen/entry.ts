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

    // Verlangt der Wunsch eine ANDERE Aufgabenart (z. B. KI-Tutor statt Bestätigen)?
    if (stelle.art === 'aktivitaet') {
      const katalog = (await base44.asServiceRole.entities.AktivitaetenKatalog.filter({ is_active: true }))
        .filter((k) => Array.isArray(k.form_schema) && k.form_schema.length);
      const bisher = basis?.__artwechsel_id ? katalog.find((k) => k.id === basis.__artwechsel_id) : null;
      const wahl = bisher ? { wechsel: true, aktivitaet_id: bisher.id } : await askAnthropicJson(cfg, {
        system: 'Entscheide, ob der Änderungswunsch eine ANDERE Aufgabenart verlangt, als die Aktivität jetzt hat (z. B. sollen Schüler etwas schreiben und prüfen lassen, die Aktivität kann aber nur bestätigen). Antworte NUR mit JSON: {"wechsel":false} oder {"wechsel":true,"aktivitaet_id":"<id aus der Liste>"}',
        prompt: `JETZIGE AUFGABENART: ${stelle.titel}\nINHALT: ${stelle.text.slice(0, 800)}\n\nMÖGLICHE AUFGABENARTEN:\n${katalog.map((k) => `[${k.id}] ${k.name}: ${(k.beschreibung || '').slice(0, 150)}`).join('\n')}\n\n${wunschText(hinweis, zusatz)}`,
        maxTokens: 300,
      });
      const ziel = wahl?.wechsel === true && katalog.find((k) => k.id === wahl.aktivitaet_id);
      if (ziel && ziel.name !== stelle.titel) {
        const felder = ziel.form_schema
          .filter((f) => f.type !== 'info')
          .map((f) => `- ${f.field_name} (${f.type}${f.required ? ', Pflicht' : ''}): ${f.label}`)
          .join('\n');
        const vorher = bisher ? { ...basis } : {};
        delete vorher.__artwechsel_id;
        const antwort = await askAnthropicJson(cfg, {
          system: `${GRUNDREGEL}\nDie Aktivität wird durch die Aufgabenart „${ziel.name}" ersetzt. Fülle ALLE Felder dieser Art vollständig und fachlich passend aus, auch die nur für die KI bestimmten (Erwartungshorizont, Anweisungen, Abschlussregel). Übernimm Inhalte der alten Aktivität, wo sie passen. Antworte NUR mit JSON: {"field_values":{...},"aenderung":"..."}`,
          prompt: `ALTE AKTIVITÄT (${stelle.titel}):\n${JSON.stringify(stelle.roh.field_values, null, 2)}\n\n${bisher ? `BISHERIGER ENTWURF:\n${JSON.stringify(vorher, null, 2)}\n\n` : ''}FELDER DER NEUEN ART:\n${felder}\n\n${wunschText(hinweis, zusatz)}`,
          maxTokens: 8000,
        });
        if (!antwort?.field_values) {
          return Response.json({ error: 'Die KI hat keine verwertbare Fassung geliefert. Bitte erneut versuchen.' }, { status: 502 });
        }
        return Response.json({
          stelle: stelleOhneRoh(stelle),
          form_schema: ziel.form_schema,
          alt: stelle.roh.field_values,
          neu: antwort.field_values,
          artwechsel: {
            aktivitaet_id: ziel.id,
            von: stelle.titel,
            zu: ziel.name,
            phase: stelle.roh.phase,
            position: stelle.roh.position,
          },
          aenderung: `Aufgabenart gewechselt: „${stelle.titel}" → „${ziel.name}". ${antwort.aenderung || ''}`.trim(),
        });
      }
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