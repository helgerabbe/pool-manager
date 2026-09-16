/**
 * pushBausteinKatalog
 *
 * Veröffentlicht das Baustein-Vokabular des Pool-Managers im Repository:
 * `bausteine/katalog.json` (maschinenlesbar) und `bausteine/README.md`
 * (menschenlesbar) — Schritt-Typen einer Aufgabensequenz plus der komplette
 * Aktivitätenkatalog mit den Feldnamen je Aktivität.
 *
 * Warum: Der Kursbau erfuhr von einem neuen Baustein bisher erst daran, dass
 * ein Kurs halb leer war (Meldung 2026-09-14). Mit dieser Liste kann er beim
 * Bauen prüfen, ob er jeden Typ und jeden Aktivitätsnamen kennt.
 *
 * Payload: {} — der Aufruf schreibt immer den aktuellen Stand (Delta-Push,
 * unveränderte Dateien werden übersprungen).
 *
 * ZWEI AUFRUFWEGE: Von Hand aus dem Import-Center (angemeldete Person mit
 * Import-Center-Zugang) ODER automatisch aus dem Workflow „Baustein-Katalog
 * veröffentlichen", sobald der Aktivitätenkatalog sich ändert. Der Workflow hat
 * keine angemeldete Person und weist sich über den Kopf
 * `Authorization: Bearer <AUTOMATION_SECRET>` aus — genau wie lockReaper und
 * pullMbkRueckmeldung. Ohne diesen zweiten Weg wäre die Liste im Repository nur
 * so aktuell, wie jemand daran denkt — und genau das war der Grund der
 * MBK-Meldung vom 2026-09-10.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { pushFiles } from '../../shared/githubPush.js';
import { REPO_OWNER, REPO_NAME, REPO_BRANCH } from '../../shared/githubRead.js';
import {
  KATALOG_ORDNER,
  baueKatalogDatei,
  baueKatalogMarkdown,
} from '../../shared/bausteinKatalog.js';
import {
  AUFTRAEGE_ORDNER,
  baueSchemataDatei,
  baueSchemataMarkdown,
} from '../../shared/auftragsSchemataKatalog.js';
import { hatImportCenterZugang, ZUGANG_FEHLER } from '../../shared/importAuftragAccess.js';
import { istAutomationAufruf } from '../../shared/automationAuth.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Automation (Workflow) weist sich über den Bearer-Kopf aus; alle anderen
    // brauchen einen angemeldeten Zugang zum Import-Center.
    if (!istAutomationAufruf(req)) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
      if (!(await hatImportCenterZugang(base44, user))) {
        return Response.json({ error: ZUGANG_FEHLER }, { status: 403 });
      }
    }

    const token = secrets.get('GITHUB_POOLSIDE_TOKEN');
    if (!token) {
      return Response.json({ error: 'Der GitHub-Zugang ist nicht hinterlegt.' }, { status: 500 });
    }

    const aktivitaeten = await base44.asServiceRole.entities.AktivitaetenKatalog.list('name', 500);
    const datei = baueKatalogDatei(aktivitaeten);
    // Auftragsschemata des Import-Centers reisen im selben Push mit — so kann
    // der Kursbau den Vertrag lesen, ohne sich am Pool-Manager anzumelden.
    const schemata = baueSchemataDatei(aktivitaeten, datei.erzeugt_am);
    const enc = new TextEncoder();

    const ergebnis = await pushFiles({
      token,
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: REPO_BRANCH,
      files: [
        { path: `${KATALOG_ORDNER}/katalog.json`, bytes: enc.encode(JSON.stringify(datei, null, 2) + '\n') },
        { path: `${KATALOG_ORDNER}/README.md`, bytes: enc.encode(baueKatalogMarkdown(datei)) },
        { path: `${AUFTRAEGE_ORDNER}/schemata.json`, bytes: enc.encode(JSON.stringify(schemata, null, 2) + '\n') },
        { path: `${AUFTRAEGE_ORDNER}/README.md`, bytes: enc.encode(baueSchemataMarkdown(schemata)) },
      ],
      message: 'Bausteine und Auftragsschemata des Import-Centers veröffentlicht',
    });

    return Response.json({
      ok: true,
      aktivitaeten: datei.aktivitaeten.length,
      schritt_typen: datei.schritt_typen.length,
      auftragsarten: schemata.arten.length,
      geschrieben: ergebnis.geschrieben,
      unveraendert: ergebnis.unveraendert,
      commit_url: ergebnis.commit_url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}