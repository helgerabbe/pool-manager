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
          art: { type: 'string', enum: ['idee', 'feinschliff', 'herangehensweise', 'grosser_wurf', 'achtung'] },
          titel: { type: 'string' },
          vorher: { type: 'string', description: 'Was jetzt geplant ist (kurz).' },
          nachher: { type: 'string', description: 'Wie es nach der Änderung aussähe (kurz).' },
          hintergrund: { type: 'string', description: 'Didaktische Begründung, 1-2 Sätze.' },
          aufwand: { type: 'string', description: 'Vorbereitungsaufwand in wenigen Worten.' },
          text: { type: 'string' },
          aenderung: { type: 'string', description: 'Konkreter Änderungsauftrag an den Entwurf, falls die Lehrkraft zustimmt.' },
        },
      },
    },
  },
};

export async function kiEntwurfsTipps({ assistent, fach, jahrgang, modell, varianteKey, entwurf }) {
  const phasen = entwurf.phasen.map((p, i) => {
    const alt = phasenAlternativen(p, modell.key, varianteKey).slice(0, 5).map((a) => a.name);
    return `${i}. ${p.name} (${p.minuten} Min., ${p.sozialform}${p.methode ? `, Methode: ${p.methode}` : ''}): ${p.aktivitaet}${alt.length ? ` | passende Methoden laut Raster: ${alt.join(', ')}` : ''}`;
  }).join('\n');
  const prompt = `Du bist ein erfahrener Fachdidaktiker und schaust einer Lehrkraft über die Schulter. Fach ${fach}, Jahrgang ${jahrgang}, Gesamtschule.
Stundenmodell: ${modell.name}. Grobentwurf:
${phasen}

Gib 3 bis 5 kurze Hinweise, die den Entwurf lebendiger oder stimmiger machen könnten. Höchstens ZWEI davon betreffen die ganze Stunde (phase = -1). Die übrigen zeigen auf eine konkrete Phase und schlagen bevorzugt eine der dort genannten Methoden vor.
Keine Kritik um der Kritik willen: nur Hinweise, die wirklich etwas bringen. Ton: kollegial, du-Form, ein bis zwei Sätze. Titel höchstens 5 Wörter.
PFLICHT: genau EINE "idee" (kleiner, überraschender Kniff an einer Phase, z. B. ein Rätsel, ein Gegenstand, eine Rolle) und genau EIN "grosser_wurf" (abwechslungsreiche Alternative: die Stunde größer, handlungsorientierter oder kooperativer anlegen, meist phase = -1; beschreibe sie elaboriert mit vorher/nachher).
Ordne jeden Hinweis einer "art" zu: idee = kleiner Kniff; feinschliff = gleiche Methode, kleine Stellschraube; herangehensweise = gleiche Funktion, andere Methode; grosser_wurf = Phase oder Stunde grundlegend anders anlegen; achtung = typischer Stolperstein der gewählten Methode (dann "aenderung" leer lassen, falls nichts umzubauen ist). Mische die Arten sinnvoll.
Fülle vorher/nachher, hintergrund und aufwand knapp aus – sie stehen zum Aufklappen bereit.
"aenderung" ist ein klarer Auftrag, wie der Entwurf umgebaut wird, wenn die Lehrkraft zustimmt; das Stundenmodell bleibt erhalten.`;
  const r = await kiAufruf(assistent, prompt, SCHEMA);
  return (r.tipps || []).slice(0, 5).map((t) => ({ ...t, phase: Number.isInteger(t.phase) && t.phase < entwurf.phasen.length ? t.phase : -1 }));
}