import { base44 } from '@/api/base44Client';
import { CI_STANDARDFOLIEN } from '@/lib/folienCIStandard';

// Gespeicherte Folienliste (2026-10-25): das feste Rückgrat für Feinplanung und Schrittfolge.
// Wird EINMAL aus der Grobübersicht übernommen; danach liest keine Stufe die Folien neu aus dem Text.

const t = { type: 'string' };
const nurTafel = (text = '') => text.split('GROB · TABLET')[0];
const tabletTeil = (text = '') => text.split('GROB · TABLET')[1] || '';

export async function kiFolienliste(methode) {
  const r = await base44.integrations.Core.InvokeLLM({
    prompt: `Übernimm aus der GROBÜBERSICHT die Folienliste: je Tafelfolie GENAU ein Eintrag, in genau dieser Reihenfolge. Nichts hinzufügen, nichts weglassen, nichts doppeln. Die Tablet-Übersicht beschreibt dieselben Folien und erzeugt KEINE eigenen Einträge.
Je Folie: name (kurz), phase, nur_digital (true bei Zusatz "nur digital"),
tafel_standard und tablet_standard: Schlüssel der Standardfolie NUR, wenn die Übersicht sie für diese Seite ausdrücklich nennt (${Object.entries(CI_STANDARDFOLIEN).map(([k, v]) => `${k} = ${v.name}`).join(', ')}), sonst leer.

TAFEL-ÜBERSICHT:
${nurTafel(methode.info_grobuebersicht)}

TABLET-ÜBERSICHT (nur für tablet_standard):
${tabletTeil(methode.info_grobuebersicht)}`,
    response_json_schema: { type: 'object', properties: { folien: { type: 'array', items: { type: 'object', properties: {
      name: t, phase: t, nur_digital: { type: 'boolean' }, tafel_standard: t, tablet_standard: t,
    } } } } },
  });
  const ok = (k) => (CI_STANDARDFOLIEN[k] ? k : '');
  return (r.folien || []).map((f) => ({ ...f, tafel_standard: ok(f.tafel_standard), tablet_standard: ok(f.tablet_standard) }));
}

/** Folienart einer Seite: bei Standardfolie fest aus dem Katalog. */
export const festeFolienart = (standard, sonst) => CI_STANDARDFOLIEN[standard]?.folientyp || sonst;