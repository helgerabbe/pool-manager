// Grobplanung (2026-10-17): Fundament prüfen, grobes Ziel vorschlagen, Methoden finden, Grobverlauf erstellen.
import { base44 } from '@/api/base44Client';
import { kiAufruf } from '@/lib/kiStundenVorbereitung';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';

export const STUNDENTYPEN = [
  { key: '', name: 'Offen lassen' },
  { key: 'erarbeitung', name: 'Erarbeitungsstunde' },
  { key: 'uebung', name: 'Übungsstunde' },
  { key: 'vertieft', name: 'Vertiefte Übungsstunde' },
  { key: 'wiederholung', name: 'Wiederholungsstunde' },
  { key: 'diagnose', name: 'Diagnosestunde' },
  { key: 'misch', name: 'Mischstunde' },
];
export const stundentypName = (key) => STUNDENTYPEN.find((t) => t.key === key)?.name;

export const ankerVorhanden = (a) => a.abschnitte.length > 0 || !!a.text.trim() || a.materialien.length > 0;

const kontextText = ({ einheit, anker, minuten }) => [
  `Fach: ${einheit.fach}, Jahrgang ${einheit.jahrgangsstufe}, ${anker.schulform || 'Integrierte Gesamtschule'} in Niedersachsen (Leistungsniveau entsprechend ausrichten)`,
  `Unterrichtseinheit: ${einheit.titel}`,
  minuten ? `Verfügbare Zeit: ${minuten} Minuten` : 'Verfügbare Zeit: noch offen – Einzelstunde (45 Min.) oder Doppelstunde (90 Min.), je nachdem, was das Vorhaben braucht',
  ...anker.abschnitte.map((s) => `Stunde aus dem Einheitenverlauf: ${s.titel}${s.lernziel ? ` – Lernziel: ${s.lernziel}` : ''}${s.inhalte?.length ? ` – Inhalte: ${s.inhalte.join('; ')}` : ''}`),
  anker.text.trim() && `Beschreibung der Lehrkraft: ${anker.text.trim()}`,
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

/** Grobe Zielrichtung: „Am Ende der Stunde können/haben die Schüler …“ */
export const kiGrobZiel = ({ stundentyp, bisher, korrektur, ...k }) => kiMitMaterial(k.assistent, `Du bist erfahrener Fachdidaktiker. Formuliere die GROBE Zielrichtung einer Stunde – verständliche Lehrersprache, keine perfekte Operatoren-Formulierung.
${kontextText(k)}${stundentyp ? `\nStundentyp: ${stundentypName(stundentyp)}` : ''}

- "haupt": ein Satz, beginnend mit "Am Ende der Stunde können die Schüler …" oder "Am Ende der Stunde haben die Schüler …"
- "alternativen": 2–3 andere sinnvolle Akzente in derselben Form.${korrektur ? `\n\nBisheriger Vorschlag: ${bisher}\nWunsch der Lehrkraft: "${korrektur}" – richte dich danach.` : ''}`, {
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

const PHASE = { type: 'object', properties: { name: { type: 'string' }, minuten: { type: 'number' }, lehrer: { type: 'string' }, schueler: { type: 'string' }, sozialform: { type: 'string' }, methode: { type: 'string' }, details: { type: 'string' } } };
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
${methode ? `Methodenwunsch (unbedingt einbauen): ${methode.name}${methode.kurzbeschreibung ? ` – ${methode.kurzbeschreibung}` : ''}` : 'Kein besonderer Methodenwunsch.'}
${ritual ? `Festes Ritual (als eigene Phase einplanen, meist am Anfang): ${ritual.name}${ritual.kurzbeschreibung ? ` – ${ritual.kurzbeschreibung}` : ''}` : ''}

Stundenmodelle: ${STUNDEN_MODELLE.map((m) => `${m.key} = ${m.name}`).join('; ')}
Methodenkatalog (nur diese Methoden verwenden, wenn eine Methode sinnvoll ist):
${items.map((m) => `- ${m.name} (${m.dauer_min ?? '?'}–${m.dauer_max ?? '?'} Min.)`).join('\n')}

Regeln:
- Wähle das passende Stundenmodell ("modell") und folge seinen Phasen sinnvoll.
- Je Phase: "lehrer" = was die Lehrkraft tut, "schueler" = was die Schüler tun (je 1–2 konkrete Sätze), "sozialform" (Plenum, Einzelarbeit, Partnerarbeit, Gruppenarbeit), "methode" falls genutzt, "details" = 1–2 Sätze Hintergrund (warum so, worauf achten).
- "minuten" grob schätzen; ${k.minuten ? `die Summe ergibt ${k.minuten}.` : 'die Summe ergibt 45 oder 90 – entscheide, was das Vorhaben realistisch braucht, und nenne die Wahl samt kurzer Begründung in "hinweise".'} Die Lehrkraft sieht die Zeiten erst in der Feinplanung.
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