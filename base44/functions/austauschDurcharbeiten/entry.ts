/**
 * austauschDurcharbeiten
 *
 * „Einmal lesen": Arbeitet die offenen Nachrichten des Kursbaus im Briefkasten
 * `austausch/` selbstständig durch — chronologisch, älteste zuerst.
 *
 * WARUM: Der Kursbau antwortet auf jede Antwort. Wenn jede dieser Rückmeldungen
 * einen Menschen braucht, ist der Posteingang binnen Minuten wieder voll,
 * obwohl fast alles bloße Bestätigungen sind. Also entscheidet der Pool-Manager
 * je Nachricht selbst:
 *
 *   erledigt  — reine Bestätigung / Kenntnisnahme, es ist nichts zu tun.
 *   antworten — beantwortbar aus dem Schriftwechsel: Antwort wird abgelegt,
 *               die Ursprungsnachricht auf 'beantwortet' gesetzt.
 *   sichtung  — braucht einen Menschen: tiefer Eingriff, Entscheidung oder
 *               unklar. Bleibt liegen, im eigenen Bereich, mit Begründung.
 *
 * Alles wird in EINEM Commit geschrieben. Geändert wird an bestehenden
 * Nachrichten ausschließlich der Kopf (Status, ggf. Sichtungsgrund).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';
import {
  REPO_OWNER, REPO_NAME, REPO_BRANCH, listDirectory, readTextFile,
} from '../../shared/githubRead.js';
import {
  AUSTAUSCH_ORDNER, parseNachricht, setzeStatus, setzeKopfFeld,
  baueNachricht, baueDateiname,
} from '../../shared/austauschNachricht.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';

const MAX_PRO_LAUF = 12;

const ENTSCHEID_SCHEMA = {
  type: 'object',
  properties: {
    entscheidung: { type: 'string', enum: ['erledigt', 'antworten', 'sichtung'] },
    begruendung: { type: 'string' },
    betreff: { type: 'string' },
    antwort: { type: 'string' },
  },
  required: ['entscheidung', 'begruendung'],
};

const LEITFADEN = `
Du führst den Schriftwechsel des Pool-Managers (Planungswerkzeug der Fachgruppe)
mit dem Kursbau/MBK (baut daraus die Moodle-Kurse). Du liest EINE Nachricht des
Kursbaus und entscheidest, was mit ihr geschieht.

"erledigt": Die Nachricht bestätigt nur etwas, nimmt etwas zur Kenntnis oder
kündigt an, beim nächsten Export darauf zu achten. Es steht keine Frage darin
und für uns ist nichts zu tun. Das ist der häufigste Fall — wähle ihn, wenn eine
Antwort nur Höflichkeit wäre.

"antworten": Es steht eine Frage oder Bitte darin, die sich aus dem
Schriftwechsel selbst beantworten lässt (Zusage, Klarstellung, Format-Auskunft,
Terminliches). Schreibe die Antwort: sachlich, in ganzen Sätzen, ohne Floskeln
und ohne Aufzählung von Selbstverständlichkeiten. Sage nichts zu, was du nicht
sicher weißt, und behaupte nie, etwas sei bereits geändert oder gebaut.

"sichtung": Ein Mensch muss ran. Das gilt, wenn die Nachricht eine inhaltliche
Entscheidung der Fachgruppe verlangt, einen tiefen Eingriff in Daten, Struktur
oder Verträge fordert, Widerspruch zu einer bestehenden Absprache enthält, wenn
unklar ist, was der Kursbau will, oder wenn eine falsche Antwort Schaden
anrichten könnte. Schreibe in die Begründung EINEN Satz, was zu entscheiden ist.

Die Begründung ist immer für die Lehrkraft, nie für den Kursbau. Antworte auf
Deutsch.
`.trim();

function kuerze(t, max = 4000) {
  const s = String(t || '');
  return s.length > max ? `${s.slice(0, max)}\n…[gekürzt]` : s;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (!(await hatImportCenterZugang(base44, user))) {
      return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
    }

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const dateien = (await listDirectory(token, AUSTAUSCH_ORDNER)).filter(
      (d) => d.name.endsWith('.md') && d.name !== 'README.md',
    );
    const rohText = new Map();
    const alle = [];
    for (const d of dateien) {
      const text = (await readTextFile(token, d.path)) || '';
      rohText.set(d.name, text);
      alle.push(parseNachricht(text, d.name));
    }

    // Chronologisch, älteste zuerst — der Dateiname beginnt mit dem Datum.
    const offen = alle
      .filter((n) => n.an === 'pm' && n.status === 'offen')
      .sort((a, b) => (a.datei > b.datei ? 1 : a.datei < b.datei ? -1 : 0))
      .slice(0, MAX_PRO_LAUF);

    if (offen.length === 0) {
      return Response.json({ ok: true, gelesen: 0, ergebnisse: [], commit_url: null });
    }

    const enc = new TextEncoder();
    const files = [];
    const ergebnisse = [];
    const jetzt = new Date();
    const datum = jetzt.toISOString().slice(0, 10);
    const belegteNamen = new Set(dateien.map((d) => d.name));

    for (const n of offen) {
      const vorgaenger = n.antwortet_auf ? alle.find((a) => a.datei === n.antwortet_auf) : null;
      const prompt = `${LEITFADEN}

## Unsere Nachricht, auf die der Kursbau antwortet
${vorgaenger ? `Betreff: ${vorgaenger.betreff}\n\n${kuerze(vorgaenger.text, 2500)}` : '(keine — der Kursbau schreibt von sich aus)'}

## Nachricht des Kursbaus
Datei: ${n.datei}
Betreff: ${n.betreff}
${n.braucht_malte ? 'Der Kursbau hat sie als „braucht Malte" markiert.\n' : ''}
${kuerze(n.text)}

Entscheide jetzt. Bei "antworten" füllst du zusätzlich betreff (kurz, ohne
"Antwort:"-Vorsatz) und antwort (der Fließtext).`;

      const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: ENTSCHEID_SCHEMA,
      });

      const entscheidung = ['erledigt', 'antworten', 'sichtung'].includes(antwort?.entscheidung)
        ? antwort.entscheidung
        : 'sichtung';
      const begruendung = String(antwort?.begruendung || '').trim()
        || 'Die Nachricht konnte nicht eingeordnet werden.';
      const original = rohText.get(n.datei) || '';
      const eintrag = { datei: n.datei, betreff: n.betreff, entscheidung, begruendung, antwort_datei: null };

      if (entscheidung === 'antworten' && String(antwort?.antwort || '').trim()) {
        const betreff = String(antwort.betreff || n.betreff).replace(/^Antwort:\s*/i, '').trim();
        let name = baueDateiname({ datum, von: 'pm', an: 'mbk', thema: betreff });
        let i = 2;
        while (belegteNamen.has(name)) {
          name = baueDateiname({ datum, von: 'pm', an: 'mbk', thema: `${betreff}-${i++}` });
        }
        belegteNamen.add(name);
        files.push({
          path: `${AUSTAUSCH_ORDNER}/${name}`,
          bytes: enc.encode(baueNachricht({
            von: 'pm',
            an: 'mbk',
            betreff,
            erzeugtAm: `${jetzt.toISOString().slice(0, 19)}Z`,
            antwortetAuf: n.datei,
            brauchtMalte: false,
            text: `${String(antwort.antwort).trim()}\n\n— Pool-Manager`,
          })),
        });
        files.push({ path: `${AUSTAUSCH_ORDNER}/${n.datei}`, bytes: enc.encode(setzeStatus(original, 'beantwortet')) });
        eintrag.antwort_datei = name;
      } else if (entscheidung === 'erledigt') {
        files.push({ path: `${AUSTAUSCH_ORDNER}/${n.datei}`, bytes: enc.encode(setzeStatus(original, 'erledigt')) });
      } else {
        eintrag.entscheidung = 'sichtung';
        files.push({
          path: `${AUSTAUSCH_ORDNER}/${n.datei}`,
          bytes: enc.encode(setzeKopfFeld(setzeStatus(original, 'sichtung'), 'sichtung_grund', begruendung)),
        });
      }

      ergebnisse.push(eintrag);
    }

    const push = await pushFiles({
      token,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: REPO_BRANCH,
      files,
      message: `Austausch: ${offen.length} Nachricht(en) durchgearbeitet`,
    });

    return Response.json({
      ok: true,
      gelesen: offen.length,
      beantwortet: ergebnisse.filter((e) => e.entscheidung === 'antworten').length,
      erledigt: ergebnisse.filter((e) => e.entscheidung === 'erledigt').length,
      sichtung: ergebnisse.filter((e) => e.entscheidung === 'sichtung').length,
      ergebnisse,
      commit_url: push.commit_url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}