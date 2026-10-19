import { base44 } from '@/api/base44Client';
import { STUNDEN_KLASSEN } from '@/lib/stundenDesign';
import { BAUSTEIN_KATALOG } from '@/lib/stundenBausteine';

// ZWEI ASSISTENTEN (2026-10-19): 1) Funktion baut Aufbau und Interaktion, 2) Gestaltung verschönert nur.
// Geht beim Verschönern eine Interaktion verloren, bleibt das Gerüst aus Schritt 1 bestehen.

const FOTO_STIL = 'Realistic high-quality photograph, natural light, authentic, calm composition, soft muted colors, no text, no lettering. Strictly NOT a cartoon, NOT a comic, NOT an illustration, NOT clipart, NOT 3D render.';

async function erzeugeFotos(bilder) {
  const paare = await Promise.all((bilder || []).map(async (b) => {
    const { url } = await base44.integrations.Core.GenerateImage({ prompt: `${b.prompt}. ${FOTO_STIL}` });
    return [b.id, url];
  }));
  return Object.fromEntries(paare);
}

const einsetzen = (html, fotos) => Object.entries(fotos).reduce((h, [id, url]) => h.split(`{{bild:${id}}}`).join(url), html || '');

const BIBLIOTHEKEN = `GRAFIK-BIBLIOTHEKEN (erlaubt, nur diese, nur über genau diese Adressen per <script src>, sonst keine Netzwerkzugriffe):
- three.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> (globales THREE; eigene Maus-/Touch-Drehung, OrbitControls gibt es nicht)
- JSXGraph: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraph.css"><script src="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraphcore.js"></script> (globales JXG)
- GSAP: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script> (globales gsap)`;

/** Merkmale der Funktion, die beim Verschönern erhalten bleiben müssen. */
const MERKMALE = ['data-richtig', 'data-passt', 'data-wert', 'data-loesung', 'data-pos', 'data-minuten', 'class="option', 'ziehbar', 'ablage', 'sortieren', 'aufdecken', '<input', '<textarea', '<button', '<script', '<canvas', '<svg'];
const zaehle = (html, m) => (html || '').split(m).length - 1;
const funktionErhalten = (vorher, nachher) => !!nachher && MERKMALE.every((m) => zaehle(nachher, m) >= zaehle(vorher, m));

async function funktionBauen(methode, fach) {
  const prompt = `Du bist Assistent 1 (FUNKTION) für grafische Unterrichtsvorlagen an einer Gesamtschule. Baue NUR Aufbau und Funktion, um die Optik kümmert sich danach ein zweiter Assistent.
Methode: "${methode.name}". Fach: ${fach}. Wähle ein typisches Beispielthema aus diesem Fach (bei "Fächerübergreifend" z. B. Lernen lernen oder Klassenregeln). Realistische, kurze Inhalte auf Deutsch, Jahrgang 7.
Was die Methode ist: ${methode.kurzbeschreibung || ''}
Ablauf: ${methode.ablauf || ''}
Ablauf und Funktionalität der Methode: ${methode.info_methodenbeschreiber || '(keine)'}
Vorgaben für den Grafikassistenten: ${methode.info_grafikassistent || '(keine)'}

Liefere zwei HTML-Fragmente (Inhalt von <body>), beide beginnen mit <div class="stunde">:
- lehrer: Lehrer-Display (digitale Tafel, Querformat): was die Klasse sieht, groß und klar gegliedert.
- schueler: Schüler-Display (Tablet): alles, was die Schüler tun.
DEINE AUFGABE: vollständiger, sinnvoller Inhalt, klare Reihenfolge, und echte Interaktion, wo die Methode es verlangt (Auswählen, Zuordnen, Sortieren, Aufdecken, Eingaben, Schieberegler, Timer). Alles muss wirklich funktionieren.
Nutze dafür vorrangig die Bausteine (ihr Verhalten ist schon eingebaut):
${BAUSTEIN_KATALOG}
Grundklassen: ${STUNDEN_KLASSEN}
Eigenes <script> nur für Funktion, die kein Baustein abdeckt (z. B. Simulationen). ${BIBLIOTHEKEN}
Keine Bilder, kein eigenes Design-CSS, keine Dekoration.`;
  return base44.integrations.Core.InvokeLLM({
    prompt, model: 'claude_sonnet_4_6',
    response_json_schema: { type: 'object', properties: { thema: { type: 'string' }, lehrer: { type: 'string' }, schueler: { type: 'string' } } },
  });
}

