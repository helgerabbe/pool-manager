import { base44 } from '@/api/base44Client';
import { mitLangenTexten } from '@/lib/langerText';
import { FOLIEN_VORLAGEN, vorlagenText, folieSchema } from '@/lib/folienVorlagen';
import { BAUREGELN, musterText } from '@/lib/foliensatzBauregeln';
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';
import { CI_FOLIENTYPEN } from '@/lib/folienCI';

// Grafikassistent in drei Schritten (2026-10-25):
// 1. planeFoliensatz: nur das Gerüst (leere Folien mit Folienart, Titel, Standardfolie ja/nein).
// 2. Standardfolien bauen (je Folie einzeln über baueFolie).
// 3. Übrige Folien einzeln auf Befehl nach ihrer Bauanleitung bauen (baueFolie).

export const FOLIE_B = 1024;
export const FOLIE_H = 576;

const kontext = (roh, m = mitLangenTexten(roh)) => `Methode: ${m.name}. Fächerübergreifend, Jahrgang 7, Deutsch.
Kurzbeschreibung: ${m.kurzbeschreibung || ''}
Anweisung für den Grafikassistenten (verbindliche Grundlage):
${m.info_grafikassistent || '(keine)'}`;

const regeln = `VORLAGEN (wähle je Folie genau eine, fülle nur ihre Felder, halte die Zeichengrenzen streng ein, Schülersprache, kurz):
${vorlagenText()}
Freigabe: lehrkraft | zeit | alle_fertig | anteil | geloest | code (minuten bei zeit).
erklaerung: 1-2 Sätze, wozu die Folie dient. abfrage: was die Lehrkraft vorher einträgt (leer, wenn nichts).`;

const fertig = (f, i) => ({ ...f, id: f.id || `f${Date.now()}${i}`, status: 'fertig', folientyp: FOLIEN_VORLAGEN[f.vorlage]?.folientyp || f.folientyp || 'methode' });

const t = { type: 'string' };
const geruestSchema = { type: 'object', properties: { thema: t, folien: { type: 'array', items: { type: 'object', properties: {
  titel: t, folientyp: { type: 'string', enum: Object.keys(CI_FOLIENTYPEN) }, standard: t, phase: t,
  kanal: { type: 'string', enum: ['analog', 'digital', 'beide'] }, beschreibung: t,
} } } } };

/** Schritt 1: nur die Folienfolge als leere Folien. */
export async function planeFoliensatz(methode, fach, kanal) {
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Du bist der Grafikassistent. Lies die Anweisung und gib NUR die Folienfolge zurück, keine Gestaltung.
${kontext(methode)}
Lege JEDE Folie der Anweisung in genau dieser Reihenfolge an, nichts zusammenfassen, nichts weglassen. Je Folie:
- titel: kurz, was auf der Folie passiert (max. 50 Zeichen)
- folientyp: ${Object.entries(CI_FOLIENTYPEN).map(([k, v]) => `${k} (${v.name})`).join(', ')}
- standard: Schlüssel der Standardfolie, falls die Anweisung eine nennt oder eine genau passt (${Object.keys(CI_STANDARDFOLIEN).join(', ')}), sonst leer
- phase, kanal
- beschreibung: 1-2 Sätze, worum es auf der Folie geht
thema: das durchgehende Beispielthema.`,
    response_json_schema: geruestSchema,
  });
  return { thema: r.thema, folien: (r.folien || []).map((f, i) => fertig({ ...f, vorlage: 'entwurf', standard: CI_STANDARDFOLIEN[f.standard] ? f.standard : '' }, i)) };
}

/** Schritt 2/3: GENAU eine Folie bauen. */
export async function baueFolie(methode, fach, plan, folie) {
  const nr = plan.folien.findIndex((f) => f.id === folie.id) + 1;
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Du bist der Grafikassistent. Baue GENAU diese eine Folie, passend zur Folge.
${kontext(methode)}
Folge: ${plan.folien.map((f, i) => `${i + 1}. ${f.titel}`).join(' · ')}
Zu bauen: Folie ${nr} „${folie.titel}“ (Phase ${folie.phase || ''}, ${folie.kanal || ''}). ${folie.beschreibung || ''}
Nimm die Beschreibung genau dieser Folie aus der Anweisung als Bauanleitung.
${folie.standard ? `Dies ist die Standardfolie "${folie.standard}": nutze vorlage "standard" mit standard="${folie.standard}" (oder die gleichnamige feste Vorlage) und fülle nur die veränderlichen Inhalte.` : 'Wähle die feste Vorlage, die der Bauanleitung am nächsten kommt (nicht "entwurf").'}
Thema: ${plan.thema || ''}
${BAUREGELN}
${musterText()}
${regeln}`,
    response_json_schema: folieSchema,
  });
  const vorlage = FOLIEN_VORLAGEN[r.vorlage] && r.vorlage !== 'entwurf' ? r.vorlage : 'fokus';
  return fertig({ ...r, vorlage, id: folie.id, kanal: folie.kanal, beschreibung: folie.beschreibung, standard: folie.standard || r.standard }, 0);
}