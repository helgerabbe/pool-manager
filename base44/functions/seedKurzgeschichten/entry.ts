/**
 * seedKurzgeschichten.js
 * Erstellt eine vollständige Demo-Einheit "Interpretation von Kurzgeschichten"
 * mit Themenfeldern, Lernpaketen, Lernzielen, Aktivitäten und Masteraufgaben.
 * 
 * AUFRUF: Nur von Admins über das Dashboard / Test-Button.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── Echte Katalog-IDs aus der Datenbank ────────────────────────────────────
const KATALOG = {
  TEXT_LESEN:       '69ce6fd785f9b1c69656d563', // Input
  MULTIPLE_CHOICE:  '69ce6fd84904c2162830a4e4', // Übung
  BEGRIFFE_ZUORDNEN:'69ce6fd89e8dfbec5c01d4b2', // Übung
  MINIQUIZ:         '69ce6fd9b4946d8a52ee6b38', // Übung
};

// ─── Datenstruktur ────────────────────────────────────────────────────────────
const EINHEIT = {
  fach: 'Deutsch',
  titel_der_einheit: 'Interpretation von Kurzgeschichten',
  jahrgangsstufe: '9',
  gesamtziele: [
    'Die SuS können die spezifischen Gattungsmerkmale von Kurzgeschichten identifizieren.',
    'Die SuS können Handlungsstrukturen analysieren und fundierte Interpretationen verfassen.',
  ],
  themenfelder: [
    {
      titel: 'Handlungslogik und Struktur (Der Rote Faden)',
      reihenfolge: 1,
      lernpakete: [
        {
          titel: '1.1 Die Ausgangssituation (Der Alltag)',
          dauer: 45,
          reihenfolge: 1,
          lernziele: [
            { text: 'Ich kann Merkmale der Exposition bzw. der anfänglichen Normalität in einer Geschichte benennen.', kategorie: 'Fachwissen' },
            { text: 'Ich kann in einem Textabschnitt die Elemente markieren, die den gewöhnlichen Alltag vor der eigentlichen Handlung beschreiben.', kategorie: 'Fähigkeit/Fertigkeit' },
          ],
          aktivitaeten: [
            {
              phase: 'Input',
              katalog_id: KATALOG.TEXT_LESEN,
              reihenfolge: 1,
              field_values: {
                titel: 'Was ist eine Exposition?',
                inhalt_typ: 'text',
                inhalt: 'Die Exposition (Einleitung) führt in die Grundstimmung ein. Sie stellt den Ort, die Zeit und die handelnden Figuren vor. In einer klassischen Erzählung herrscht hier oft eine Art „Normalität", bevor das eigentliche Problem auftritt. Bei Kurzgeschichten fehlt diese ausführliche Exposition oft – der Leser wird direkt in eine Situation hineingeworfen.',
                aufgabentext: 'Lies den folgenden Informationstext aufmerksam durch. Achte dabei besonders darauf, wie die „Ausgangssituation" definiert wird.',
              },
              masteraufgaben: [], // Text lesen hat supports_master: false
            },
            {
              phase: 'Übung',
              katalog_id: KATALOG.MULTIPLE_CHOICE,
              reihenfolge: 1,
              field_values: {
                instruction: 'Welche der folgenden Sätze beschreiben typische „Alltags- oder Normalitätssituationen" vor einem Konflikt?',
              },
              masteraufgaben: [
                {
                  titel: 'Merkmale des Alltags erkennen',
                  field_values: {
                    instruction: 'Welche der folgenden Sätze beschreiben typische Alltags- oder Normalitätssituationen vor einem Konflikt?',
                    mcItems: [
                      {
                        question: 'Wähle alle zutreffenden Sätze aus:',
                        options: [
                          { text: 'Jeden Morgen kochte sie zuerst Kaffee und stellte das Radio an.', isCorrect: true },
                          { text: 'Plötzlich krachte die Tür auf und ein maskierter Mann stürmte herein.', isCorrect: false },
                          { text: 'Der Bus hatte wie immer fünf Minuten Verspätung.', isCorrect: true },
                          { text: 'Sie schrie laut auf und ließ die Tasse fallen.', isCorrect: false },
                        ],
                      },
                    ],
                    displayCount: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          titel: '1.2 Die Hauptfigur (Charakterisierung Basis)',
          dauer: 60,
          reihenfolge: 2,
          lernziele: [
            { text: 'Ich kann den Unterschied zwischen direkter und indirekter Charakterisierung erklären.', kategorie: 'Fachwissen' },
            { text: 'Ich kann aus einem Textfragment Adjektive und Verhaltensweisen extrahieren und einer Charakterisierungsform zuordnen.', kategorie: 'Fähigkeit/Fertigkeit' },
          ],
          aktivitaeten: [
            {
              phase: 'Übung',
              katalog_id: KATALOG.BEGRIFFE_ZUORDNEN,
              reihenfolge: 1,
              field_values: {
                instruction: 'Ordne die Textbeispiele der richtigen Form der Charakterisierung zu.',
              },
              masteraufgaben: [
                {
                  titel: 'Direkt oder Indirekt?',
                  field_values: {
                    instruction: 'Ordne die Textbeispiele der richtigen Form der Charakterisierung zu.',
                    pairs: [
                      { left: '„Er war ein geiziger und mürrischer alter Mann."', right: 'Direkte Charakterisierung' },
                      { left: '„Er zählte die Cent-Stücke dreimal nach, bevor er Trinkgeld gab."', right: 'Indirekte Charakterisierung' },
                      { left: '„Sie beschrieb ihn als jemanden, dem Geld wichtiger war als Menschen."', right: 'Indirekte Charakterisierung' },
                    ],
                    distractors: ['Auktoriale Charakterisierung', 'Personale Charakterisierung'],
                  },
                },
              ],
            },
          ],
        },
        {
          titel: '1.3 Die Komplikation (Der Konflikt)',
          dauer: 45,
          reihenfolge: 3,
          lernziele: [
            { text: 'Ich kann den zentralen Konflikt einer Kurzgeschichte benennen und erläutern.', kategorie: 'Fachwissen' },
          ],
          aktivitaeten: [],
        },
        {
          titel: '1.4 Der Wendepunkt / Höhepunkt',
          dauer: 45,
          reihenfolge: 4,
          lernziele: [
            { text: 'Ich kann den Wendepunkt einer Kurzgeschichte identifizieren und seine Funktion erklären.', kategorie: 'Fachwissen' },
          ],
          aktivitaeten: [],
        },
        {
          titel: '1.5 Die Auflösung (Fehlen einer solchen)',
          dauer: 45,
          reihenfolge: 5,
          lernziele: [
            { text: 'Ich kann erklären, warum Kurzgeschichten oft kein eindeutiges Ende haben und welche Wirkung das erzeugt.', kategorie: 'Fachwissen' },
          ],
          aktivitaeten: [],
        },
      ],
    },
    {
      titel: 'Spezifische Gattungsmerkmale (Das Typische)',
      reihenfolge: 2,
      lernpakete: [
        {
          titel: '2.1 Der unvermittelte Einstieg (In medias res)',
          dauer: 45,
          reihenfolge: 1,
          lernziele: [
            { text: 'Ich kann den Begriff „In medias res" (direktes Einsetzen der Handlung) definieren.', kategorie: 'Fachwissen' },
            { text: 'Ich kann vorgegebene Textanfänge in „Klassisch" und „Typische Kurzgeschichte" sortieren.', kategorie: 'Fähigkeit/Fertigkeit' },
          ],
          aktivitaeten: [
            {
              phase: 'Übung',
              katalog_id: KATALOG.MINIQUIZ,
              reihenfolge: 1,
              field_values: {
                instruction: 'Beantworte die Fragen zum Textanfang kurz und knapp.',
              },
              masteraufgaben: [
                {
                  titel: 'Wissens-Check: In medias res',
                  field_values: {
                    instruction: 'Beantworte die Fragen zum unvermittelten Einstieg kurz und knapp.',
                    quizItems: [
                      { question: 'Wie lautet der lateinische Fachbegriff für einen unvermittelten Einstieg in die Handlung?', correctAnswer: 'In medias res' },
                      { question: 'Was fehlt bei diesem Einstieg im Vergleich zum klassischen Märchenanfang meistens?', correctAnswer: 'Einleitung / Exposition' },
                      { question: 'Welche Wirkung erzeugt der unvermittelte Einstieg beim Leser?', correctAnswer: 'Er wirft den Leser direkt in die Situation und erzeugt sofort Spannung.' },
                    ],
                  },
                },
              ],
            },
            {
              phase: 'Übung',
              katalog_id: KATALOG.BEGRIFFE_ZUORDNEN,
              reihenfolge: 2,
              field_values: {
                instruction: 'Sortiere diese Textanfänge: Ist es ein klassischer Einstieg oder typisch für eine Kurzgeschichte?',
              },
              masteraufgaben: [
                {
                  titel: 'Klassisch vs. Kurzgeschichte',
                  field_values: {
                    instruction: 'Sortiere diese Textanfänge: Ist es ein klassischer Einstieg oder typisch für eine Kurzgeschichte?',
                    pairs: [
                      { left: '„Es war einmal in einem fernen Königreich..."', right: 'Klassischer Einstieg' },
                      { left: '„Als er die Tür aufmachte, wusste er sofort, dass etwas nicht stimmte."', right: 'In medias res (Kurzgeschichte)' },
                      { left: '„Die Geschichte beginnt an einem sonnigen Sommertag im Jahr 1945..."', right: 'Klassischer Einstieg' },
                      { left: '„Sie lief. Einfach so. Mitten auf der Straße."', right: 'In medias res (Kurzgeschichte)' },
                    ],
                    distractors: [],
                  },
                },
              ],
            },
          ],
        },
        {
          titel: '2.2 Das offene Ende (Wirkung)',
          dauer: 45,
          reihenfolge: 2,
          lernziele: [
            { text: 'Ich kann die typischen Merkmale eines offenen Endes beschreiben und seine Wirkung auf den Leser erläutern.', kategorie: 'Fachwissen' },
          ],
          aktivitaeten: [],
        },
        {
          titel: '2.3 Ausschnitthaftigkeit (Zeit und Raum)',
          dauer: 45,
          reihenfolge: 3,
          lernziele: [
            { text: 'Ich kann erklären, was mit „Ausschnitthaftigkeit" in einer Kurzgeschichte gemeint ist.', kategorie: 'Fachwissen' },
          ],
          aktivitaeten: [],
        },
        {
          titel: '2.4 Alltägliche Charaktere (Anti-Helden)',
          dauer: 45,
          reihenfolge: 4,
          lernziele: [
            { text: 'Ich kann den Begriff „Anti-Held" erklären und Beispiele aus Kurzgeschichten nennen.', kategorie: 'Fachwissen' },
          ],
          aktivitaeten: [],
        },
      ],
    },
  ],
};

// ─── Seed-Logik ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Nur Admins dürfen den Seed ausführen
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin-Zugang erforderlich.' }, { status: 403 });
    }

    const db = base44.asServiceRole.entities;
    const log = [];

    // 1. Einheit erstellen
    const einheit = await db.Einheiten.create({
      fach: EINHEIT.fach,
      titel_der_einheit: EINHEIT.titel_der_einheit,
      jahrgangsstufe: EINHEIT.jahrgangsstufe,
      gesamtziele: EINHEIT.gesamtziele,
      wizard_status: 'aktiv',
      content_status: 'approved',
      sync_status: 'new',
    });
    log.push(`✓ Einheit erstellt: ${einheit.id}`);

    for (const tfData of EINHEIT.themenfelder) {
      // 2. Themenfeld erstellen
      const themenfeld = await db.Themenfeld.create({
        einheit_id: einheit.id,
        titel: tfData.titel,
        reihenfolge: tfData.reihenfolge,
        content_status: 'approved',
        sync_status: 'new',
      });
      log.push(`  ✓ Themenfeld: ${tfData.titel}`);

      for (const lpData of tfData.lernpakete) {
        // 3. Lernpaket erstellen
        const lernpaket = await db.Lernpakete.create({
          einheit_id: einheit.id,
          themenfeld_id: themenfeld.id,
          titel_des_pakets: lpData.titel,
          geschaetzte_dauer_minuten: lpData.dauer,
          reihenfolge_nummer: lpData.reihenfolge,
          content_status: 'approved',
          sync_status: 'new',
        });
        log.push(`    ✓ Lernpaket: ${lpData.titel}`);

        // 4. Lernziele erstellen
        for (const lzData of lpData.lernziele) {
          await db.Lernziele.create({
            lernpaket_id: lernpaket.id,
            formulierung_fachsprache: lzData.text,
            kategorie: lzData.kategorie,
            sync_status: 'new',
          });
        }
        if (lpData.lernziele.length > 0) {
          log.push(`      ✓ ${lpData.lernziele.length} Lernziele erstellt`);
        }

        // 5. Aktivitäten erstellen
        for (const aktData of lpData.aktivitaeten) {
          const aktivitaet = await db.LernpaketPhaseAktivitaet.create({
            lernpaket_id: lernpaket.id,
            phase: aktData.phase,
            aktivitaet_id: aktData.katalog_id,
            field_values: aktData.field_values,
            reihenfolge: aktData.reihenfolge,
            is_complete: true,
            content_status: 'approved',
            sync_status: 'new',
          });
          log.push(`      ✓ Aktivität (${aktData.phase}): katalog_id=${aktData.katalog_id}`);

          // 6. Masteraufgaben erstellen
          for (let i = 0; i < aktData.masteraufgaben.length; i++) {
            const maData = aktData.masteraufgaben[i];
            await db.MasterAufgabe.create({
              activity_id: aktivitaet.id,
              lernpaket_id: lernpaket.id,
              titel: maData.titel,
              field_values: maData.field_values,
              reihenfolge: i + 1,
              content_status: 'approved',
              sync_status: 'new',
            });
            log.push(`        ✓ Masteraufgabe: ${maData.titel}`);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Demo-Einheit "Interpretation von Kurzgeschichten" erfolgreich erstellt!',
      einheitId: einheit.id,
      log,
    });

  } catch (error) {
    console.error('Seed-Error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});