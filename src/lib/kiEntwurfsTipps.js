// Assistent neben dem Grobentwurf (2026-10-16): wenige Hinweise, an Phasen oder zur ganzen Stunde.
import { kiAufruf } from '@/lib/kiStundenVorbereitung';
import { phasenAlternativen } from '@/lib/phasenAlternativen';

const SCHEMA = {
  type: 'object',
  properties: {
    tipps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phase: { type: 'number', description: 'Index der Phase (0-basiert) oder -1 für die ganze Stunde.' },
          titel: { type: 'string' },
          text: { type: 'string' },
          aenderung: { type: 'string', description: 'Konkreter Änderungsauftrag an den Entwurf, falls die Lehrkraft zustimmt.' },
        },
      },
    },
  },
};

export async function kiEntwurfsTipps({ assistent, fach, jahrgang, modell, varianteKey, entwurf }) {
  const phasen = entwurf.phasen.map((p, i) => {
    const alt = phasenAlternativen(p, modell.key, varianteKey).slice(0, 4).map((a) => a.name);
    return `${i}. ${p.name} (${p.minuten} Min., ${p.sozialform}): ${p.aktivitaet}${alt.length ? ` | passende Methoden laut Raster: ${alt.join(', ')}` : ''}`;
  }).join('\n');
  const prompt = `Du bist ein erfahrener Fachdidaktiker und schaust einer Lehrkraft über die Schulter. Fach ${fach}, Jahrgang ${jahrgang}, Gesamtschule.
Stundenmodell: ${modell.name}. Grobentwurf:
${phasen}

Gib 2 bis 4 kurze Hinweise, die den Entwurf lebendiger oder stimmiger machen könnten. Höchstens EINER davon betrifft die ganze Stunde (phase = -1, z. B. aktiver aufbauen, ruhiger, mehr Kooperation). Die übrigen zeigen auf eine konkrete Phase und schlagen bevorzugt eine der dort genannten Methoden vor.
Keine Kritik um der Kritik willen: nur Hinweise, die wirklich etwas bringen. Ton: kollegial, du-Form, ein bis zwei Sätze. Titel höchstens 5 Wörter.
"aenderung" ist ein klarer Auftrag, wie der Entwurf umgebaut wird, wenn die Lehrkraft zustimmt; das Stundenmodell bleibt erhalten.`;
  const r = await kiAufruf(assistent, prompt, SCHEMA);
  return (r.tipps || []).slice(0, 4).map((t) => ({ ...t, phase: Number.isInteger(t.phase) && t.phase < entwurf.phasen.length ? t.phase : -1 }));
}