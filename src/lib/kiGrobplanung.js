// Grobplanung (2026-10-17): Fundament prüfen, grobes Ziel vorschlagen, Methoden finden, Grobverlauf erstellen.
import { base44 } from '@/api/base44Client';
import { kiAufruf } from '@/lib/kiStundenVorbereitung';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { URTEIL_VARIANTEN } from '@/lib/urteilVarianten';
import { ERSCHLIESSUNG_VARIANTEN } from '@/lib/erschliessungVarianten';
import { GESTALTUNG_VARIANTEN } from '@/lib/gestaltungVarianten';
import { EINSTIEG_VARIANTEN } from '@/lib/einstiegVarianten';
import { PRAESENTATION_VARIANTEN } from '@/lib/praesentationVarianten';
import { wirksameGrundstruktur } from '@/components/grobplanung/GrundstrukturWahl';
import { modellName } from '@/components/unterrichtsplanung/StundenmodellVorschlag';

export const STUNDENTYPEN = [
  { key: '', name: 'Offen lassen' },
  { key: 'erarbeitung', name: 'Erarbeitungsstunde' },
  { key: 'uebung', name: 'Übungsstunde' },
  { key: 'vertieft', name: 'Vertiefte Übungsstunde' },
  { key: 'wiederholung', name: 'Wiederholungsstunde' },
  { key: 'erschliessung', name: 'Erschließungsstunde' },
  { key: 'gestaltung', name: 'Gestaltungsstunde' },
  { key: 'einstieg', name: 'Einstiegsstunde' },
  { key: 'praesentation', name: 'Präsentationsstunde' },
  { key: 'urteil', name: 'Urteilsstunde' },
  { key: 'diagnose', name: 'Diagnosestunde' },
  { key: 'misch', name: 'Mischstunde' },
];
export const stundentypName = (key) => STUNDENTYPEN.find((t) => t.key === key)?.name;

export const ankerVorhanden = (a) => !!a.thema?.trim() || a.abschnitte.length > 0 || !!a.text.trim() || a.materialien.length > 0;

const kontextText = ({ einheit, anker, minuten }) => [
  `Fach: ${einheit.fach}, Jahrgang ${einheit.jahrgangsstufe}, ${anker.schulform || 'Integrierte Gesamtschule'} in Niedersachsen (Leistungsniveau entsprechend ausrichten)`,
  `Unterrichtseinheit: ${einheit.titel}`,
  minuten ? `Verfügbare Zeit: ${minuten} Minuten` : 'Verfügbare Zeit: noch offen – Einzelstunde (45 Min.) oder Doppelstunde (90 Min.), je nachdem, was das Vorhaben braucht',
  ...anker.abschnitte.map((s) => `Stunde aus dem Einheitenverlauf: ${s.titel}${s.lernziel ? ` – Lernziel: ${s.lernziel}` : ''}${s.inhalte?.length ? ` – Inhalte: ${s.inhalte.join('; ')}` : ''}`),
  anker.text.trim() && `Beschreibung der Lehrkraft: ${anker.text.trim()}`,
  anker.thema?.trim() && `Thema der Stunde (gemeinsam festgehalten): ${anker.thema.trim()}`,
  anker.inhalt?.trim() && `Konkreter Inhalt (Text, Beispiel oder Streitfrage, unbedingt verwenden): ${anker.inhalt.trim()}`,
  anker.vorwissen?.trim() && `Lernausgangslage (das haben die Schüler schon gemacht): ${anker.vorwissen.trim()}`,
  anker.materialien.length > 0 && `Material der Lehrkraft: ${anker.materialien.map((m) => m.name).join(', ')} (lesbare Dateien sind angehängt)`,
  anker.richtung && `Gewählte inhaltliche Richtung: ${anker.richtung}`,
].filter(Boolean).join('\n');

const LESBAR = /\.(pdf|png|jpe?g|webp|gif)$/i;
/** Mit Plattform-KI werden lesbare Materialien als Dateien mitgegeben. */
async function kiMitMaterial(assistent, prompt, schema, materialien) {
  const lesbar = materialien.filter((m) => LESBAR.test(m.name));
  if (assistent === 'anthropic' || !lesbar.length) return kiAufruf(assistent, prompt, schema);
  const urls = await Promise.all(lesbar.map((m) => base44.integrations.Core.CreateFileSignedUrl({ file_uri: m.file_uri, expires_in: 600 }).then((r) => r.signed_url)));
  return base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, file_urls: urls });
}

