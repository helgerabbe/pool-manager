// Arten der Assistenten-Hinweise (2026-10-16): wie weit ein Vorschlag in den Entwurf eingreift.
import { Wrench, Shuffle, Rocket, AlertTriangle, Lightbulb } from 'lucide-react';

export const TIPP_ARTEN = {
  idee: { name: 'Kleine Idee', erklaerung: 'ein kleiner Kniff, der die Stunde belebt', Icon: Lightbulb, rand: 'border-l-amber-400', icon: 'text-amber-600', bg: 'bg-amber-50' },
  feinschliff: { name: 'Feinschliff', erklaerung: 'gleiche Methode, kleine Stellschraube', Icon: Wrench, rand: 'border-l-slate-400', icon: 'text-slate-500', bg: 'bg-slate-50' },
  herangehensweise: { name: 'Andere Herangehensweise', erklaerung: 'gleiche Funktion, andere Methode', Icon: Shuffle, rand: 'border-l-sky-500', icon: 'text-sky-600', bg: 'bg-sky-50' },
  grosser_wurf: { name: 'Abwechslungsreiche Alternative', erklaerung: 'die Stunde oder Phase größer und anders anlegen', Icon: Rocket, rand: 'border-l-orange-500', icon: 'text-orange-600', bg: 'bg-orange-50' },
  achtung: { name: 'Achtung', erklaerung: 'typischer Stolperstein', Icon: AlertTriangle, rand: 'border-l-rose-500', icon: 'text-rose-600', bg: 'bg-rose-50' },
};
export const tippArt = (key) => TIPP_ARTEN[key] || TIPP_ARTEN.feinschliff;