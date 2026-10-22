import { base44 } from '@/api/base44Client';
import { setzeTeil } from '@/lib/kiGrafikAnweisung';

const mitZeitlimit = (p) => Promise.race([p, new Promise((_, nein) => setTimeout(() => nein(new Error('Zeitlimit')), 90000))]);
const KOEPFE = ['GROB · ANALOGE FOLIEN', 'GROB · DIGITALE FOLIEN'];

/** Macht aus der gesprochenen Eingabe eine kompakte Punkteliste. */
export async function kiWuenscheStrukturieren(roh) {
  const text = await mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `Eine Lehrkraft hat frei gesprochen, was ihr beim Foliensatz einer Unterrichtsmethode wichtig ist. Fasse das als kompakte Liste zusammen: je Punkt eine Zeile mit "- ", klar und knapp, nichts erfinden, nichts weglassen.\n\nEINGABE:\n${roh}\n\nAntworte nur mit der Liste.`,
  }));
  return String(text || '').trim();
}

/** Grobübersicht: nur Folienfolge mit kurzer Beschreibung, getrennt für analog und digital. */
async function grob(methode, art) {
  const text = await mitZeitlimit(base44.integrations.Core.InvokeLLM({
    prompt: `Erstelle eine GROBÜBERSICHT des ${art === 'analog' ? 'ANALOGEN (nur Tafel, keine Schüleransicht)' : 'DIGITALEN (Tafel + Schüleransicht auf dem Gerät)'} Foliensatzes für die Methode "${methode.name}".
Nur die Folienfolge: je Folie eine Zeile "Folie N: Name – ein bis zwei Sätze, was auf der Folie passiert". Keine Elemente, keine Designdetails.

FOLIENSATZ-EXPERTISE DES METHODENBESCHREIBERS:
${methode.info_methodenbeschreiber || '(keine)'}

WAS DER LEHRKRAFT BESONDERS WICHTIG IST (unbedingt berücksichtigen):
${methode.info_wuensche || methode.info_wuensche_roh || '(nichts angegeben)'}

Antworte nur mit der Liste.`,
    model: 'claude_sonnet_4_6',
  }));
  return String(text || '').trim();
}

export async function kiGrobAnalog(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[0], await grob(args.methode, 'analog'), KOEPFE) };
}
export async function kiGrobDigital(args) {
  return { text: setzeTeil(args.bisher, KOEPFE[1], await grob(args.methode, 'digital'), KOEPFE) };
}