/** Reicht der inhaltliche Anker für eine sinnvolle Stunde? */
export const kiAnkerPruefen = (k) => kiMitMaterial(k.assistent, `Du bist erfahrener Fachdidaktiker. Eine Lehrkraft möchte eine Unterrichtsstunde planen lassen.
${kontextText(k)}

Prüfe, ob klar genug ist, worum es inhaltlich in dieser EINEN Stunde gehen soll. Sei großzügig: Ein erkennbares Stundenthema reicht.
- "ausreichend": true/false
- "zusammenfassung": ein Satz, worum es geht (in Lehrersprache)
- Wenn nicht ausreichend: "rueckfrage" (freundlich, du-Form, ein Satz) und "optionen": 2–3 konkrete inhaltliche Richtungen, je ein kurzer Satz.`, {
  type: 'object',
  properties: { ausreichend: { type: 'boolean' }, zusammenfassung: { type: 'string' }, rueckfrage: { type: 'string' }, optionen: { type: 'array', items: { type: 'string' } } },
  required: ['ausreichend'],
}, k.anker.materialien);

/** Thema der Stunde in einem klaren Satz: „In dieser Stunde beschäftigen wir uns damit, …“ */
export const kiGrobThema = ({ bisher, korrektur, ...k }) => kiMitMaterial(k.assistent, `Du bist erfahrener Fachdidaktiker. Formuliere das THEMA dieser einen Unterrichtsstunde in EINEM klaren, verständlichen Satz in Lehrersprache – kein Stundentitel, sondern was inhaltlich passiert und was die Schüler machen.
${kontextText(k)}

- "thema": ein Satz, beginnend mit "In dieser Stunde beschäftigen wir uns damit, …". Kurz, ohne Fachjargon, keine Ziel-Formulierung.
- "inhalt_frage": Entscheide, ob für dieses Thema noch ein KONKRETER Inhalt offen ist (z. B. welcher Text gelesen, welche Streitfrage diskutiert, an welchem Beispiel gearbeitet wird). Wenn ja: EINE kurze, freundliche Frage in Wir-Form, genau auf dieses Thema zugeschnitten, mit dem Zusatz, dass es auch okay ist, wenn es noch nicht klar ist. Wenn der Inhalt schon klar ist oder bei diesem Thema keine Rolle spielt: leerer String.${korrektur ? `\n\nBisherige Formulierung: ${bisher}\nWunsch der Lehrkraft: "${korrektur}" – richte dich danach.` : ''}`, {
  type: 'object',
  properties: { thema: { type: 'string' }, inhalt_frage: { type: 'string' } },
  required: ['thema', 'inhalt_frage'],
}, k.anker.materialien);

/** Grobe Zielrichtung: „Am Ende der Stunde können/haben die Schüler …“ */
export const kiGrobZiel = ({ stundentyp, bisher, korrektur, vorgaben, ...k }) => kiMitMaterial(k.assistent, `Du bist erfahrener Fachdidaktiker. Formuliere die GROBE Zielrichtung einer Stunde – verständliche Lehrersprache, keine perfekte Operatoren-Formulierung.
${kontextText(k)}${stundentyp ? `\nStundentyp: ${stundentypName(stundentyp)}` : ''}
${vorgaben && wirksameGrundstruktur(vorgaben.grundstruktur, vorgaben.anker?.abschnitte?.find((s) => s.modell)) ? `${grundstrukturText(vorgaben)}\nRichte das Ziel genau auf diese Grundstruktur aus (z. B. Erschließung = belegte Deutung, Präsentation = Ergebnisse vorstellen und Rückmeldung, Urteil = begründetes Urteil).` : 'Die Grundstruktur ist offen: Formuliere das Ziel so, dass es zu mehreren Grundstrukturen passt.'}

- "haupt": ein KURZER, bewusst allgemein gehaltener Satz (höchstens ca. 12 Wörter), beginnend mit "Am Ende der Stunde können die Schüler …" oder "Am Ende der Stunde haben die Schüler …". Nur die Kernhandlung nennen, KEINE Details, Bedingungen, Kontexte oder Beispiele. Gut: "Am Ende der Stunde können die Schüler eine begründete Behauptung formulieren." Zu genau: "… zu einer strittigen Alltagsfrage eine klare eigene Position finden und diese als begründete Behauptung formulieren."
- "alternativen": 2–3 andere sinnvolle Akzente in derselben kurzen, allgemeinen Form.${korrektur ? `\n\nBisheriger Vorschlag: ${bisher}\nWunsch der Lehrkraft: "${korrektur}" – richte dich danach.` : ''}`, {
  type: 'object',
  properties: { haupt: { type: 'string' }, alternativen: { type: 'array', items: { type: 'string' } } },
  required: ['haupt', 'alternativen'],
}, k.anker.materialien);

