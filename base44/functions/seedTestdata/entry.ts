import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Seed-Funktion für Testdaten der "Poolzeiten"-App.
 * Nur für Administratoren ausführbar.
 * POST /api/functions/seedTestdata
 * Body: {} (leer oder mit { force: true } um bestehende Daten zu überschreiben)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
    }

    // Admin-Check
    const benutzerProfil = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const profil = benutzerProfil[0];
    if (!profil || profil.rolle !== 'Administrator') {
      return Response.json({ error: 'Nur Administratoren dürfen Testdaten einspielen.' }, { status: 403 });
    }

    const log = [];

    // ─── 1. BENUTZER ────────────────────────────────────────────────────────────
    const benutzerData = [
      {
        user_id: 'admin@schule-beispiel.de',
        rolle: 'Administrator',
        fachbereich_zustaendigkeit: [],
        ist_aktiv: true,
      },
      {
        user_id: 'fachschaft.deutsch@schule-beispiel.de',
        rolle: 'Fachschaftsleitung',
        fachbereich_zustaendigkeit: ['Deutsch'],
        ist_aktiv: true,
      },
      {
        user_id: 'lehrkraft.mueller@schule-beispiel.de',
        rolle: 'Fachlehrkraft',
        fachbereich_zustaendigkeit: ['Deutsch'],
        ist_aktiv: true,
      },
      {
        user_id: 'lehrkraft.schmidt@schule-beispiel.de',
        rolle: 'Fachlehrkraft',
        fachbereich_zustaendigkeit: ['Deutsch'],
        ist_aktiv: true,
      },
      {
        user_id: 'moodle.designer@schule-beispiel.de',
        rolle: 'Moodle-Designer',
        fachbereich_zustaendigkeit: [],
        ist_aktiv: true,
      },
    ];

    const benutzerIds = [];
    for (const b of benutzerData) {
      const existing = await base44.asServiceRole.entities.Benutzer.filter({ user_id: b.user_id });
      if (existing.length === 0) {
        const created = await base44.asServiceRole.entities.Benutzer.create(b);
        benutzerIds.push(created.id);
        log.push(`✅ Benutzer erstellt: ${b.user_id} (${b.rolle})`);
      } else {
        log.push(`⏭️  Benutzer bereits vorhanden: ${b.user_id}`);
        benutzerIds.push(existing[0].id);
      }
    }

    // ─── 2. EINHEIT ─────────────────────────────────────────────────────────────
    let einheitId;
    const existingEinheiten = await base44.asServiceRole.entities.Einheiten.filter({
      titel_der_einheit: 'Interpretation von Kurzgeschichten',
    });

    if (existingEinheiten.length === 0) {
      const einheit = await base44.asServiceRole.entities.Einheiten.create({
        fach: 'Deutsch',
        titel_der_einheit: 'Interpretation von Kurzgeschichten',
        jahrgangsstufe: '9',
        navigationslogik: 'Sequenziell',
        freigabe_status: 'In Planung',
      });
      einheitId = einheit.id;
      log.push(`✅ Einheit erstellt: "${einheit.titel_der_einheit}" (ID: ${einheitId})`);
    } else {
      einheitId = existingEinheiten[0].id;
      log.push(`⏭️  Einheit bereits vorhanden (ID: ${einheitId})`);
    }

    // ─── 3. LERNPAKETE ──────────────────────────────────────────────────────────
    let paket1Id, paket2Id;

    const existingPakete = await base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId });

    if (existingPakete.length === 0) {
      const paket1 = await base44.asServiceRole.entities.Lernpakete.create({
        einheit_id: einheitId,
        reihenfolge_nummer: 1,
        titel_des_pakets: 'Merkmale einer Kurzgeschichte erkennen',
        geschaetzte_dauer_minuten: 45,
      });
      paket1Id = paket1.id;
      log.push(`✅ Lernpaket 1 erstellt: "${paket1.titel_des_pakets}"`);

      const paket2 = await base44.asServiceRole.entities.Lernpakete.create({
        einheit_id: einheitId,
        reihenfolge_nummer: 2,
        titel_des_pakets: 'Figurencharakterisierung und Erzählperspektive',
        geschaetzte_dauer_minuten: 60,
      });
      paket2Id = paket2.id;
      log.push(`✅ Lernpaket 2 erstellt: "${paket2.titel_des_pakets}"`);
    } else {
      paket1Id = existingPakete.find(p => p.reihenfolge_nummer === 1)?.id || existingPakete[0].id;
      paket2Id = existingPakete.find(p => p.reihenfolge_nummer === 2)?.id;
      log.push(`⏭️  Lernpakete bereits vorhanden (${existingPakete.length} Pakete)`);
    }

    // ─── 4. LERNZIELE (für Paket 1) ─────────────────────────────────────────────
    let lernzielIds = [];
    const existingLernziele = await base44.asServiceRole.entities.Lernziele.filter({ lernpaket_id: paket1Id });

    if (existingLernziele.length === 0) {
      const lernzieleData = [
        {
          lernpaket_id: paket1Id,
          formulierung_fachsprache: 'Ich kann die typischen Stilmerkmale einer Kurzgeschichte (Einstieg in medias res, offenes Ende, beschränkte Figurenzahl) benennen und im Text nachweisen.',
          anforderungsebene: 'Ebene 1 - Basis',
          schueler_uebersetzung: 'Ich erkenne, woran man eine Kurzgeschichte erkennt und kann das am Text zeigen.',
        },
        {
          lernpaket_id: paket1Id,
          formulierung_fachsprache: 'Ich kann die Erzählperspektive und ihre Wirkung auf den Leser analysieren und in Bezug zur Intention des Autors setzen.',
          anforderungsebene: 'Ebene 2 - Transfer',
          schueler_uebersetzung: 'Ich erkläre, wer erzählt und warum das wichtig für die Wirkung der Geschichte ist.',
        },
        {
          lernpaket_id: paket1Id,
          formulierung_fachsprache: 'Ich kann eine eigenständige, literarisch begründete Interpretation entwickeln und dabei Form und Inhalt aufeinander beziehen.',
          anforderungsebene: 'Ebene 3 - Projekt',
          schueler_uebersetzung: 'Ich schreibe eine eigene fundierte Interpretation und belege meine Thesen am Text.',
        },
      ];

      for (const lz of lernzieleData) {
        const created = await base44.asServiceRole.entities.Lernziele.create(lz);
        lernzielIds.push(created.id);
        log.push(`✅ Lernziel erstellt: ${lz.anforderungsebene}`);
      }
    } else {
      lernzielIds = existingLernziele.map(lz => lz.id);
      log.push(`⏭️  Lernziele bereits vorhanden (${existingLernziele.length} Ziele)`);
    }

    // ─── 5. AUFGABENBAUSTEINE ────────────────────────────────────────────────────
    const existingAufgaben = await base44.asServiceRole.entities.Aufgabenbausteine.filter({ lernpaket_id: paket1Id });

    if (existingAufgaben.length === 0 && lernzielIds.length >= 3) {
      const [lz1Id, lz2Id, lz3Id] = lernzielIds;
      const lockedByUser = 'lehrkraft.mueller@schule-beispiel.de';

      const aufgabenData = [
        {
          lernpaket_id: paket1Id,
          lernziel_id: lz1Id,
          baustein_typ: 'Pre-Test',
          aufgabentext_inhalt: 'Lies den folgenden Textausschnitt und beantworte die Fragen: Wo beginnt die Geschichte? Welche Figuren treten auf? Was fällt dir am Ende auf?\n\n[Textausschnitt: "Das Brot" von Wolfgang Borchert]',
          erwartungshorizont_ki_prompt: 'Prüfe ob der Schüler folgende Aspekte nennt: Einstieg in medias res, max. 2-3 Figuren, offenes oder ambivalentes Ende. Gib konstruktives Feedback ohne die Lösung vorwegzunehmen.',
          lock_status: false,
          locked_by_user: '',
        },
        {
          lernpaket_id: paket1Id,
          lernziel_id: lz1Id,
          baustein_typ: 'Ebene-1-Übung',
          aufgabentext_inhalt: 'Ordne die folgenden Merkmale der Kurzgeschichte zu: Arbeite mit der Checkliste und markiere alle Merkmale, die du im Text "Das Brot" findest.\n\nMerkmale: [ ] Einstieg in medias res  [ ] Wenige Figuren  [ ] Alltägliche Situation  [ ] Offenes Ende  [ ] Keine Vorgeschichte  [ ] Knappe Sprache',
          erwartungshorizont_ki_prompt: 'Alle 6 Merkmale sollten markiert sein. Erkläre bei falschen Antworten das jeweilige Merkmal anhand eines konkreten Textzitats.',
          lock_status: true,
          locked_by_user: lockedByUser,
        },
        {
          lernpaket_id: paket1Id,
          lernziel_id: lz2Id,
          baustein_typ: 'Ebene-2-Aufgabe',
          aufgabentext_inhalt: 'Analysiere die Erzählperspektive in "Das Brot":\n1. Aus welcher Perspektive wird erzählt?\n2. Was erfährt der Leser über die inneren Gedanken der Figuren?\n3. Warum könnte der Autor diese Perspektive gewählt haben?\n\nSchreibe einen zusammenhängenden Analyseabsatz (ca. 100-150 Wörter).',
          erwartungshorizont_ki_prompt: 'Erwartete Inhalte: auktoriale oder personale Erzählperspektive (korrekte Benennung), Bezug zur emotionalen Distanz/Nähe, Wirkungsabsicht (Betroffenheit, Verständnis für beide Figuren). Kriterien: Fachbegriff korrekt, mind. 1 Textzitat, schlüssige Wirkungsthese.',
          lock_status: false,
          locked_by_user: '',
        },
        {
          lernpaket_id: paket1Id,
          lernziel_id: lz3Id,
          baustein_typ: 'Ebene-3-Projekt',
          aufgabentext_inhalt: 'Schreibe eine eigenständige Interpretation der Kurzgeschichte "Das Brot":\n\n→ Formuliere eine Deutungshypothese (These)\n→ Belege sie mit mindestens 3 Textzitaten\n→ Beziehe Form (Sprache, Struktur) und Inhalt (Thema, Figuren) aufeinander\n→ Formuliere ein abschließendes Fazit zur Wirkungsabsicht des Autors\n\nUmfang: ca. 400-500 Wörter',
          erwartungshorizont_ki_prompt: 'Bewertungskriterien: (1) Deutungshypothese vorhanden und plausibel (2) Mindestens 3 korrekte Textzitate mit Quellenangabe (3) Formanalyse integriert (Sprachstil, Satzlänge, Ellipsen) (4) Inhaltliche Tiefe: Kriegsnachwirkungen, Scham, Schweigen als Themen erkannt (5) Schlüssiges Fazit. Feedback immer ermutigend und konstruktiv formulieren.',
          lock_status: false,
          locked_by_user: '',
        },
      ];

      for (const ab of aufgabenData) {
        await base44.asServiceRole.entities.Aufgabenbausteine.create(ab);
        const lockHinweis = ab.lock_status ? ` 🔒 (gesperrt durch ${ab.locked_by_user})` : '';
        log.push(`✅ Aufgabenbaustein erstellt: ${ab.baustein_typ}${lockHinweis}`);
      }
    } else if (existingAufgaben.length > 0) {
      log.push(`⏭️  Aufgabenbausteine bereits vorhanden (${existingAufgaben.length} Bausteine)`);
    } else {
      log.push(`⚠️  Aufgabenbausteine konnten nicht erstellt werden – Lernziele fehlen.`);
    }

    return Response.json({
      success: true,
      message: 'Seed-Daten erfolgreich eingespielt.',
      log,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});