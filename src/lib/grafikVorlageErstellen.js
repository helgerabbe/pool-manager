import { base44 } from '@/api/base44Client';
import { STUNDEN_KLASSEN } from '@/lib/stundenDesign';

const FOTO_STIL = 'Realistic high-quality photograph, natural light, authentic, calm composition, soft muted colors, no text, no lettering. Strictly NOT a cartoon, NOT a comic, NOT an illustration, NOT clipart, NOT 3D render.';

/** Erzeugt jedes Foto einmal und liefert { ID: Adresse }. */
async function erzeugeFotos(bilder) {
  const paare = await Promise.all((bilder || []).map(async (b) => {
    const { url } = await base44.integrations.Core.GenerateImage({ prompt: `${b.prompt}. ${FOTO_STIL}` });
    return [b.id, url];
  }));
  return Object.fromEntries(paare);
}

const einsetzen = (html, fotos) => Object.entries(fotos).reduce((h, [id, url]) => h.split(`{{bild:${id}}}`).join(url), html || '');

/** Grafische Vorlage (Lehrer- und Schüler-Display) einer Methode für ein Fach erzeugen. */
export async function erstelleGrafikVorlage(methode, fach) {
  const prompt = `Du bist Grafikassistent für Unterrichtsstunden an einer Gesamtschule. Erstelle eine beispielhafte grafische Vorlage der Methode "${methode.name}".
Fach: ${fach}. Wähle selbst ein typisches, anschauliches Beispielthema aus diesem Fach (bei "Fächerübergreifend" ein Thema, das alle Jahrgänge kennen, z. B. Lernen lernen oder Klassenregeln). Schreibe realistische, kurze Inhalte auf Deutsch, Jahrgang 7.

Was die Methode ist: ${methode.kurzbeschreibung || ''}
Ablauf: ${methode.ablauf || ''}
Vorgaben für den Grafikassistenten:
${methode.info_grafikassistent || '(keine)'}

Liefere zwei HTML-Fragmente (Inhalt von <body>), beide beginnen mit <div class="stunde">:
- lehrer: das Lehrer-Display (digitale Tafel, Querformat). Ruhig, groß, aus der Ferne gut lesbar. Dezente Einblend-Animationen sind erlaubt.
- schueler: das Schüler-Display (Tablet). DIESES soll ansprechend und lebendig wirken, nicht nur funktional.

GRUND-DESIGN (bereits geladen, nutze es als Basis): ${STUNDEN_KLASSEN}

LEBENDIGE GESTALTUNG DER SCHÜLERANSICHT (Pflicht, mit eigenem <style> und <script>):
- Bewegung: Elemente gleiten beim Laden nacheinander weich herein (gestaffelt), Karten heben sich beim Berühren leicht an, Knöpfe reagieren beim Klick spürbar.
- Rückmeldung: Richtige Eingaben werden sichtbar belohnt (z. B. sanftes Aufleuchten, Häkchen-Animation, kleiner Funkenregen aus reinem CSS/JS), Fortschritt wird als sich füllender Balken oder Schritte gezeigt.
- Tiefe und Reiz: Farbverläufe aus den Farbvariablen, weiche Schatten, Ebenen, große, selbstbewusste Überschriften, abgerundete Formen. Ein Bild darf als großes Kopfbild mit Verlauf darüber wirken.
- Echte Interaktion, wo die Methode es verlangt (Zuordnen, Sortieren, Auswählen, Schieberegler). Alles muss wirklich funktionieren.
- Nicht ablenken: Animationen kurz (0,3–0,8 s), keine Dauerschleifen, kein Blinken. Respektiere prefers-reduced-motion.
Farben über die Farbvariablen (var(--leit) usw.) und deren Abstufungen/Transparenzen, gern als Verläufe; keine grellen Neonfarben. Rundungen über var(--radius). Reines JavaScript, keine externen Bibliotheken, keine Netzwerkzugriffe.

BILDER: Nur echte Fotos, KEINE Comic-Figuren, keine Illustrationen, keine Cliparts, keine Emojis als Bildersatz.
Wo ein Foto die Seite unterstützt oder verschönert (meist 1–2, höchstens 3), setze <img src="{{bild:ID}}" alt="..." style="object-fit:cover"> mit einer kurzen ID (z. B. kopf, bild1) und beschreibe das Foto in "bilder" auf Englisch (Motiv, Perspektive, Umgebung). Keine Personenporträts im Vordergrund, keine Schrift im Bild.`;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    model: 'claude_sonnet_4_6',
    response_json_schema: {
      type: 'object',
      properties: {
        thema: { type: 'string' },
        lehrer: { type: 'string' },
        schueler: { type: 'string' },
        bilder: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, prompt: { type: 'string' } } } },
      },
    },
  });
  const fotos = await erzeugeFotos(res.bilder);
  return { thema: res.thema, lehrer: einsetzen(res.lehrer, fotos), schueler: einsetzen(res.schueler, fotos) };
}