const katalog = () => base44.entities.MethodenKatalog.filter({ ist_aktiv: { $ne: false }, quelle: { $ne: 'poolzeit' } }, { limit: 200, fields: ['name', 'kurzbeschreibung', 'dauer_min', 'dauer_max', 'stufe'] }).then((p) => p.items);

/** Findet zu einer frei beschriebenen Idee bis zu drei passende Methoden aus dem Katalog. */
export async function kiMethodenFinden({ assistent, beschreibung }) {
  const items = await katalog();
  const r = await kiAufruf(assistent, `Eine Lehrkraft beschreibt eine methodische Idee: "${beschreibung}"
Welche Methoden aus diesem Katalog sind gemeint? Gib bis zu 3 Namen exakt wie im Katalog zurück, die beste zuerst. Passt keine, gib eine leere Liste.
${items.map((m) => `- ${m.name}: ${m.kurzbeschreibung || ''}`).join('\n')}`, { type: 'object', properties: { namen: { type: 'array', items: { type: 'string' } } } });
  return (r.namen || []).map((n) => items.find((m) => m.name === n)).filter(Boolean);
}

const PHASE = { type: 'object', properties: { name: { type: 'string' }, minuten: { type: 'number' }, lehrer: { type: 'string' }, schueler: { type: 'string' }, sozialform: { type: 'string' }, methode: { type: 'string' }, details: { type: 'string' }, achten: { type: 'string' }, grenzen: { type: 'string' } } };
const SCHEMA = { type: 'object', properties: { kurz: { type: 'string' }, modell: { type: 'string', enum: STUNDEN_MODELLE.map((m) => m.key) }, hinweise: { type: 'array', items: { type: 'string' } }, phasen: { type: 'array', items: PHASE } } };

