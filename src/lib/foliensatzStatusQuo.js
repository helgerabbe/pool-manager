// Status quo (2026-10-23): Der fertig gebaute Foliensatz wird als genaue Beschreibung festgehalten,
// damit er sich jederzeit identisch wieder erstellen lässt. Ersetzt Wünsche, Methodenbeschreibung und Grobübersicht.
import { base44 } from '@/api/base44Client';
import { langeTexteTeilen } from '@/lib/langerText';

const OHNE = ['status', 'liegt', 'entscheidungen', 'erklaerung'];

export function beschreibeFoliensatz(methodeName, folien) {
  const kopf = `STATUS QUO DES FOLIENSATZES „${methodeName}“ (übernommen am ${new Date().toLocaleDateString('de-DE')})
Diese Beschreibung gibt den fertig gebauten Foliensatz exakt wieder. Beim Neubau jede Folie genau so übernehmen: gleiche Reihenfolge, gleiche Vorlage, gleiche Texte, gleiche Felder.`;
  const teile = folien.map((f, i) => {
    const daten = Object.fromEntries(Object.entries(f).filter(([k]) => !OHNE.includes(k)));
    return `\n\nFOLIE ${i + 1}: ${f.titel || f.vorlage}${f.nur ? ` (nur ${f.nur})` : ''}
Zweck: ${f.erklaerung || '-'}
Was auf der Folie liegt:\n${(f.liegt || []).map((x) => `- ${x}`).join('\n') || '-'}
Entscheidungen der Lehrkraft:\n${(f.entscheidungen || []).map((x) => `- ${x}`).join('\n') || '-'}
Genaue Daten: ${JSON.stringify(daten)}`;
  });
  return kopf + teile.join('');
}

export const STATUS_QUO_WERTE = (text) => ({
  info_wuensche_roh: '', info_wuensche: '', info_methodenbeschreiber: '', info_grobuebersicht: '',
  info_grafikassistent: text, foliensatz_status_quo: true,
});

export async function statusQuoSpeichern(methodeId, werte) {
  await base44.entities.MethodenKatalog.update(methodeId, langeTexteTeilen({ ...werte }));
}