/**
 * mbkVorsortierung — KI-Vorsortierung der offenen MBK-Hinweise einer Einheit.
 *
 * Ordnet jeden offenen Hinweis einem Stapel zu und formuliert ihn für
 * Lehrkräfte verständlich. Entscheidet NICHTS: `entscheidung` bleibt 'offen'.
 *
 * Payload: { einheit_id, nur_neue?: boolean }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';
const STAPEL = ['uebernehmen', 'reparieren', 'lehrkraft', 'schliessen'];
const SCHEMA = {
  type: 'object',
  properties: {
    ergebnisse: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          stapel: { type: 'string', enum: STAPEL },
          klartext: { type: 'string' },
          schritt: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM = `Du hilfst Lehrkräften, Rückmeldungen des Moodle-Kursbau-Teams (MBK) zu einer Unterrichtseinheit abzuarbeiten.
Die Meldungen sind technisch formuliert. Ordne jede Meldung genau einem Stapel zu:

- "uebernehmen": Das Moodle-Team hat die Stelle im Kurs bereits selbst korrigiert (Hinweis: kurs_umgehung="korrektur" oder der Text sagt, die Korrektur gilt im Kurs). Es muss nur die Korrektur in den Pool-Manager übernommen werden.
- "reparieren": Ein Text- oder Inhaltsproblem, das eine KI selbst beheben kann: unklare Aufgabenstellung, fehlende Musterlösung, fehlende Rückmeldung, zu schwerer Text, technischer Fehler in einer HTML-Aufgabe.
- "lehrkraft": Nur die Lehrkraft kann helfen: Material/Datei/Arbeitsblatt/Bild fehlt, eine didaktische Entscheidung ist nötig, der Inhalt ist unbekannt.
- "schliessen": Betrifft nur die Gestaltung in Moodle (kurs_umgehung="gestaltung") ohne Handlungsbedarf im Pool-Manager, ist offensichtlich veraltet oder doppelt.

Für jede Meldung schreibst du:
- "klartext": 1–2 kurze Sätze in einfacher Sprache, wie man es einer Kollegin sagen würde. Keine Technikbegriffe (kein JS, Fragment, Engine, Variable, maskiert, execCommand). Beispiel: "Hier fehlt das Arbeitsblatt, das die Schüler bearbeiten sollen."
- "schritt": ein kurzer Satz, was als Nächstes passiert oder was die Lehrkraft tun kann (bei "lehrkraft" auch Alternativen, z. B. "Lade das Arbeitsblatt hoch oder lass die KI eine andere Aufgabe vorschlagen.").

Antworte AUSSCHLIESSLICH mit JSON: {"ergebnisse":[{"id":"…","stapel":"…","klartext":"…","schritt":"…"}]}`;

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
      return Response.json({ error: 'Keine Berechtigung für die Vorsortierung.' }, { status: 403 });
    }


    const alle = await base44.asServiceRole.entities.Pruefbefund.filter({ einheit_id: einheitId, quelle: 'mbk' }, '-created_date', 500);
    let offen = (alle || []).filter((b) => (b.entscheidung || 'offen') === 'offen');
    if (body?.nur_neue) offen = offen.filter((b) => !b.ki_stapel);
    if (offen.length === 0) return Response.json({ ok: true, sortiert: 0 });

    const kurz = (b) => ({
      id: b.id,
      stelle: b.ziel_titel || '',
      art: b.ziel_typ,
      kategorie: b.kategorie,
      kurs_umgehung: b.kurs_umgehung || 'keine',
      meldung: String(b.befund || '').slice(0, 900),
      vorschlag_mbk: String(b.vorschlag || '').slice(0, 600),
    });

    const ids = new Set(offen.map((b) => b.id));
    const jetzt = new Date().toISOString();
    const updates = [];
    const PAKET = 15;
    const pakete = [];
    for (let i = 0; i < offen.length; i += PAKET) pakete.push(offen.slice(i, i + PAKET));

    const fehler = [];
    // Jeweils drei Pakete gleichzeitig — sonst greift das Ratenlimit des KI-Zugangs.
    const antworten = [];
    for (let i = 0; i < pakete.length; i += 3) {
      const teil = await Promise.all(pakete.slice(i, i + 3).map((p) =>
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `${SYSTEM}\n\nMeldungen:\n${JSON.stringify(p.map(kurz), null, 1)}`,
          response_json_schema: SCHEMA,
        })
          .catch((e) => { fehler.push(e.message); return null; })
      ));
      antworten.push(...teil);
    }

    for (const a of antworten) {
      for (const r of a?.ergebnisse || []) {
        if (!ids.has(r?.id) || !STAPEL.includes(r?.stapel)) continue;
        ids.delete(r.id); // jede Meldung nur einmal übernehmen
        updates.push({
          id: r.id,
          ki_stapel: r.stapel,
          ki_klartext: String(r.klartext || '').slice(0, 500),
          ki_naechster_schritt: String(r.schritt || '').slice(0, 400),
          ki_sortiert_am: jetzt,
        });
      }
    }

    if (updates.length) await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(updates);
    return Response.json({ ok: true, sortiert: updates.length, offen: offen.length, fehler: fehler.slice(0, 3) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}