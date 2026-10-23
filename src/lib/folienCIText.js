import { CI_GRUND, CI_BOXEN, CI_FOLIENTYPEN, CI_BUTTONS, CI_RASTER, CI_TEXT, CI_SOZIALFORM } from '@/lib/folienCI';
import { CI_STANDARDFOLIEN, CI_STANDARD_REGEL } from '@/lib/folienCIStandard';

// Gestaltungsregeln (Teil 1-15) als Text für den Grafikassistenten, damit der Funktionsaufbau sofort im fertigen Look entsteht.
export function folienCIText() {
  const boxen = Object.values(CI_BOXEN).map((b) => `${b.titel}: Hintergrund ${b.hg}, Rand ${b.rand}, Text ${b.text}`).join('; ');
  const typen = Object.entries(CI_FOLIENTYPEN).map(([k, t]) => `${k} = ${t.name}`).join(', ');
  const standard = Object.entries(CI_STANDARDFOLIEN).map(([k, s]) => `${k} (${s.name}): Tafel: ${s.lehrer} Tablet: ${s.schueler}`).join('\n');
  return `GESTALTUNG (verbindlich): ruhig, pastellig, aufgeräumt, keine Schatten auf Boxen. Hintergrund ${CI_GRUND.hintergrund}, Text ${CI_GRUND.text}.
Inhaltsboxen: ${boxen}.
Überschrift ${CI_TEXT.titel.groesse}px fett, Fließtext ${CI_TEXT.fliess.groesse}px.
Buttons: Hauptaktion ${CI_BUTTONS.haupt.hg} mit weißer Schrift, Prüfen ${CI_BUTTONS.pruefen.hg}.
Raster: Kopfleiste oben (${CI_RASTER.kopf.hoehe}% Höhe, klein Fach/Einheit). Ecke rechts oben frei für Timer und Sozialform (${Object.values(CI_SOZIALFORM).map((s) => s.name).join(', ')}). Ecke rechts unten frei für die Steuerung. Die rechte obere Ecke trägt zusätzlich die weiche Folientyp-Form, dort nichts Wichtiges platzieren.
Folientypen: ${typen}.
STANDARDFOLIEN (verwende sie, wo sie passen, statt neu zu gestalten):
${standard}
${CI_STANDARD_REGEL}`;
}