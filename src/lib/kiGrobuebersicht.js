import { base44 } from '@/api/base44Client';
import { setzeTeil } from '@/lib/kiGrafikAnweisung';
import { standardFolienKatalogText, STANDARD_REGEL_GROB } from '@/lib/standardFolienKatalogText';

const mitZeitlimit = (p) => Promise.race([p, new Promise((_, nein) => setTimeout(() => nein(new Error('Zeitlimit')), 90000))]);
const KOEPFE = ['GROB · TAFEL', 'GROB · TABLET'];
const ART = {
  tafel: 'Erstelle eine GROBÜBERSICHT des Foliensatzes für die TAFEL. Es ist EIN gemeinsamer Satz; Folien, die es nur bei digitaler Durchführung zusätzlich gibt, bekommen den Zusatz "(nur digital)". Spannt sich die Methode über die ganze Stunde (Anfang und späterer Rückgriff), setze dort, wo der Unterricht mit eigenen Inhaltsfolien weitergeht, eine Folie "Einschub: Folien aus dem Unterricht" als Platzhalter.\nNur die Folienfolge: je Folie eine Zeile "Folie N: Name – ein bis zwei Sätze, was an der Tafel passiert".',
  tablet: 'Erstelle eine GROBÜBERSICHT der TABLET-ANSICHT: Was sehen und tun die Schüler auf ihrem Tablet, während die jeweilige Tafelfolie gezeigt wird?\nJe Tafelfolie eine Zeile "Folie N: Name – ein bis zwei Sätze, was auf dem Tablet zu sehen ist". Gleiche Nummern und Namen wie in der Tafel-Übersicht.',
};

/** Macht aus der gesprochenen Eingabe eine kompakte Punkteliste. */
export async function kiWuenscheStrukturieren(roh) {
  const text = await mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `Eine Lehrkraft hat frei gesprochen, was ihr beim Foliensatz einer Unterrichtsmethode wichtig ist. Fasse das als kompakte Liste zusammen: je Punkt eine Zeile mit "- ", klar und knapp, nichts erfinden, nichts weglassen.\n\nEINGABE:\n${roh}\n\nAntworte nur mit der Liste.`,
  }));
  return String(text || '').trim();
}

/** Grobübersicht: Folienfolge an der Tafel bzw. passende Tablet-Ansicht je Folie. */
async function grob(methode, art, bisher) {
  const text = await mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `Methode: "${methode.name}".
${ART[art]} Keine Elemente, keine Designdetails.
${STANDARD_REGEL_GROB}${art === 'tablet' ? ' Übernimm die Standardfolien-Angaben der Tafel-Übersicht.' : ''}

VORHANDENE STANDARDFOLIEN (Katalog):
${standardFolienKatalogText()}
${art === 'tablet' ? `\nTAFEL-ÜBERSICHT (verbindlich):\n${bisher || methode.info_grobuebersicht || '(keine)'}\n` : ''}

FOLIENSATZ-EXPERTISE DES METHODENBESCHREIBERS:
${methode.info_methodenbeschreiber || '(keine)'}

WAS DER LEHRKRAFT BESONDERS WICHTIG IST (unbedingt berücksichtigen):
${methode.info_wuensche || methode.info_wuensche_roh || '(nichts angegeben)'}

Antworte nur mit der Liste.`,
    model: 'claude_sonnet_4_6',
  }));
  return String(text || '').trim();
}

export async function kiGrobTafel(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[0], await grob(args.methode, 'tafel'), KOEPFE) };
}
export async function kiGrobTablet(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[1], await grob(args.methode, 'tablet', args.bisher), KOEPFE) };
}