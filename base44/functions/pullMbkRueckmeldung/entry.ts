/**
 * pullMbkRueckmeldung
 *
 * Holt die Rückmeldung des Baus (MBK) zu einer Einheit aus dem Repository und
 * überträgt sie in den Pool-Manager:
 *   · inhaltliche Funde  → Pruefbefund (quelle='mbk', eigener Reiter in Tab 8)
 *   · externe Punkte     → MbkAdminTodo (Karte für die Administration)
 *
 * Ablageort und Format: src/docs/mbk-rueckmeldung-format.md
 *
 * Wiedererkennung über die stabile `id` der MBK-Datei: bekannte Funde werden
 * aktualisiert, nicht verdoppelt. Eine Entscheidung der Lehrkraft ('behoben',
 * 'bewusst') bleibt beim erneuten Abholen erhalten — sonst wäre abgearbeitete
 * Arbeit nach dem nächsten Lauf wieder offen.
 *
 * Zwei Betriebsarten:
 *   { einheit_id }   → eine Einheit, angemeldete Person (Knopf in Tab 8)
 *   { alle: true }   → alle bereits exportierten Einheiten. Aufrufer muss sich
 *                      als Automation ausweisen (Authorization: Bearer
 *                      <AUTOMATION_SECRET>, wie lockReaper) oder Admin sein.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { hasPruefungBearbeitenAccess } from '../../shared/pruefungAccess.js';
import { listDirectory, readTextFile } from '../../shared/githubRead.js';
import {
  getKursSlug,
  getRueckmeldungOrdner,
  waehleJuengsteDatei,
  parseRueckmeldung,
  buildMbkFingerprint,
  ordneBefundZu,
} from '../../shared/mbkRueckmeldung.js';

async function verarbeiteEinheit(base44, token, einheit, jetzt) {
  const slug = getKursSlug(einheit);
  const ordner = getRueckmeldungOrdner(slug);

  const dateien = await listDirectory(token, ordner);
  const datei = waehleJuengsteDatei(dateien);
  if (!datei) {
    return {
      einheit_id: einheit.id,
      slug,
      gefunden: false,
      hinweis: `Im Repository liegt noch keine Rückmeldung unter ${ordner}/.`,
    };
  }

  const roh = await readTextFile(token, datei.path);
  if (!roh) {
    return { einheit_id: einheit.id, slug, gefunden: false, hinweis: `${datei.path} ist leer.` };
  }

  const { meta, befunde, externe, warnungen, uebersprungen } = parseRueckmeldung(roh, datei.path);

  // Zuordnung im Pool-Manager: nur so kann die Taskliste später verlinken.
  // Die MBK nennt eine ID, ohne zu sagen, was sie bezeichnet — deshalb werden
  // Lernpakete, Aufgaben, Aktivitäten und Themenfelder zum Abgleich geladen.
  const [lernpakete, aufgaben, themenfelder, vorhandene, vorhandeneTodos] = await Promise.all([
    base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheit.id }),
    base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: einheit.id }),
    base44.asServiceRole.entities.Themenfeld.filter({ einheit_id: einheit.id }),
    base44.asServiceRole.entities.Pruefbefund.filter({ einheit_id: einheit.id, quelle: 'mbk' }),
    base44.asServiceRole.entities.MbkAdminTodo.filter({ einheit_id: einheit.id }),
  ]);

  const paketIds = (lernpakete || []).map((p) => p.id);
  const aktivitaeten = paketIds.length > 0
    ? await base44.asServiceRole.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: { $in: paketIds },
      })
    : [];

  const bekannt = new Map((vorhandene || []).map((b) => [b.fingerprint, b]));
  const neueBefunde = [];
  const befundUpdates = [];

  for (const rohBefund of befunde) {
    const zugeordnet = ordneBefundZu(rohBefund, {
      lernpakete: lernpakete || [],
      aufgaben: aufgaben || [],
      aktivitaeten: aktivitaeten || [],
      themenfelder: themenfelder || [],
    });
    const fingerprint = buildMbkFingerprint(zugeordnet.mbk_id);
    const daten = {
      einheit_id: einheit.id,
      fingerprint,
      ziel_typ: zugeordnet.ziel_typ,
      ziel_id: zugeordnet.ziel_id,
      ziel_titel: zugeordnet.ziel_titel,
      lernpaket_id: zugeordnet.lernpaket_id,
      lernpaket_titel: zugeordnet.lernpaket_titel,
      themenfeld_id: zugeordnet.themenfeld_id || '',
      themenfeld_titel: zugeordnet.themenfeld_titel || '',
      kategorie: zugeordnet.kategorie,
      schwere: zugeordnet.schwere,
      befund: zugeordnet.befund,
      vorschlag: zugeordnet.vorschlag,
      quelle: 'mbk',
      mbk_meldung_id: zugeordnet.mbk_id,
      mbk_quelldatei: datei.path,
      mbk_gemeldet_am: zugeordnet.gemeldet_am || jetzt,
      zuletzt_gefunden_am: jetzt,
    };

    const alt = bekannt.get(fingerprint);
    if (!alt) {
      neueBefunde.push({ ...daten, entscheidung: 'offen', dublette_status: 'offen' });
      continue;
    }
    // Entscheidung und Dubletten-Markierung bleiben erhalten: die MBK meldet
    // beim nächsten Lauf oft denselben Punkt, obwohl er hier längst geklärt ist.
    befundUpdates.push({ ...daten, id: alt.id });
  }

  const bekannteTodos = new Map((vorhandeneTodos || []).map((t) => [t.mbk_id, t]));
  const neueTodos = [];
  const todoUpdates = [];
  for (const punkt of externe) {
    const daten = {
      einheit_id: einheit.id,
      einheit_titel: einheit.titel_der_einheit || '',
      kurs_slug: slug,
      mbk_id: punkt.mbk_id,
      titel: punkt.titel,
      beschreibung: punkt.beschreibung,
      art: punkt.art,
      anzahl: punkt.anzahl,
      quelldatei: datei.path,
      gemeldet_am: punkt.gemeldet_am || jetzt,
      abgeholt_am: jetzt,
    };
    const alt = bekannteTodos.get(punkt.mbk_id);
    if (!alt) {
      neueTodos.push({ ...daten, status: 'offen' });
    } else {
      todoUpdates.push({ ...daten, id: alt.id });
    }
  }

  if (neueBefunde.length > 0) {
    await base44.asServiceRole.entities.Pruefbefund.bulkCreate(neueBefunde);
  }
  if (befundUpdates.length > 0) {
    await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(befundUpdates);
  }
  if (neueTodos.length > 0) {
    await base44.asServiceRole.entities.MbkAdminTodo.bulkCreate(neueTodos);
  }
  if (todoUpdates.length > 0) {
    await base44.asServiceRole.entities.MbkAdminTodo.bulkUpdate(todoUpdates);
  }

  return {
    einheit_id: einheit.id,
    einheit_titel: einheit.titel_der_einheit || '',
    slug,
    gefunden: true,
    quelldatei: datei.path,
    gemeldet_am: meta.erzeugt_am,
    // Vom Bau selbst als geklärt markierte Punkte (bewusst exportiert/erledigt).
    uebersprungen,
    befunde_neu: neueBefunde.length,
    befunde_aktualisiert: befundUpdates.length,
    admin_punkte_neu: neueTodos.length,
    admin_punkte_aktualisiert: todoUpdates.length,
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

    // ── Automation: alle bereits exportierten Einheiten ──────────────────
    if (body?.alle === true) {
      const erwartet = secrets.get('AUTOMATION_SECRET');
      const kopf = req.headers.get('authorization') || '';
      const mitgegeben = kopf.startsWith('Bearer ') ? kopf.slice(7) : '';
      let alsAutomation = !!erwartet && mitgegeben === erwartet;

      // Fallback für den manuellen Aufruf durch Administratoren.
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
      const mitRueckmeldung = ergebnisse.filter((e) => e.gefunden);
      return Response.json({
        ok: true,
        modus: 'alle',
        geprueft: kandidaten.length,
        mit_rueckmeldung: mitRueckmeldung.length,
        befunde_neu: mitRueckmeldung.reduce((s, e) => s + (e.befunde_neu || 0), 0),
        admin_punkte_neu: mitRueckmeldung.reduce((s, e) => s + (e.admin_punkte_neu || 0), 0),
        ergebnisse,
      });
    }

    // ── Knopf in Tab 8: eine Einheit ─────────────────────────────────────
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