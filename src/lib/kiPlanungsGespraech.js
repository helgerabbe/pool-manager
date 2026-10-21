// Planungsgespräch (2026-10-21): Sokratisches Ping-Pong in „Grobplanung & Gespräch“.
// Der Assistent kennt Methodenbibliothek, didaktische Konzeption und eine einmalige Themenrecherche
// und entwickelt mit der Lehrkraft live 4–6 Kernschritte der Stunde.
import { base44 } from '@/api/base44Client';
import { kontextText, kiMitMaterial, grundstrukturText, stundentypName, katalog } from '@/lib/kiGrobplanung';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { INDUKTIVE_VARIANTEN } from '@/lib/induktiveVarianten';
import { DEDUKTIVE_VARIANTEN } from '@/lib/deduktiveVarianten';

/** Einmalige Recherche zum Thema (wird gespeichert). */
export const kiGespraechHintergrund = (k) => base44.integrations.Core.InvokeLLM({
  model: 'gemini_3_flash', add_context_from_internet: true,
  prompt: `Recherchiere kurz fachdidaktisch für die Planung EINER Unterrichtsstunde.\n${kontextText(k)}\nFasse in höchstens 10 knappen Stichpunkten zusammen: typische Zugänge zum Thema, nötiges Vorwissen, typische Schülerschwierigkeiten und Fehlvorstellungen, gute Beispiele oder Anlässe für diesen Jahrgang.`,
});

const konzeption = () => [
  'Stundenmodelle unserer didaktischen Konzeption:',
  ...STUNDEN_MODELLE.map((m) => `- ${m.name}: ${m.phasen.join(' → ')}`),
  `Varianten induktive Erarbeitung: ${INDUKTIVE_VARIANTEN.map((x) => `${x.name} (${x.kurz})`).join('; ')}`,
  `Varianten deduktive Erarbeitung: ${DEDUKTIVE_VARIANTEN.map((x) => `${x.name}${x.kurz ? ` (${x.kurz})` : ''}`).join('; ')}`,
].join('\n');

const SCHRITT = { type: 'object', properties: { name: { type: 'string' }, satz: { type: 'string' } } };
const SCHEMA = {
  type: 'object',
  properties: {
    nachricht: { type: 'string' },
    art: { type: 'string', enum: ['bestaetigen', 'frage', 'fertig'] },
    optionen: { type: 'array', items: { type: 'string' } },
    kernschritte: { type: 'array', items: SCHRITT },
  },
  required: ['nachricht', 'art'],
};

export async function kiGespraechSchritt({ vorgaben, verlauf, ...k }) {
  const methoden = await katalog();
  return kiMitMaterial(k.assistent, `Du bist ein sehr erfahrener Kollege und Fachdidaktiker. Du führst mit einer Lehrkraft ein sokratisches Planungsgespräch: Du holst die Struktur der Stunde aus ihr heraus, statt sie ihr überzustülpen. Du denkst kritisch mit (z. B. "Dafür brauchen die Schüler erst …, sonst klappt das nicht."). Einfache Lehrersprache, Du-Form, höchstens 4 kurze Sätze.
${kontextText(k)}
Grobes Stundenziel: ${vorgaben.ziel.haupt || 'noch offen'}
Stundentyp: ${vorgaben.ziel.stundentyp ? stundentypName(vorgaben.ziel.stundentyp) : 'offen'}
Lerngruppe: Tempo ${vorgaben.gruppe.fit}/5, Selbstständigkeit ${vorgaben.gruppe.stark}/5, Leistung ${vorgaben.gruppe.leistung ?? 3}/5 (3 = normal)
${grundstrukturText(vorgaben)}
${vorgaben.methode ? `Methodenwunsch: ${vorgaben.methode.name || vorgaben.methode.kurzbeschreibung}` : ''}
${vorgaben.anker.materialien.length ? '' : 'Die Lehrkraft hat noch kein Material angegeben.'}

HINTERGRUNDWISSEN
Recherche zum Thema: ${vorgaben.hintergrund || '–'}
${konzeption()}
Methodenbibliothek (nur diese Namen verwenden): ${methoden.map((m) => `${m.name}${m.kurzbeschreibung ? ` – ${m.kurzbeschreibung}` : ''}`).join(' | ')}

AKTUELLE KERNSCHRITTE: ${vorgaben.kernschritte?.length ? vorgaben.kernschritte.map((s, i) => `${i + 1}. ${s.name}: ${s.satz}`).join(' / ') : 'noch keine'}

GESPRÄCH BISHER:
${verlauf.length ? verlauf.map((m) => `${m.role === 'user' ? 'Lehrkraft' : 'Du'}: ${m.content}`).join('\n') : '(noch nichts, du beginnst)'}

ABLAUF, immer genau EIN Schritt:
1. Beginn: Spiegle in einfachen Worten, was die Lehrkraft vorhat ("Ich habe dich so verstanden: Du möchtest mit der … Klasse …"), frage "Richtig?". art "bestaetigen", keine kernschritte.
2. Nach dem ersten "Ja": Schlage den Standardweg aus unserer Konzeption vor und nenne ihn ("Mein Standardweg wäre hier eine induktive Erarbeitung, gelenkt-entdeckend."). Gib dazu "kernschritte" (4–6 Schritte, "name" 1–3 Wörter, "satz" EIN kurzer Satz, was passiert, z. B. "Die Schüler reaktivieren ihr Vorwissen, indem sie …"). Dann sprich den ERSTEN Schritt an: "Das hieße, dass wir am Anfang … Ist das in deinem Sinne?" art "bestaetigen".
3. Danach gehst du die Schritte der Reihe nach durch: kurz aufnehmen, was die Lehrkraft gesagt hat, ggf. kernschritte anpassen, dann den nächsten Schritt ansprechen. Bei "Nein": "Wo siehst du das Problem?" (art "frage", optionen leer). Bei echten Wahlfragen art "frage" mit 2–3 kurzen "optionen".
4. Will die Lehrkraft über eine bestimmte Phase sprechen: Benenne die Phase kurz und frag offen nach ihrem Anliegen ("Ah, du willst über den Einstieg sprechen. Was ist dein Anliegen, bist du unzufrieden oder hast du eine Frage?"). art "frage", optionen leer.
5. Eigene Ideen der Lehrkraft: ehrlich als Kollege mit Für und Wider beantworten, dann fragen, ob wir es so machen. art "bestaetigen".
6. Sind alle Schritte besprochen oder will die Lehrkraft weiter: Sag, dass die Stunde jetzt steht und du zeigst, worauf du achten würdest. art "fertig".
"kernschritte" NUR mitschicken, wenn sie neu entstehen oder sich ändern, dann die KOMPLETTE Liste. Immer grob bleiben: keine Minuten, keine Materialien, nicht digital/analog.`, SCHEMA, k.anker.materialien);
}