async function gestalten(geruest, methode) {
  const prompt = `Du bist Assistent 2 (GESTALTUNG) für grafische Unterrichtsvorlagen. Du bekommst zwei fertige, funktionierende HTML-Fragmente der Methode "${methode.name}" (Thema: ${geruest.thema}) und machst sie NUR optisch hochwertig.
STRENGE REGEL: Ändere nichts an der Funktion. Alle Texte, Knöpfe, Eingaben, Skripte, data-Attribute und die Klassen option, ziehbar, ablage, sortieren, aufdecken, timer, fortschritt bleiben vollständig erhalten. Du darfst Elemente umgruppieren, in Bausteine einbetten, Klassen ERGÄNZEN und ein eigenes <style> hinzufügen.

LEHRERANSICHT: ruhig, groß, aus der Ferne lesbar, dezente Einblendungen.
SCHÜLERANSICHT: ansprechend und lebendig: Kopfbereich (.held) mit Stimmungsbild, gestaffeltes Einblenden (data-einblenden), weiche Schatten, Farbverläufe aus den Farbvariablen, große selbstbewusste Überschriften, Karten heben sich beim Berühren an. Animationen kurz (0,3–0,8 s), keine Dauerschleifen, prefers-reduced-motion respektieren. Keine Neonfarben.
${BAUSTEIN_KATALOG}
Grundklassen: ${STUNDEN_KLASSEN}

BILDER: nur echte Fotos, keine Comics, Illustrationen, Cliparts oder Emojis als Bildersatz. 1–2, höchstens 3 Fotos per <img src="{{bild:ID}}" alt="..." style="object-fit:cover">, dazu ein ruhiges Naturfoto mit der ID "hintergrund" als background-image (z. B. im .held), mit Verlauf darüber für Lesbarkeit. Beschreibe jedes Foto in "bilder" auf Englisch (Motiv, Perspektive, Umgebung), keine Porträts im Vordergrund, keine Schrift im Bild.

LEHRER-FRAGMENT:
${geruest.lehrer}

SCHÜLER-FRAGMENT:
${geruest.schueler}`;
  return base44.integrations.Core.InvokeLLM({
    prompt, model: 'claude_opus_4_8',
    response_json_schema: {
      type: 'object',
      properties: {
        lehrer: { type: 'string' }, schueler: { type: 'string' },
        bilder: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, prompt: { type: 'string' } } } },
      },
    },
  });
}

/** Schritt 1: Prototyp ohne besondere Grafik aus der Anweisung für den Grafikassistenten. */
export async function erstellePrototyp(methode, fach) {
  const g = await funktionBauen(methode, fach);
  return { thema: g.thema, lehrer: g.lehrer, schueler: g.schueler };
}

/** Schritt 2: fertigen Prototyp gestalten. Geht Funktion verloren, bleibt der Prototyp. */
export async function gestalteVorlage(geruest, methode) {
  const schick = await gestalten(geruest, methode);
  const fotos = await erzeugeFotos(schick.bilder);
  const waehle = (teil) => (funktionErhalten(geruest[teil], schick[teil]) ? einsetzen(schick[teil], fotos) : geruest[teil]);
  return { thema: geruest.thema, lehrer: waehle('lehrer'), schueler: waehle('schueler') };
}