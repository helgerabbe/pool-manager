import { base44 } from '@/api/base44Client';
import { mitLangenTexten } from '@/lib/langerText';
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';
import { CI_FOLIENTYPEN } from '@/lib/folienCI';
import { festeFolienart } from '@/lib/kiFolienliste';

const t = { type: 'string' };
const typ = { type: 'string', enum: Object.keys(CI_FOLIENTYPEN) };

/** Erstellt aus der Feinplanung die Schrittfolge: je Schritt Tafel und Tablet kurz nebeneinander. */
export async function kiSchrittfolge(roh) {
  const m = mitLangenTexten(roh);
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Erstelle aus der Feinplanung die Schrittfolge des Foliensatzes als Tabelle.
Methode: ${m.name}
FEINPLANUNG (verbindlich):
${m.info_grafikassistent || ''}

${m.info_folienliste?.length ? `VERBINDLICHE FOLIENLISTE (je Folie mindestens ein Schritt, gleiche Reihenfolge, Standardfolien wie angegeben übernehmen):
${m.info_folienliste.map((f, i) => `${i + 1}. ${f.name} (Phase ${f.phase || '-'}; Tafel: ${f.tafel_standard || 'keine'}; Tablet: ${f.tablet_standard || 'keine'})`).join('\n')}
Die Feinplanung kann jede Folie in Tafel- und Tablet-Teil doppelt beschreiben: das ist DIESELBE Folie, kein neuer Schritt.
` : ''}
Regeln:
- Ein Schritt ist JEDE Veränderung: nur an der Tafel, nur auf dem Tablet oder auf beiden. Hat das Tablet z. B. drei Folien, während die Tafel gleich bleibt, sind das drei Schritte.
- Je Seite kurz (max. 120 Zeichen), was zu sehen ist. Bleibt eine Seite gleich: "unverändert (wie Schritt N)". Hat eine Seite nichts: "nichts".
- Folienart je Seite getrennt: ${Object.entries(CI_FOLIENTYPEN).map(([k, v]) => `${k} = ${v.name}`).join(', ')}. Wähle sie nach der Funktion der Folie, nicht pauschal.
- Standardfolie je Seite NUR, wenn die Feinplanung sie ausdrücklich nennt (Schlüssel: ${Object.keys(CI_STANDARDFOLIEN).join(', ')}), sonst leer. Im Zweifel leer.
- Inhaltsfolien an der Tafel: Das Tablet zeigt dabei automatisch den Zuhören-Hinweis; trage dafür KEINE Standardfolie ein (tablet_typ "inhalt", tablet_standard leer).
- Zeigt die Lehrkraft einen Gegenstand (Buch, Bild, Objekt) und lenkt den Fokus darauf, ist das eine Inhaltsfolie mit der Funktion "Impuls setzen".`,
    response_json_schema: { type: 'object', properties: { schritte: { type: 'array', items: { type: 'object', properties: {
      phase: t, tafel_typ: typ, tafel_standard: t, tafel: t, tablet_typ: typ, tablet_standard: t, tablet: t,
    } } } } },
  });
  const ok = (k) => (CI_STANDARDFOLIEN[k] ? k : '');
  return (r.schritte || []).map((s) => {
    const tafel_standard = ok(s.tafel_standard);
    const tablet_standard = ok(s.tablet_standard);
    return { ...s, tafel_standard, tablet_standard, tafel_typ: festeFolienart(tafel_standard, s.tafel_typ), tablet_typ: festeFolienart(tablet_standard, s.tablet_typ) };
  });
}