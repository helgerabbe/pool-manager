// Baukasten des Folien-Designers als Text für den Grafikassistenten (2026-10-21).
// Der Folien-Designer ist kein Werkzeug für Lehrkräfte, sondern der Katalog, aus dem der Grafikassistent baut.
import { FOLIEN_GRUPPEN } from '@/lib/folienElemente';
import { FOLIEN_KONZEPT } from '@/lib/folienKonzept';
import { FUNKTIONEN } from '@/lib/folienFunktionen';
import { FOLIEN_SYMBOLE, FREIGABE_BEDINGUNGEN } from '@/lib/folienSymbole';
import { ZUTEILUNG_ARTEN, ZUTEILUNG_VERFAHREN, WECHSEL, FREIGABE, ABLAUF } from '@/lib/folienOrganisation';

const liste = (paare) => paare.map((p) => p[1]).join(', ');

export const folienBaukastenText = () => `BEGRIFFE (gemeinsame Sprache):
${FOLIEN_KONZEPT.map((g) => `${g.titel}:\n${g.punkte.map(([n, t]) => `- ${n}: ${t}`).join('\n')}`).join('\n')}

ELEMENTE, DIE AUF EINER FOLIE ZUR VERFÜGUNG STEHEN (nur diese verwenden, beim Namen nennen):
${FOLIEN_GRUPPEN.map((g) => `${g.titel}${g.hinweis ? ` (${g.hinweis})` : ''}: ${g.elemente.map((e) => e.label).join(', ')}`).join('\n')}
Symbole (Piktogramme): ${liste(FOLIEN_SYMBOLE)}
Freigabebedingung einer Folie: ${liste(FREIGABE_BEDINGUNGEN)}

FUNKTION EINER INTERAKTION: ${Object.values(FUNKTIONEN).map((f) => `${f.label} = ${f.text}`).join(' ')}
Sichtbarkeit eines Elements: für alle, für eine Rolle, je Schüler, alle außer mir. Ergebnisse anonym oder mit Namen, sofort oder nach Freigabe.

ORGANISATION DES FOLIENSATZES:
- Zuteilung: ${liste(ZUTEILUNG_ARTEN)}; Verfahren: ${liste(ZUTEILUNG_VERFAHREN)}; Wechsel: ${liste(WECHSEL)}
- Nächste Folie freigeben: ${liste(FREIGABE)}; Ablauf der Folien: ${liste(ABLAUF)}
- Steuerung der Lehrkraft: Phase freigeben, synchroner Timer, Fertig-Meldungen der Schüler mit Klassenstand, Partner nach Fertig-Meldung.`;