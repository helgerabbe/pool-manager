// KI-Grobentwurf (2026-10-16): Der Experte im Hintergrund plant die Stunde stimmig –
// mit dem Methodenwissen aus dem MethodenKatalog (Dauer, Stolpersteine, Prüfregeln, Stufe).
import { base44 } from '@/api/base44Client';
import { kiAnfrage } from '@/lib/kiAnfrage';
import { ANALYSE } from '@/lib/stundenplanerPrototypDaten';
import { PROFIL_PROBE } from '@/lib/anspruchsProfil';

const FELDER = ['name', 'kurzbeschreibung', 'phasen', 'sozialformen', 'dauer_min', 'dauer_max', 'stufe', 'stolpersteine', 'pruefregeln'];

const SCHEMA = {
  type: 'object',
  properties: {
    kurz: { type: 'string' },
    hinweise: { type: 'array', items: { type: 'string' } },
    phasen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, minuten: { type: 'number' }, aktivitaet: { type: 'string' },
          sozialform: { type: 'string' }, methode: { type: 'string' }, begruendung: { type: 'string' },
        },
      },
    },
  },
};

const methodenText = (liste, jahrgang) => liste.map((m) => [
  `- ${m.name} (Stufe ${m.stufe ?? '?'}, ${m.dauer_min ?? '?'}–${m.dauer_max ?? '?'} Min., Phasen: ${(m.phasen || []).join('/')})`,
  m.kurzbeschreibung && `  ${m.kurzbeschreibung}`,
  PROFIL_PROBE[m.name]?.jahrgaenge?.[jahrgang] && `  Eignung Jg. ${jahrgang}: ${PROFIL_PROBE[m.name].jahrgaenge[jahrgang]}`,
  m.stolpersteine && `  Stolpersteine: ${m.stolpersteine.replace(/\n/g, '; ')}`,
  m.pruefregeln && `  Prüfregeln: ${m.pruefregeln.replace(/\n/g, '; ')}`,
].filter(Boolean).join('\n')).join('\n');

/** Erstellt einen stimmigen Grobentwurf im Format der Prototyp-Fassungen. */
export async function kiGrobentwurf({ modell, minuten, ziel, gruppe, jahrgang, fach, assistent = 'base44' }) {
  const { items } = await base44.entities.MethodenKatalog.filter({ ist_aktiv: true, quelle: 'methode' }, { limit: 200, fields: FELDER });
  const prompt = `Du bist ein erfahrener Fachdidaktiker (${fach}, Gesamtschule, heterogene Lerngruppen) und planst einen GROBENTWURF einer Unterrichtsstunde.

Inhaltsanalyse: ${JSON.stringify(ANALYSE)}
Stundenziel: ${ziel.haupt}${ziel.teil?.length ? `\nTeilziele: ${ziel.teil.join('; ')}` : ''}
Jahrgang: ${jahrgang}
Lerngruppe: Arbeitstempo ${gruppe.fit}/5, Selbstständigkeit ${gruppe.stark}/5 (3 = normal)
Verfügbare Netto-Zeit: ${minuten} Minuten
Stundenmodell: ${modell.name} mit den Phasen: ${modell.phasen.join(' → ')}

Methodenwissen (nur diese Methoden verwenden, wenn eine Methode sinnvoll ist):
${methodenText(items, jahrgang)}

Regeln:
- Folge dem Stundenmodell. Phasen dürfen zusammengefasst werden, die Kernphasen des Modells aber nie ersatzlos entfallen. Phasennamen = Modellphasen.
- Gib jeder Phase die Zeit, die ihr Vorhaben realistisch braucht. Halte die Mindestdauer gewählter Methoden ein. Die Summe muss genau ${minuten} Minuten ergeben.
- Wähle nur Methoden, die zu Jahrgang und Lerngruppe passen (Stufe, Eignung, Stolpersteine beachten).
- Aktivität: 1–2 konkrete Sätze zum Inhalt. Keine Materialausarbeitung.
- Begründung: ein kurzer Satz, warum Zeit und Methode passen.
- "hinweise" NUR, wenn sich die Vorgaben nicht stimmig umsetzen lassen (z. B. zu wenig Zeit für das Modell). Sonst leer.
- "kurz": eine Zeile, was diese Stunde ausmacht.`;
  const r = assistent === 'anthropic'
    ? await kiAnfrage({ prompt, response_json_schema: SCHEMA })
    : await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
  const nachName = Object.fromEntries(items.map((m) => [m.name, m]));
  return {
    name: 'Standardstunde', aufwand: 1, vorlage: 'standard', kurz: r.kurz,
    hinweis: (r.hinweise || []).join(' '),
    phasen: (r.phasen || []).map((p) => ({
      name: p.name, minuten: p.minuten, aktivitaet: p.aktivitaet, sozialform: p.sozialform, begruendung: p.begruendung,
      methode: nachName[p.methode]?.name, methode_dauer_min: nachName[p.methode]?.dauer_min, deckt: [],
    })),
  };
}