/** Grobverlauf aus allen Vorgaben – oder Überarbeitung eines bestehenden Entwurfs. */
export async function kiGrobverlauf({ vorgaben, bisher, aenderung, ...k }) {
  const items = await katalog();
  const { ziel, gruppe, methode, ritual } = vorgaben;
  const prompt = `Du bist ein erfahrener Fachdidaktiker und planst den GROBVERLAUF einer Unterrichtsstunde.
${kontextText(k)}
Grobes Stundenziel: ${ziel.haupt || 'noch offen – leite ein sinnvolles Ziel aus dem Thema ab'}
Stundentyp: ${stundentypName(ziel.stundentyp) && ziel.stundentyp ? stundentypName(ziel.stundentyp) : 'offen – wähle passend'}
Lerngruppe: Arbeitstempo ${gruppe.fit}/5, Selbstständigkeit ${gruppe.stark}/5, Leistungsvermögen ${gruppe.leistung ?? 3}/5 (3 = normal)
${vorgaben.punkte?.length ? `Didaktisch-methodische Vorgaben (von der Lehrkraft bestätigt, unbedingt berücksichtigen):\n${vorgaben.punkte.map((p) => `- [${GEWICHTE[p.gewicht]}] ${p.text}`).join('\n')}` : ''}
${grundstrukturText(vorgaben)}
${methode ? `Methodenwunsch (unbedingt einbauen): ${methode.name}${methode.kurzbeschreibung ? ` – ${methode.kurzbeschreibung}` : ''}` : 'Kein besonderer Methodenwunsch.'}
${ritual ? `Festes Ritual (als eigene Phase einplanen, meist am Anfang): ${ritual.name}${ritual.kurzbeschreibung ? ` – ${ritual.kurzbeschreibung}` : ''}` : ''}

Stundenmodelle: ${STUNDEN_MODELLE.map((m) => `${m.key} = ${m.name}`).join('; ')}
Urteilsstunde (modell "urteil") für offene Streitfragen ohne eine richtige Lösung, Ziel ist ein begründetes Urteil statt einer Regel. Formen: ${URTEIL_VARIANTEN.map((u) => `${u.name} (${u.phasen.join(' → ')})`).join('; ')}. Wähle "urteil", wenn die Schüler eine Position bilden, abwägen, streiten oder entscheiden sollen, und nenne die gewählte Form in "hinweise".
Erschließungsstunde (modell "erschliessung") für das Verstehen und Deuten eines Gegenstands (Text, Quelle, Bild, Musik), Ziel ist eine am Gegenstand belegte Deutung. Formen: ${ERSCHLIESSUNG_VARIANTEN.map((u) => `${u.name} (${u.phasen.join(' → ')})`).join('; ')}. Wähle "erschliessung", wenn ein Gegenstand gedeutet werden soll, und nenne die gewählte Form in "hinweise".
Gestaltungsstunde (modell "gestaltung"), wenn jeder Schüler ein eigenes Produkt erstellt (Text, Bild, Aufführung, Medienprodukt); Kriterien zu Beginn und Überarbeitung nach Rückmeldung sind Pflicht. Formen: ${GESTALTUNG_VARIANTEN.map((u) => `${u.name} (${u.phasen.join(' → ')})`).join('; ')}. Nenne die gewählte Form in "hinweise".
Einstiegsstunde (modell "einstieg"), wenn die Stunde eine neue Unterrichtseinheit eröffnet: Neugier wecken, Vorwissen und Fragen sammeln, Überblick geben, noch nichts erarbeiten. Formen: ${EINSTIEG_VARIANTEN.map((u) => `${u.name} (${u.phasen.join(' → ')})`).join('; ')}. Nenne die gewählte Form in "hinweise".
Präsentationsstunde (modell "praesentation"), wenn die Schüler zuvor erarbeitete Ergebnisse vorstellen und Rückmeldung bekommen; Feedback-Kriterien und ein bündelnder Abschluss sind Pflicht. Formen: ${PRAESENTATION_VARIANTEN.map((u) => `${u.name} (${u.phasen.join(' → ')})`).join('; ')}. Nenne die gewählte Form in "hinweise".
Methodenkatalog (nur diese Methoden verwenden, wenn eine Methode sinnvoll ist):
${items.map((m) => `- ${m.name} (${m.dauer_min ?? '?'}–${m.dauer_max ?? '?'} Min.)`).join('\n')}

Regeln:
- Wähle das passende Stundenmodell ("modell") und folge seinen Phasen sinnvoll.
- Je Phase: "lehrer" = was die Lehrkraft tut, "schueler" = was die Schüler tun (je 1–2 konkrete Sätze), "sozialform" (Plenum, Einzelarbeit, Partnerarbeit, Gruppenarbeit), "methode" falls genutzt, "details" = 1–2 Sätze, warum diese Phase/Methode hier gut passt, "achten" = 1–2 Sätze, worauf die Lehrkraft besonders achten muss, "grenzen" = 1 Satz, wann oder warum man es eher nicht so machen sollte.
- "minuten" grob schätzen; ${k.minuten ? `die Summe ergibt ${k.minuten}.` : 'die Summe ergibt 45 oder 90 – entscheide, was das Vorhaben realistisch braucht, und nenne die Wahl samt kurzer Begründung in "hinweise".'} Die Lehrkraft sieht die Zeiten erst in der Feinplanung.
- Es geht NUR um den methodischen Ablauf: noch nicht festlegen, ob digital oder analog, keine konkreten Arbeitsmaterialien, keine ausformulierten Arbeitsaufträge.
- "kurz": eine Zeile, was diese Stunde ausmacht. "hinweise" nur, wenn sich Vorgaben nicht stimmig umsetzen lassen.${bisher ? `

ÜBERARBEITUNG – bisheriger Entwurf:
${JSON.stringify(bisher.phasen.map(({ name, lehrer, schueler, sozialform, methode }) => ({ name, lehrer, schueler, sozialform, methode })))}
Änderungswunsch der Lehrkraft: "${aenderung}". Setze ihn um und lass den Rest möglichst unverändert.` : ''}`;
  const r = await kiMitMaterial(k.assistent, prompt, SCHEMA, k.anker.materialien);
  return {
    name: 'Grobentwurf', kurz: r.kurz, modell: r.modell, hinweis: (r.hinweise || []).join(' '),
    phasen: (r.phasen || []).map((p) => ({ ...p, aktivitaet: p.schueler, begruendung: p.details, deckt: [] })),
  };
}

