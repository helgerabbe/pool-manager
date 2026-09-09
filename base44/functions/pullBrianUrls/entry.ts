/**
 * pullBrianUrls
 *
 * Holt die Brian-Adressen aus dem Austauschordner und trägt sie automatisch in
 * die zugehörigen Aufgaben des Pool-Managers ein. Die MBK legt die Dialoge in
 * Brian.study selbst an — der Pool-Manager erfährt die Adresse erst hierüber.
 *
 * Ablageort und Format: src/docs/mbk-brian-urls-format.md
 *
 * Zwei Betriebsarten (wie pullMbkRueckmeldung):
 *   { einheit_id }   → eine Einheit, angemeldete Person
 *   { alle: true }   → alle exportierten Einheiten (Automation/Admin)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { hasPruefungBearbeitenAccess } from '../../shared/pruefungAccess.js';
import { listDirectory, readTextFile } from '../../shared/githubRead.js';
import { getKursSlug, waehleJuengsteDatei } from '../../shared/mbkRueckmeldung.js';
import {
  getBrianUrlOrdner,
  parseBrianUrls,
  findeAufgabe,
  baueAufgabenUpdate,
} from '../../shared/brianUrlRueckmeldung.js';

async function verarbeiteEinheit(base44, token, einheit, jetzt) {
  const slug = getKursSlug(einheit);
  const ordner = getBrianUrlOrdner(slug);

  const dateien = await listDirectory(token, ordner);
  const datei = waehleJuengsteDatei(dateien);
  if (!datei) {
    return {
      einheit_id: einheit.id,
      slug,
      gefunden: false,
      hinweis: `Im Repository liegen noch keine Brian-Adressen unter ${ordner}/.`,
    };
  }

  const roh = await readTextFile(token, datei.path);
  if (!roh) {
    return { einheit_id: einheit.id, slug, gefunden: false, hinweis: `${datei.path} ist leer.` };
  }

  const { eintraege, warnungen } = parseBrianUrls(roh, datei.path);
  const aufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
    einheit_id: einheit.id,
  });

  const updates = [];
  const uebernommen = [];
  let ohneZuordnung = 0;
  let unveraendert = 0;

  for (const eintrag of eintraege) {
    const aufgabe = findeAufgabe(eintrag, aufgaben || []);
    if (!aufgabe) {
      ohneZuordnung += 1;
      continue;
    }
    const update = baueAufgabenUpdate(eintrag, aufgabe, jetzt);
    if (!update) {
      unveraendert += 1;
      continue;
    }
    // Mehrere Schritte derselben Aufgabe: aufeinander aufbauend zusammenführen,
    // sonst würde die zweite Adresse die erste überschreiben.
    const schon = updates.findIndex((u) => u.id === update.id);
    if (schon >= 0) {
      updates[schon] = { ...updates[schon], ...update };
    } else {
      updates.push(update);
    }
    uebernommen.push({
      aufgabe_id: aufgabe.id,
      titel: aufgabe.titel || eintrag.titel || '',
      schritt_id: eintrag.schritt_id || '',
      url: eintrag.url,
    });
  }

  if (updates.length > 0) {
    await base44.asServiceRole.entities.AllgemeineAufgabe.bulkUpdate(updates);
  }

  return {
    einheit_id: einheit.id,
    einheit_titel: einheit.titel_der_einheit || '',
    slug,
    gefunden: true,
    quelldatei: datei.path,
    gelesen: eintraege.length,
    uebernommen: uebernommen.length,
    unveraendert,
    ohne_zuordnung: ohneZuordnung,
    adressen: uebernommen,
    warnungen,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const jetzt = new Date().toISOString();

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    if (body?.alle === true) {
      const erwartet = secrets.get('AUTOMATION_SECRET');
      const kopf = req.headers.get('authorization') || '';
      const mitgegeben = kopf.startsWith('Bearer ') ? kopf.slice(7) : '';
      let alsAutomation = !!erwartet && mitgegeben === erwartet;
      if (!alsAutomation) {
        const admin = await base44.auth.me().catch(() => null);
        alsAutomation = admin?.role === 'admin';
      }
      if (!alsAutomation) {
        return Response.json({ error: 'Nicht berechtigt.' }, { status: 403 });
      }

      const alleEinheiten = await base44.asServiceRole.entities.Einheiten.list('-last_exported_at', 500);
      const kandidaten = (alleEinheiten || []).filter((e) => !!e.last_exported_at);
      const ergebnisse = [];
      for (const einheit of kandidaten) {
        try {
          ergebnisse.push(await verarbeiteEinheit(base44, token, einheit, jetzt));
        } catch (err) {
          ergebnisse.push({ einheit_id: einheit.id, gefunden: false, fehler: err.message });
        }
      }
      return Response.json({
        ok: true,
        modus: 'alle',
        geprueft: kandidaten.length,
        uebernommen: ergebnisse.reduce((s, e) => s + (e.uebernommen || 0), 0),
        ergebnisse,
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const einheitId = body?.einheit_id;
    if (!einheitId) return Response.json({ error: 'einheit_id fehlt' }, { status: 400 });

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!(await hasPruefungBearbeitenAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung in dieser Einheit' }, { status: 403 });
    }

    const ergebnis = await verarbeiteEinheit(base44, token, einheit, jetzt);
    return Response.json({ ok: true, modus: 'einzeln', ...ergebnis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}