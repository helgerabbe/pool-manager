import { base44 } from '@/api/base44Client';
import { mitLangenTexten } from '@/lib/langerText';
import { FOLIEN_VORLAGEN, vorlagenText, folieSchema } from '@/lib/folienVorlagen';
import { BAUREGELN, musterText } from '@/lib/foliensatzBauregeln';

// Grafikassistent (2026-10-23): EINE Anfrage für den ganzen Satz. Die KI wählt je Folie eine feste Vorlage
// und füllt kurze Texte; das Aussehen kommt aus den Vorlagen im Code.

export const FOLIE_B = 1024;
export const FOLIE_H = 576;

const kontext = (roh, m = mitLangenTexten(roh)) => `Methode: ${m.name}. Fächerübergreifend, Jahrgang 7, Deutsch.
Kurzbeschreibung: ${m.kurzbeschreibung || ''}
Grobübersicht (Folienfolge verbindlich):
${m.info_grobuebersicht || '(keine)'}
Ablauf (Methodenbeschreiber):
${m.info_methodenbeschreiber || m.ablauf || ''}
Anweisung für den Grafikassistenten:
${m.info_grafikassistent || '(keine)'}`;

const regeln = `VORLAGEN (wähle je Folie genau eine, fülle nur ihre Felder, halte die Zeichengrenzen streng ein, Schülersprache, kurz):
${vorlagenText()}
Freigabe: lehrkraft | zeit | alle_fertig | anteil | geloest | code (minuten bei zeit).
erklaerung: 1-2 Sätze, wozu die Folie dient. abfrage: was die Lehrkraft vorher einträgt (leer, wenn nichts).`;

const fertig = (f, i) => ({ ...f, id: f.id || `f${Date.now()}${i}`, status: 'fertig', folientyp: FOLIEN_VORLAGEN[f.vorlage]?.folientyp || 'methode' });

export async function planeFoliensatz(methode, fach, kanal, ziel = 'divergierend') {
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Du bist der Grafikassistent. Lege den ${kanal === 'digital' ? 'DIGITALEN' : 'ANALOGEN'} Foliensatz dieser Methode in Ablaufreihenfolge an. Lege JEDE Folie aus der Grobübersicht bzw. der Anweisung für den Grafikassistenten an, die zu diesem Kanal gehört, in genau dieser Reihenfolge; nichts zusammenfassen, nichts weglassen (Kanal "${kanal}", Ziel "${ziel}").
${kontext(methode)}
Ein durchgehendes Beispielthema. Nutze Standardfolien, wo sie passen.
${BAUREGELN}
${musterText(ziel)}
${regeln}`,
    response_json_schema: { type: 'object', properties: { thema: { type: 'string' }, folien: { type: 'array', items: folieSchema } } },
    model: 'claude_sonnet_4_6',
  });
  // Unbekannte Vorlage: Folie behalten und als Fokusfolie darstellen statt still zu verwerfen.
  return { thema: r.thema, folien: (r.folien || []).map((f) => (FOLIEN_VORLAGEN[f.vorlage] ? f : { ...f, vorlage: 'fokus' })).map(fertig) };
}

export async function baueFolie(methode, fach, plan, folie) {
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Du bist der Grafikassistent. Erzeuge GENAU diese eine Folie neu, passend zur Folge.
${kontext(methode)}
Folge: ${plan.folien.map((f, i) => `${i + 1}. ${f.titel} (${f.vorlage})`).join(' · ')}
Neu zu erzeugen: "${folie.titel}" (Phase ${folie.phase}, ${folie.kanal}). Du darfst eine passendere Vorlage wählen.
${BAUREGELN}
${regeln}`,
    response_json_schema: folieSchema,
  });
  return fertig({ ...r, id: folie.id, kanal: folie.kanal }, 0);
}