/** Sparringspartner zur Stunde: antwortet im Gespräch und schlägt Änderungen nur vor – übernommen wird erst nach Zustimmung. */
export async function kiSparring({ entwurf, verlauf, fokus, ...k }) {
  const r = await kiMitMaterial(k.assistent, `Du bist ein erfahrener, freundlicher Fachdidaktiker und Sparringspartner einer Lehrkraft bei der methodischen Gestaltung einer Stunde. Sprich in Du- bzw. Wir-Form, kurz und konkret.
${kontextText(k)}
Aktueller Ablauf: ${JSON.stringify(entwurf.phasen.map(({ name, lehrer, schueler, sozialform, methode, minuten }) => ({ name, lehrer, schueler, sozialform, methode, minuten })))}
${fokus != null ? `Das Gespräch bezieht sich vor allem auf Phase ${fokus + 1}: "${entwurf.phasen[fokus]?.name}".` : 'Das Gespräch bezieht sich auf die ganze Stunde.'}

Gesprächsverlauf:
${verlauf.map((m) => `${m.role === 'user' ? 'Lehrkraft' : 'Assistent'}: ${m.content}`).join('\n')}

Antworte auf die letzte Nachricht der Lehrkraft in "antwort". Bei Fragen: erklären, bei Bedarf Alternativen nennen. Wenn eine konkrete Änderung am Ablauf sinnvoll ist oder gewünscht wird, beschreibe sie in "antwort" und frage am Ende "Soll ich das so ändern?". Dann zusätzlich "vorschlag": der KOMPLETTE neue Ablauf als "phasen" (Felder: name, minuten, lehrer, schueler, sozialform, methode, details, achten, grenzen; unveränderte Phasen identisch übernehmen). Sonst "vorschlag" weglassen. Noch nichts zu digital/analog oder konkreten Materialien.`, {
    type: 'object',
    properties: { antwort: { type: 'string' }, vorschlag: { type: 'object', properties: { phasen: { type: 'array', items: PHASE } } } },
    required: ['antwort'],
  }, k.anker.materialien);
  const phasen = r.vorschlag?.phasen?.length ? r.vorschlag.phasen.map((p) => ({ ...p, aktivitaet: p.schueler, begruendung: p.details, deckt: [] })) : null;
  return { antwort: r.antwort, vorschlag: phasen && { ...entwurf, phasen } };
}

/** Tipp-Center: Inspirationen, Alternativen und kleine Tipps zur ganzen Stunde. */
export async function kiTippCenter({ entwurf, ...k }) {
  const r = await kiMitMaterial(k.assistent, `Du bist ein erfahrener, inspirierender Fachdidaktiker. Schau auf diese Stunde und gib der Lehrkraft Anregungen, was man noch anders oder besser machen könnte. Du-Form, kurz.
${kontextText(k)}
Ablauf: ${JSON.stringify(entwurf.phasen.map(({ name, schueler, sozialform, methode, minuten }) => ({ name, schueler, sozialform, methode, minuten })))}

Gib 4–6 "tipps", je mit "art" und "text" (1–2 Sätze):
- "inspiration" = eine größere andere Denkrichtung für die Stunde (z. B. auf 90 Minuten ausdehnen und dann X ermöglichen; einen anderen Schwerpunkt setzen, z. B. statt ein Argument zu finden gleich mehrere Argumente sortieren)
- "alternative" = eine andere Variante für eine bestimmte Phase (Phase nennen)
- "tipp" = ein kleiner praktischer Hinweis zur Durchführung
Mindestens zwei Inspirationen. Nichts zu digital/analog oder konkreten Materialien.`, {
    type: 'object',
    properties: { tipps: { type: 'array', items: { type: 'object', properties: { art: { type: 'string', enum: ['inspiration', 'alternative', 'tipp'] }, text: { type: 'string' } } } } },
    required: ['tipps'],
  }, k.anker.materialien);
  return r.tipps || [];
}

