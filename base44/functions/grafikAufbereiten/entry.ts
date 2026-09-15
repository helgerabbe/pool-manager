/**
 * grafikAufbereiten
 *
 * Grafik-Assistent: nimmt eine inhaltlich FERTIGE Aufgabe und erzeugt dazu eine
 * rein grafische Fassung. Die Gestaltung kommt bewusst von einer leistungsstarken
 * externen KI (Anthropic Claude, Schlüssel aus den Systemeinstellungen) — nicht
 * von InvokeLLM.
 *
 * Zwei Aufträge:
 *   art='offen'     → neues Fragment: <style> und Hülle dürfen neu geschrieben
 *                     werden, <script> und alle Texte bleiben WÖRTLICH erhalten.
 *   art='slideshow' → ein Design-Objekt (Farben, Schrift, Panel, Akzent) plus
 *                     optional generierte Hintergrundbilder pro Folie. Die
 *                     Folieninhalte werden nicht angefasst.
 *
 * Die Funktion SPEICHERT nichts — sie liefert den Vorschlag zurück; das
 * Übernehmen entscheidet die Lehrkraft im Dialog.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getAnthropicConfig, askAnthropicText, askAnthropicJson } from '../../shared/anthropicClient.js';

const RATE_MAX = 8;
const RATE_FENSTER_MS = 60 * 1000;
const protokoll = new Map();

function zuOft(kennung) {
  if (!kennung) return true;
  const jetzt = Date.now();
  const liste = (protokoll.get(kennung) || []).filter((t) => jetzt - t < RATE_FENSTER_MS);
  if (liste.length >= RATE_MAX) {
    protokoll.set(kennung, liste);
    return true;
  }
  liste.push(jetzt);
  protokoll.set(kennung, liste);
  return false;
}

const RICHTUNGEN = {
  light: 'Hell und klar: weiße bis sehr helle Flächen, ruhige Blau-/Schiefertöne, ein klarer Akzent, weiche Schatten, großzügige Abstände.',
  dark: 'Dunkel und fokussiert: dunkler Grund (Anthrazit/Tiefblau), heller Text mit hohem Kontrast, EIN warmer Akzent, sparsame Flächen.',
  bildwelt: 'Hell und ruhig, zusätzlich mit dezenten thematischen Hintergrundbildern; Text liegt immer auf einer ruhigen Fläche, damit er gut lesbar bleibt.',
};

const SYSTEM_OFFEN = `Du bist ein erfahrener Grafik- und UI-Designer für Lernmaterial an Schulen (Jahrgang 5-10, Bearbeitung auf Tablets im Querformat, Fläche ca. 960x560 px).

Du bekommst ein fertiges, funktionierendes HTML-Fragment einer interaktiven Aufgabe. Deine EINZIGE Aufgabe ist die grafische Aufwertung.

UNANTASTBAR — wörtlich unverändert übernehmen:
- Jeder <script>-Block, Zeichen für Zeichen. Nichts umformulieren, nichts kürzen, nichts ergänzen.
- Alle id- und class-Namen, die im Script vorkommen, sowie data-Attribute.
- Alle sichtbaren Texte, Aufgabenstellungen, Antwortoptionen, Zahlen und deren Reihenfolge.
- Die äußere Hülle <div class="aufgabe">.
- Etwaige Fertig-Signale (z. B. parent.postMessage({ mbkFertig: true }, "*")).

FREI gestaltbar:
- Der komplette <style>-Block: Farbpalette, Typografie, Größen, Abstände, Radien, Schatten, Verläufe, Karten-/Panel-Flächen, Hover- und Aktiv-Zustände, Buttons, Rahmen.
- Zusätzliche rein dekorative Umhüllungen (z. B. ein Kopfbereich, ein Hintergrund-Verlauf) und zusätzliche CSS-Klassen auf bestehenden Elementen.

REGELN: Kein externes Nachladen (keine Web-Fonts, keine Bild-URLs aus dem Netz), nur System-Schriften. Alles muss ohne Scrollen auf 960x560 px lesbar sein. Ruhig und professionell, nicht kinderbunt. Große Klickflächen für Finger.

Antworte AUSSCHLIESSLICH mit dem neuen Fragment, beginnend mit <div class="aufgabe" und endend mit </div>. Keine Erklärung, kein Markdown-Codeblock.`;

const SYSTEM_SLIDESHOW = `Du bist ein erfahrener Präsentationsdesigner für Unterrichtsmaterial (Folien 960x540 px, Schüler Jahrgang 5-10).

Du bekommst die Inhalte eines bestehenden Foliensatzes. Du gestaltest NUR das Aussehen — Texte, Bilder, Vorlagen und Einblendreihenfolge bleiben unangetastet.

Antworte ausschließlich mit JSON in genau dieser Form:
{
  "name": "kurzer Name des Designs",
  "begruendung": "ein Satz, warum dieses Design zum Thema passt",
  "hintergrund": "CSS-Wert für den Folienhintergrund (Farbe oder linear-gradient)",
  "text_farbe": "#rrggbb",
  "ueberschrift_farbe": "#rrggbb",
  "akzent_farbe": "#rrggbb",
  "schrift": "CSS font-family nur mit System-Schriften",
  "panel": { "fuellung": "CSS-Wert oder leer", "radius": 16, "schatten": "CSS box-shadow oder leer", "polsterung": 18 },
  "bild_prompts": { "<folien-id>": "englischer Bildprompt für ein dezentes Hintergrundbild" }
}
"panel" beschreibt die Fläche hinter Textfeldern. Der Kontrast zwischen text_farbe und Hintergrund/Panel muss hoch sein.
"bild_prompts" nur ausgeben, wenn ausdrücklich Bilder gewünscht sind — sonst ein leeres Objekt. Bildprompts beschreiben ruhige, abstrakte oder gegenständliche Hintergründe OHNE Text und ohne Menschen im Vordergrund.`;

function scriptBloecke(html) {
  return [...String(html || '').matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0].trim());
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    if (zuOft(user.email)) {
      return Response.json({ error: 'Zu viele Anfragen. Bitte einen Moment warten.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const art = body?.art;
    const richtung = RICHTUNGEN[body?.richtung] ? body.richtung : 'light';
    const kontext = body?.kontext || {};
    const wunsch = String(body?.wunsch || '').trim();

    const cfg = await getAnthropicConfig(base44);
    if (!cfg.aktiv) {
      return Response.json(
        { error: 'Für die grafische Aufbereitung fehlt der Anthropic-Zugang. Bitte in den Systemeinstellungen hinterlegen.' },
        { status: 400 },
      );
    }

    const kontextZeilen = [
      kontext.fach ? `Fach: ${kontext.fach}` : '',
      kontext.jahrgangsstufe ? `Jahrgangsstufe: ${kontext.jahrgangsstufe}` : '',
      kontext.thema ? `Thema: ${kontext.thema}` : '',
      kontext.titel ? `Titel: ${kontext.titel}` : '',
    ].filter(Boolean).join('\n');

    /* ── Offene Aufgabe: neues Fragment ─────────────────────────────────── */
    if (art === 'offen') {
      const fragment = String(body?.fragment || '').trim();
      if (!fragment) return Response.json({ error: 'Kein Fragment übergeben.' }, { status: 400 });

      const prompt = [
        kontextZeilen ? `KONTEXT\n${kontextZeilen}\n` : '',
        `DESIGNRICHTUNG\n${RICHTUNGEN[richtung]}\n`,
        wunsch ? `ZUSÄTZLICHER WUNSCH DER LEHRKRAFT\n${wunsch}\n` : '',
        'BESTEHENDES FRAGMENT (funktional geprüft):',
        fragment,
      ].filter(Boolean).join('\n');

      const { text, abgeschnitten } = await askAnthropicText(cfg, {
        system: SYSTEM_OFFEN,
        prompt,
        maxTokens: 24000,
      });

      let neu = String(text || '').trim();
      // Falls trotz Ansage ein Codeblock kommt: Zäune entfernen.
      neu = neu.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
      const start = neu.indexOf('<div');
      if (start > 0) neu = neu.slice(start);

      if (abgeschnitten) {
        return Response.json({ error: 'Die Antwort der KI war unvollständig. Bitte noch einmal versuchen.' }, { status: 502 });
      }
      if (!/class\s*=\s*["'][^"']*\baufgabe\b/i.test(neu)) {
        return Response.json({ error: 'Die aufbereitete Fassung hat die Hülle der Aufgabe verloren und wurde verworfen.' }, { status: 502 });
      }
      const alt = scriptBloecke(fragment);
      const neuScripts = scriptBloecke(neu);
      const fehlend = alt.filter((s) => !neuScripts.includes(s));
      if (fehlend.length > 0) {
        return Response.json(
          { error: 'Die aufbereitete Fassung hat die Funktionslogik verändert und wurde verworfen. Bitte erneut versuchen.' },
          { status: 502 },
        );
      }

      return Response.json({
        art: 'offen',
        fragment_polished: neu,
        meta: { richtung, erzeugt_am: new Date().toISOString(), modell: cfg.modell },
      });
    }

    /* ── Slideshow: Design-Objekt (+ Bilder) ────────────────────────────── */
    if (art === 'slideshow') {
      const slides = Array.isArray(body?.slides) ? body.slides : [];
      if (slides.length === 0) return Response.json({ error: 'Keine Folien übergeben.' }, { status: 400 });
      const mitBildern = richtung === 'bildwelt';

      const uebersicht = slides.map((s, i) => {
        const texte = Object.values(s?.elemente || {})
          .map((e) => String(e?.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join(' | ');
        return `Folie ${i + 1} (id: ${s?.id || `slide${i}`}, Vorlage: ${s?.vorlage || 'text'}): ${texte.slice(0, 300) || '(nur Bild)'}`;
      }).join('\n');

      const prompt = [
        kontextZeilen ? `KONTEXT\n${kontextZeilen}\n` : '',
        `DESIGNRICHTUNG\n${RICHTUNGEN[richtung]}\n`,
        wunsch ? `ZUSÄTZLICHER WUNSCH DER LEHRKRAFT\n${wunsch}\n` : '',
        mitBildern
          ? 'Bilder sind gewünscht: Gib für jede Folien-id einen Bildprompt aus.'
          : 'Bilder sind NICHT gewünscht: "bild_prompts" muss ein leeres Objekt sein.',
        '',
        'FOLIEN',
        uebersicht,
      ].filter(Boolean).join('\n');

      const design = await askAnthropicJson(cfg, { system: SYSTEM_SLIDESHOW, prompt, maxTokens: 3000 });
      if (!design) {
        return Response.json({ error: 'Die KI hat kein verwertbares Design geliefert. Bitte erneut versuchen.' }, { status: 502 });
      }

      const bilder = {};
      if (mitBildern) {
        const prompts = design.bild_prompts && typeof design.bild_prompts === 'object' ? design.bild_prompts : {};
        // Höchstens 6 Bilder pro Durchlauf — mehr kostet unnötig viel.
        const eintraege = Object.entries(prompts).slice(0, 6);
        for (const [folienId, bildPrompt] of eintraege) {
          if (!bildPrompt) continue;
          const res = await base44.asServiceRole.integrations.Core.GenerateImage({
            prompt: `${bildPrompt}. Soft, desaturated, calm background artwork for a school presentation slide, no text, no lettering, plenty of empty space.`,
          }).catch(() => null);
          if (res?.url) bilder[folienId] = res.url;
        }
      }

      delete design.bild_prompts;
      return Response.json({
        art: 'slideshow',
        design: {
          ...design,
          richtung,
          bilder,
          erzeugt_am: new Date().toISOString(),
          modell: cfg.modell,
        },
      });
    }

    return Response.json({ error: "Unbekannte Art. Erlaubt: 'offen' oder 'slideshow'." }, { status: 400 });
  } catch (error) {
    console.error('[grafikAufbereiten]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}