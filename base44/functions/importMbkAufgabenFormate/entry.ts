import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { galerieRepoZugang } from '../../shared/galerieManifest.js';

/**
 * importMbkAufgabenFormate
 * ────────────────────────
 * Holt die Aufgabenformate aus der Galerie der MBK (GitHub-Repository, per
 * Systemeinstellungen 'github_connector' verbunden) in die EIGENE Aufgaben-
 * galerie — als VORSCHLÄGE, nicht als freigegebene Einträge.
 *
 * Warum als Vorschlag: Ein Format der MBK ist hier nicht automatisch brauchbar.
 * Es muss angesehen, gegebenenfalls von Unterrichtsinhalten befreit und benannt
 * werden — genau der Weg, den die Verwaltung für eigene Vorschläge schon geht.
 * Würden sie direkt in der Galerie landen, bekämen Lehrkräfte ungeprüfte
 * Mechaniken vorgeschlagen.
 *
 * Wiedererkennung über `mbk_id`: Ein zweiter Abruf aktualisiert bestehende
 * Einträge statt sie zu verdoppeln — und lässt Formate, die hier schon
 * freigegeben und überarbeitet wurden, unangetastet.
 *
 * Response: { geholt, neu, aktualisiert, uebersprungen, hinweise[] }
 */

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur für Administratoren.' }, { status: 403 });
    }

    const zugang = await galerieRepoZugang(base44);
    if (!zugang) {
      return Response.json(
        { error: 'Die Verbindung zur MBK-Galerie ist nicht eingerichtet (GitHub-Connector).' },
        { status: 400 },
      );
    }

    const manifestRoh = await zugang.holeDatei(zugang.cfg.file_path);
    if (!manifestRoh) {
      return Response.json({ error: 'Das Galerie-Verzeichnis der MBK ist nicht erreichbar.' }, { status: 502 });
    }
    const manifest = JSON.parse(manifestRoh);
    const eintraege = (Array.isArray(manifest.aktivitaeten) ? manifest.aktivitaeten : [])
      .filter((a) => a?.id && a?.galerie_sichtbar === true);

    const bestand = await base44.asServiceRole.entities.AufgabenFormat.filter({ herkunft: 'mbk' });
    const nachMbkId = new Map(bestand.filter((f) => f.mbk_id).map((f) => [f.mbk_id, f]));

    let neu = 0;
    let aktualisiert = 0;
    let uebersprungen = 0;
    const hinweise = [];

    for (const eintrag of eintraege) {
      const mbkId = String(eintrag.id);
      const demoPfad = String(eintrag.demo_html || '');
      if (!demoPfad || demoPfad.includes('..') || demoPfad.startsWith('http')) {
        uebersprungen++;
        hinweise.push(`„${eintrag.name || mbkId}": keine Beispieldatei im Verzeichnis hinterlegt.`);
        continue;
      }
      const html = await zugang.holeDatei(demoPfad);
      if (!html) {
        uebersprungen++;
        hinweise.push(`„${eintrag.name || mbkId}": Beispieldatei nicht abrufbar.`);
        continue;
      }

      const beschreibung = [eintrag.kurzbeschreibung, eintrag.uebergabe_beschreibung]
        .filter(Boolean).join('\n\n');
      const vorhanden = nachMbkId.get(mbkId);

      if (vorhanden) {
        // Freigegebene Formate bleiben unberührt — sie wurden hier bewusst
        // überarbeitet, ein Abruf darf diese Arbeit nicht überschreiben.
        if (vorhanden.status === 'freigegeben') {
          uebersprungen++;
          continue;
        }
        await base44.asServiceRole.entities.AufgabenFormat.update(vorhanden.id, {
          name: String(eintrag.name || mbkId),
          beschreibung,
          fragment: html,
        });
        aktualisiert++;
      } else {
        await base44.asServiceRole.entities.AufgabenFormat.create({
          name: String(eintrag.name || mbkId),
          beschreibung,
          fragment: html,
          status: 'vorschlag',
          herkunft: 'mbk',
          mbk_id: mbkId,
          erstellt_von: user.email,
        });
        neu++;
      }
    }

    return Response.json({ geholt: eintraege.length, neu, aktualisiert, uebersprungen, hinweise });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}