/** Grundstruktur-Zeile für die Prompts: gewählt bzw. vorgeschlagen ist dominant, offen = KI wählt. */
const grundstrukturText = (vorgaben) => {
  const g = wirksameGrundstruktur(vorgaben.grundstruktur, vorgaben.anker?.abschnitte?.find((s) => s.modell));
  return g ? `Methodische Grundstruktur (von der Lehrkraft festgelegt, DOMINANT, Ablauf daran ausrichten): ${modellName(g.modell, g.variante)} (modell "${g.modell}"${g.variante ? `, Variante "${g.variante}"` : ''})` : 'Methodische Grundstruktur: offen – wähle die am besten passende.';
};

export const GEWICHTE = { unverzichtbar: 'Unverzichtbar', wichtig: 'Wichtig', beachten: 'Nehme ich mit' };

/** Didaktisch-methodische Vorgaben: Worauf achtet der Assistent beim Bau der Stunde? */
export async function kiPlanungsVorgaben({ vorgaben, ...k }) {
  const { ziel, gruppe, methode, ritual } = vorgaben;
  const r = await kiMitMaterial(k.assistent, `Du bist erfahrener Fachdidaktiker. Bevor du eine Stunde baust, fasst du in Wir-Form zusammen, worauf du bei der Gestaltung besonders achten wirst.
${kontextText(k)}
Grobes Stundenziel: ${ziel.haupt || 'noch offen'}
Stundentyp: ${ziel.stundentyp ? stundentypName(ziel.stundentyp) : 'offen'}
Lerngruppe: Tempo ${gruppe.fit}/5, Selbstständigkeit ${gruppe.stark}/5, Leistung ${gruppe.leistung ?? 3}/5 (3 = normal)
${grundstrukturText(vorgaben)}
${methode ? `Methodenwunsch: ${methode.name || methode.kurzbeschreibung}` : ''}
${ritual ? `Ritual: ${ritual.name}` : ''}

Gib 4–7 "punkte", je ein kurzer, verständlicher Satz (keine Methodennamen erfinden, nichts zu digital/analog oder Materialien) mit "gewicht":
- "unverzichtbar" = ohne das verfehlt die Stunde ihr Ziel (z. B. der Kern des Stundentyps)
- "wichtig" = ausdrücklicher Wunsch der Lehrkraft oder zentral für die Lerngruppe
- "beachten" = nehme ich in die Überlegungen mit`, {
    type: 'object',
    properties: { punkte: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, gewicht: { type: 'string', enum: Object.keys(GEWICHTE) } } } } },
    required: ['punkte'],
  }, k.anker.materialien);
  return r.punkte || [];
}

/** Überarbeitet nur EINE Phase des Ablaufs, der Rest bleibt unverändert. */
export async function kiPhaseAendern({ entwurf, index, wunsch, ...k }) {
  const p = await kiMitMaterial(k.assistent, `Du bist erfahrener Fachdidaktiker. Überarbeite NUR die Phase ${index + 1} dieses Stundenablaufs.
${kontextText(k)}
Ganzer Ablauf: ${JSON.stringify(entwurf.phasen.map(({ name, schueler, sozialform, methode, minuten }) => ({ name, schueler, sozialform, methode, minuten })))}
Wunsch der Lehrkraft für Phase ${index + 1}: "${wunsch}"
Nur methodischer Ablauf, noch nicht digital/analog, keine konkreten Materialien. Die Dauer ("minuten") möglichst ähnlich halten. Felder: name, minuten, lehrer, schueler, sozialform, methode, details (warum so), achten (worauf achten), grenzen (wann eher nicht).`, PHASE, k.anker.materialien);
  const phasen = entwurf.phasen.map((alt, i) => (i === index ? { ...p, aktivitaet: p.schueler, begruendung: p.details, deckt: [], neu: true } : { ...alt, neu: false }));
  return { ...entwurf, phasen };
}