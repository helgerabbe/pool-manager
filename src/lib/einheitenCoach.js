/**
 * einheitenCoach.js
 *
 * KI-Logik des „Einheiten-Coach": ein didaktischer Sparringspartner, der VOR
 * dem Erstellungs-Wizard mit der Lehrkraft im Gespräch eine Einheitenstruktur
 * entwickelt. Der Coach antwortet konversationell UND liefert bei jedem Zug
 * den kompletten aktuellen Stand der Struktur mit (Sekretär-Prinzip).
 *
 * Das Ergebnis wird als Briefing-Text an Schritt 1 des Wizards übergeben
 * (Feld „Was soll gelernt werden?"), das dort die Struktur-KI speist.
 */

import { base44 } from '@/api/base44Client';

export const LEERE_STRUKTUR = {
  titel: '',
  fach: '',
  jahrgangsstufe: '',
  leitidee: '',
  themenfelder: [],
  offene_punkte: [],
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    antwort: {
      type: 'string',
      description: 'Deine konversationelle Antwort an die Lehrkraft (Markdown erlaubt, kurz halten).',
    },
    struktur: {
      type: 'object',
      description: 'Der KOMPLETTE aktualisierte Stand der Einheitenübersicht (kein Diff).',
      properties: {
        titel: { type: 'string', description: 'Arbeitstitel der Einheit.' },
        fach: { type: 'string', description: 'Unterrichtsfach, falls erkennbar (z. B. Mathematik).' },
        jahrgangsstufe: { type: 'string', description: 'Jahrgangsstufe als Zahl-String (z. B. "8"), falls erkennbar.' },
        leitidee: { type: 'string', description: 'Roter Faden / didaktische Leitidee der Einheit in 1–2 Sätzen.' },
        themenfelder: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              titel: { type: 'string' },
              anmerkungen: {
                type: 'array',
                items: { type: 'string' },
                description: 'Kurze didaktische Notizen der Lehrkraft zu diesem Themenfeld (z. B. "experimentell erarbeiten", "Studyflix-Video: ...").',
              },
              lernpakete: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    titel: { type: 'string' },
                    anmerkung: { type: 'string', description: 'Optionale kurze Notiz zu diesem Lernpaket.' },
                  },
                },
              },
            },
          },
        },
        offene_punkte: {
          type: 'array',
          items: { type: 'string' },
          description: 'Noch ungeklärte Fragen / Entscheidungen.',
        },
      },
    },
  },
  required: ['antwort', 'struktur'],
};

const SYSTEM_PROMPT = `Du bist der „Einheiten-Coach" — ein erfahrener, didaktisch versierter Sparringspartner für Lehrkräfte, die eine neue Unterrichtseinheit planen.

DEINE HALTUNG:
- Partnerschaftlich, lenkend, nachfragend, bestätigend. Du nimmst der Lehrkraft den Druck, alles auf einmal wissen zu müssen.
- Du arbeitest top-down: erst grobe Struktur vorschlagen, dann gemeinsam verfeinern.
- Du bist zugleich der „Sekretär": ALLES, was die Lehrkraft an Ideen, Wünschen und Randbemerkungen äußert (z. B. „Pi soll experimentell entdeckt werden"), sortierst du als kurze Anmerkung an die passende Stelle der Struktur ein.

REGELN:
1. Antworte auf Deutsch, per Du, kurz und konkret (maximal ~120 Wörter). Stelle höchstens EINE Rückfrage pro Antwort.
2. Gib IMMER den kompletten, aktualisierten Stand der Struktur im Feld "struktur" zurück — auch wenn sich nichts geändert hat.
3. Lösche NIE etwas aus der Struktur, das die Lehrkraft nicht ausdrücklich verwerfen möchte.
4. Wenn die Lehrkraft noch keine genaue Vorstellung hat: Mach proaktiv einen fachlich fundierten Grobvorschlag (Themenfelder in sinnvoller Reihenfolge, je 2–4 Lernpakete) und frage, was angepasst werden soll.
5. Struktur-Konventionen: Themenfelder = inhaltliche Kapitel der Einheit. Lernpakete = konkrete Lerneinheiten von je ca. 45–90 Minuten innerhalb eines Themenfelds.
6. Wenn ein Bild eines Buch-Inhaltsverzeichnisses mitgegeben wurde, ist dieses Lehrwerk die Arbeitsgrundlage: Gleiche deine Vorschläge damit ab und weise auf Kapitel hin, die noch fehlen.
7. Pflege "offene_punkte" als kurze Liste noch ungeklärter Fragen und räume sie auf, sobald sie geklärt sind.`;

