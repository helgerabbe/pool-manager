/**
 * mbkDublettenPruefung
 *
 * Vergleicht die von der MBK gemeldeten Befunde einer Einheit mit den Befunden
 * der eigenen Prüfung und markiert, was doppelt ist.
 *
 * Bewusst NICHT automatisch beim Abholen: Der Bau beschreibt eine Stelle oft
 * mit anderen Worten als die eigene Prüfung, deshalb ist das eine Leseaufgabe
 * für ein Sprachmodell — und ein Sprachmodell darf keine Meldung stillschweigend
 * verschwinden lassen. Diese Funktion MARKIERT nur (`dublette_status`); gelöscht
 * wird nichts, und die Lehrkraft sieht die Begründung und kann sie verwerfen.
 *
 * Payload: { einheit_id }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';
import { getAnthropicConfig, askAnthropicJson } from '../../shared/anthropicClient.js';

const SYSTEM = `Du vergleichst zwei Mängellisten zu derselben Unterrichtseinheit.
Liste A stammt aus der eigenen Prüfung der Schule, Liste B aus dem Kursbau (MBK).

Deine Aufgabe: Finde für jeden Eintrag aus Liste B heraus, ob Liste A denselben Mangel an derselben Stelle schon beschreibt.

Regeln:
- "Dieselbe Stelle UND derselbe Mangel" = Dublette. Gleiche Stelle, aber ein ANDERER Mangel ist KEINE Dublette.
- Verschiedene Formulierungen für denselben Sachverhalt sind eine Dublette.
- Wenn du unsicher bist, entscheide auf KEINE Dublette. Ein doppelter Eintrag ist harmloser als ein verlorener Mangel.
- "begruendung": ein kurzer Satz, warum es dieselbe Stelle und derselbe Mangel ist.
- Antworte AUSSCHLIESSLICH mit JSON:
  {"treffer":[{"b_id":"<id aus Liste B>","a_id":"<id aus Liste A>","begruendung":"…"}]}
- Einträge aus B ohne Dublette lässt du weg.`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const einheitId = body?.einheit_id;
    if (!einheitId) return Response.json({ error: 'einheit_id fehlt' }, { status: 400 });

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
      return Response.json(
        { error: 'Nur Fachschaftsleitung, Einheits-Leitung oder Administratoren dürfen die Dublettenprüfung starten.' },
        { status: 403 }
      );
    }

    const alle = await base44.asServiceRole.entities.Pruefbefund.filter({ einheit_id: einheitId });
    const intern = (alle || []).filter((b) => (b.quelle || 'regel') !== 'mbk');
    // Erledigte MBK-Befunde erneut zu prüfen bringt nichts – sie sind vom Tisch.
    const mbk = (alle || []).filter(
      (b) => b.quelle === 'mbk' && (b.entscheidung || 'offen') === 'offen'
    );

    if (mbk.length === 0) {
      return Response.json({ ok: true, geprueft: 0, dubletten: 0, eigenstaendig: 0, hinweis: 'Keine offenen MBK-Befunde.' });
    }

    const jetzt = new Date().toISOString();

    // Ohne eigene Befunde kann nichts doppelt sein – dafür braucht es keine KI.
    if (intern.length === 0) {
      await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(
        mbk.map((b) => ({
          id: b.id,
          dublette_status: 'eigenstaendig',
          dublette_von_befund_id: '',
          dublette_begruendung: '',
          dublette_geprueft_am: jetzt,
        }))
      );
      return Response.json({
        ok: true,
        geprueft: mbk.length,
        dubletten: 0,
        eigenstaendig: mbk.length,
        hinweis: 'Die eigene Prüfung hat keine Befunde – es kann keine Dubletten geben.',
      });
    }

    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) {
      return Response.json(
        { error: 'Für die Dublettenprüfung ist kein KI-Zugang hinterlegt (Admin-Einstellungen).' },
        { status: 400 }
      );
    }

    const kurz = (b) => ({
      id: b.id,
      stelle: b.ziel_titel || '',
      lernpaket: b.lernpaket_titel || '',
      kategorie: b.kategorie,
      mangel: String(b.befund || '').slice(0, 500),
    });

    const prompt = `Liste A – eigene Prüfung:\n${JSON.stringify(intern.map(kurz), null, 1)}\n\n`
      + `Liste B – Rückmeldung des Kursbaus:\n${JSON.stringify(mbk.map(kurz), null, 1)}`;

    const antwort = await askAnthropicJson(cfg, { system: SYSTEM, prompt, maxTokens: 4000 });

    const internIds = new Set(intern.map((b) => b.id));
    const treffer = new Map();
    for (const t of antwort?.treffer || []) {
      if (!t?.b_id || !t?.a_id) continue;
      if (!internIds.has(t.a_id)) continue; // erfundene Referenz ignorieren
      treffer.set(t.b_id, {
        a_id: t.a_id,
        begruendung: String(t.begruendung || '').slice(0, 400),
      });
    }

    const updates = mbk.map((b) => {
      const t = treffer.get(b.id);
      if (t) {
        return {
          id: b.id,
          dublette_status: 'dublette',
          dublette_von_befund_id: t.a_id,
          dublette_begruendung: t.begruendung,
          dublette_geprueft_am: jetzt,
        };
      }
      return {
        id: b.id,
        dublette_status: 'eigenstaendig',
        dublette_von_befund_id: '',
        dublette_begruendung: '',
        dublette_geprueft_am: jetzt,
      };
    });

    await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(updates);

    return Response.json({
      ok: true,
      geprueft: mbk.length,
      dubletten: treffer.size,
      eigenstaendig: mbk.length - treffer.size,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}