const ACTION_PROMPTS = {
  kritik:
    'AKTION „Kritische Prüfung": Prüfe die aktuelle Einheitenstruktur kritisch — fachliche Vollständigkeit, Reihenfolge/Progression, Umfang, typische Schülerhürden, fehlende Voraussetzungen. Nenne 2–4 konkrete Verbesserungsvorschläge. Unstrittige Kleinigkeiten darfst du direkt in die Struktur einarbeiten; größere Änderungen nur vorschlagen und nachfragen.',
  inspiration:
    'AKTION „Inspiration": Mache 2–3 kreative, motivierende Ideen passend zur aktuellen Struktur (Experimente, Alltagsbezüge, kleine Projekte, überraschende Einstiege). Beschreibe jede Idee in 1–2 Sätzen und frage, welche übernommen werden sollen. Ändere die Struktur noch NICHT.',
  studyflix:
    'AKTION „Studyflix-Recherche": Recherchiere im Internet auf studyflix.de, welche Lernvideos es zum Thema dieser Einheit gibt und wie Studyflix das Thema gliedert. Fasse die relevanten Videos/Kapitel kurz zusammen, vergleiche die Studyflix-Gliederung mit unserer Struktur und notiere an passenden Themenfeldern/Lernpaketen eine Anmerkung im Format „Studyflix-Video: <Titel>".',
};

/**
 * Ein Gesprächszug mit dem Coach.
 *
 * @param {Array}  verlauf   Bisherige Nachrichten [{role:'user'|'coach', text}]
 * @param {object} struktur  Aktueller Stand der Einheitenübersicht
 * @param {string} userText  Neue Nachricht der Lehrkraft (bei action='chat')
 * @param {string} action    'chat' | 'kritik' | 'inspiration' | 'studyflix'
 * @param {Array}  fileUrls  Hochgeladene Kontext-Bilder (z. B. Inhaltsverzeichnis)
 * @returns {Promise<{antwort:string, struktur:object}>}
 */
export async function askCoach({ verlauf = [], struktur, userText = '', action = 'chat', fileUrls = [] }) {
  const transcript = verlauf
    .slice(-16)
    .map((m) => `${m.role === 'user' ? 'LEHRKRAFT' : 'COACH'}: ${m.text}`)
    .join('\n');

  const auftrag = action === 'chat' ? userText : ACTION_PROMPTS[action] || userText;

  const prompt = `${SYSTEM_PROMPT}

=== AKTUELLER STAND DER EINHEITENÜBERSICHT (JSON) ===
${JSON.stringify(struktur || LEERE_STRUKTUR, null, 2)}

=== BISHERIGES GESPRÄCH ===
${transcript || '(Gesprächsbeginn)'}

=== NEUE EINGABE ===
${auftrag}`;

  const params = {
    prompt,
    response_json_schema: RESPONSE_SCHEMA,
  };
  if (fileUrls.length > 0) params.file_urls = fileUrls;
  if (action === 'studyflix') {
    params.add_context_from_internet = true;
    params.model = 'gemini_3_flash';
  }

  const res = await base44.integrations.Core.InvokeLLM(params);
  return {
    antwort: res?.antwort || 'Ich habe dich verstanden.',
    struktur: res?.struktur || struktur || LEERE_STRUKTUR,
  };
}

/**
 * Baut aus der Struktur den Briefing-Text, der an den Wizard übergeben wird
 * (Schritt 1, Feld „Was soll gelernt werden?" → speist die Struktur-KI).
 */
export function buildWizardBriefing(struktur) {
  const s = struktur || LEERE_STRUKTUR;
  const zeilen = [];
  if (s.leitidee) zeilen.push(`Leitidee: ${s.leitidee}`, '');
  zeilen.push('Geplante Struktur (bitte genau diese Themenfelder und Lernpakete in dieser Reihenfolge übernehmen):');
  (s.themenfelder || []).forEach((tf, i) => {
    zeilen.push(`${i + 1}. Themenfeld: ${tf.titel}`);
    (tf.anmerkungen || []).forEach((a) => zeilen.push(`   Hinweis: ${a}`));
    (tf.lernpakete || []).forEach((lp) => {
      zeilen.push(`   - Lernpaket: ${lp.titel}${lp.anmerkung ? ` (${lp.anmerkung})` : ''}`);
    });
  });
  if ((s.offene_punkte || []).length > 0) {
    zeilen.push('', 'Noch offene Punkte:');
    s.offene_punkte.forEach((p) => zeilen.push(`- ${p}`));
  }
  zeilen.push('', '(Diese Struktur wurde gemeinsam mit dem Einheiten-Coach entwickelt.)');
  return zeilen.join('\n');
}