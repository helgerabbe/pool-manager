import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * aufgabeGeneratorChat
 * ────────────────────
 * Dialog-Motor des Aufgabengenerators ("Offene Aufgabe").
 *
 * Die Lehrkraft spricht im Gespräch mit dem Modell; Ergebnis ist ein
 * HTML-FRAGMENT (kein vollständiges Dokument), das später 1:1 an die MBK
 * übergeben wird.
 *
 * Der entscheidende Unterschied zum alten Weg (InvokeLLM, ganze Seite rein,
 * ganze Seite raus):
 *   1. STREAMING — die Antwort erscheint sofort Stück für Stück.
 *   2. PATCHES — bei Änderungen schickt das Modell nur die zu ersetzenden
 *      Textstellen, nicht das ganze Fragment. Das ist der eigentliche
 *      Geschwindigkeitsgewinn: wenige hundert statt mehrere tausend
 *      Ausgabe-Token.
 *   3. VERLAUF — das Gespräch wird mitgeführt, das Modell weiß in Runde 8
 *      noch, was in Runde 1 besprochen wurde.
 *
 * Protokoll (Antwortformat des Modells):
 *   <antwort>kurzer Satz an die Lehrkraft</antwort>
 *   <neu>…vollständiges Fragment…</neu>              (nur beim ersten Bau)
 *   <edit><alt>…</alt><neu>…</neu></edit>            (beliebig oft, bei Änderungen)
 *
 * Request  (POST): { nachricht, fragment?, verlauf?, kontext? }
 * Response (SSE):  event: chunk    → { text }
 *                  event: ergebnis → { antwort, fragment, geaendert, warnungen, tokens }
 *                  event: fehler   → { error }
 *
 * ── AUSTAUSCHBARKEIT ──────────────────────────────────────────────────────
 * Alles Anbieterspezifische steckt unten im Abschnitt `// ── ADAPTER ──`
 * (Endpunkt, Header, Stream-Format). Beim Umzug nach Vercel/Supabase wird
 * NUR dieser Abschnitt übernommen; Systemanweisung, Protokoll und
 * Patch-Logik bleiben unverändert.
 */

const DEFAULT_MODELL = 'claude-sonnet-5';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 8000;
const MAX_VERLAUF = 20; // letzte N Beiträge; ältere werden verworfen
const ALLOWED_ROLES = new Set(['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft']);

// ═══════════════════════════════════════════════════════════════════════
// Systemanweisung — die feste Bauordnung für jede erzeugte Aufgabe.
// ═══════════════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Du bist der Aufgaben-Baumeister einer schulischen Lernplattform. Gemeinsam mit einer Lehrkraft entwickelst du im Gespräch eine interaktive Übungsaufgabe für Schüler:innen.

# WAS DU BAUST
Ein HTML-FRAGMENT — kein vollständiges Dokument.
- KEIN <!DOCTYPE>, KEIN <html>, KEIN <head>, KEIN <body>.
- Genau ein umschließendes <div class="aufgabe"> … </div>.
- CSS in genau einem <style>-Block INNERHALB dieses divs. Alle Selektoren MÜSSEN mit .aufgabe beginnen, damit nichts in die umgebende Seite ausblutet.
- JavaScript in genau einem <script>-Block am Ende des divs. Kein Zugriff auf document.body, document.head oder Elemente außerhalb des Fragments; arbeite ausschließlich innerhalb von .aufgabe.
- KEINE externen Dateien, keine CDNs, keine Bilder von außen, keine Netzwerkaufrufe. Alles muss offline im iframe laufen. Grafik erzeugst du mit CSS oder inline-SVG.
- KEINE Navigation, KEINE Kopf- oder Fußzeile, KEIN "Zurück"- oder "Erledigt"-Knopf. Die Plattform liefert das drumherum.

# GESTALTUNG
- Benutze für Farben, Abstände und Schrift bevorzugt CSS-Variablen (z. B. var(--color-primary, #2563eb)) IMMER mit sinnvollem Fallback. So fügt sich die Aufgabe später in das Layout des Kurses ein, sieht aber schon in der Vorschau gut aus.
- Bedienbar mit Maus UND Finger: Klickflächen mindestens 44px, kein Hover als einzige Rückmeldung, kein Drag-and-drop ohne Klick-Alternative.
- Nutzbar ab 768px Breite (Chromebook und iPad).
- Sprache: Deutsch, Ansprache in der Du-Form, altersgerecht.
- Einzelarbeit am Bildschirm. Keine Gruppenarbeit, kein Ausdrucken, kein Material aus dem Klassenraum.

# DIDAKTIK
- Die Aufgabe gibt unmittelbare Rückmeldung: richtig/falsch, und bei falsch einen kurzen Hinweis statt nur "leider falsch".
- Wo es passt, sind die Aufgaben zufällig erzeugt und wiederholbar, damit Übung möglich ist.
- Keine Endlosschleife ohne Abschluss: Es gibt einen erkennbaren Punkt, an dem die Schülerin fertig ist (z. B. eine kurze Bilanz nach n Durchgängen).

# WIE DU ANTWORTEST
Antworte IMMER in diesem Format, ohne Markdown-Codefences:

<antwort>Ein bis drei Sätze an die Lehrkraft: was du gebaut oder geändert hast, oder eine Rückfrage, wenn dir etwas Wesentliches fehlt.</antwort>

Danach, wenn du das Fragment ERSTMALIG baust:
<neu>
…das vollständige Fragment…
</neu>

Danach, wenn du ein VORHANDENES Fragment änderst — statt es neu zu bauen:
<edit><alt>exakter Textausschnitt aus dem bisherigen Fragment</alt><neu>der Text, der an seine Stelle tritt</neu></edit>

Regeln für <edit>:
- <alt> muss ZEICHENGENAU im bisherigen Fragment vorkommen, einschließlich Einrückung, und darf dort nur EIN EINZIGES MAL vorkommen. Nimm im Zweifel mehr Kontextzeilen dazu, bis die Stelle eindeutig ist.
- Mehrere Änderungen: mehrere <edit>-Blöcke nacheinander.
- Ändere ausschließlich, was die Lehrkraft angesprochen hat. Alles andere bleibt Zeichen für Zeichen unverändert.
- Nur wenn eine Änderung so tiefgreifend ist, dass Patches unsinnig wären, gib stattdessen wieder ein vollständiges <neu>-Fragment aus. Das ist die Ausnahme.
- Reine Rückfragen oder Erklärungen: nur <antwort>, ohne <neu> und ohne <edit>.

# GESPRÄCHSFÜHRUNG
- Die Lehrkraft ist Fachfrau für ihren Unterricht, aber keine Programmiererin. Sprich über das, was die Schüler:innen sehen und tun — nie über Code, Dateien oder Technik.
- Frage nur nach, wenn ohne die Antwort wirklich nicht weitergebaut werden kann. Im Zweifel: bau eine erste Fassung und frag danach, was noch fehlt. Am fertigen Gegenstand merkt man schneller, was man will.`;

// ═══════════════════════════════════════════════════════════════════════
// Hilfsfunktionen
// ═══════════════════════════════════════════════════════════════════════

async function hatZugriff(base44, user) {
  if (user.role === 'admin' || user.role === 'Administrator') return true;
  const profile = await base44.asServiceRole.entities.Benutzer
    .filter({ user_id: user.email })
    .catch(() => []);
  const p = profile?.[0];
  return !!p?.ist_aktiv && ALLOWED_ROLES.has(p?.rolle);
}

function tagInhalt(text, tag) {
  const m = String(text).match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

/** Liest alle <edit>-Blöcke als { alt, neu }-Paare. */
function leseEdits(text) {
  const out = [];
  const re = /<edit>\s*<alt>([\s\S]*?)<\/alt>\s*<neu>([\s\S]*?)<\/neu>\s*<\/edit>/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ alt: m[1], neu: m[2] });
  }
  return out;
}

/**
 * Wendet die Patches an. Jeder Patch muss genau einmal passen — sonst wird er
 * uebersprungen und gemeldet, statt an falscher Stelle zuzuschlagen.
 */
function wendeEditsAn(fragment, edits) {
  let aktuell = fragment;
  const warnungen = [];
  for (const [i, e] of edits.entries()) {
    const treffer = aktuell.split(e.alt).length - 1;
    if (treffer === 0) {
      warnungen.push(`Änderung ${i + 1} passte auf keine Stelle und wurde ausgelassen.`);
      continue;
    }
    if (treffer > 1) {
      warnungen.push(`Änderung ${i + 1} war nicht eindeutig (${treffer} Fundstellen) und wurde ausgelassen.`);
      continue;
    }
    aktuell = aktuell.replace(e.alt, () => e.neu);
  }
  return { fragment: aktuell, warnungen };
}

/** Entfernt versehentliche Codefences um ein Fragment herum. */
function saeubere(code) {
  let s = String(code || '').trim();
  const fence = s.match(/^```(?:html)?\s*([\s\S]*?)```$/i);
  if (fence) s = fence[1].trim();
  return s;
}

function sseEvent(name, daten) {
  return `event: ${name}\ndata: ${JSON.stringify(daten)}\n\n`;
}

// ═══════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await hatZugriff(base44, user))) {
      return Response.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const nachricht = String(body.nachricht || '').trim();
    const fragment = typeof body.fragment === 'string' ? body.fragment : '';
    const verlauf = Array.isArray(body.verlauf) ? body.verlauf.slice(-MAX_VERLAUF) : [];
    const kontext = body.kontext && typeof body.kontext === 'object' ? body.kontext : {};

    if (!nachricht) {
      return Response.json({ error: 'nachricht ist erforderlich.' }, { status: 400 });
    }

    // ── Zugang laden ───────────────────────────────────────────────────
    const settings = await base44.asServiceRole.entities.Systemeinstellungen
      .filter({ schluessel: 'anthropic_connector' })
      .catch(() => []);
    let cfg = {};
    try { cfg = JSON.parse(settings?.[0]?.wert_text || '{}'); } catch (_e) { cfg = {}; }

    const apiKey = String(cfg.api_key || '').trim() || Deno.env.get('ANTHROPIC_API_KEY') || '';
    const modell = String(cfg.modell || '').trim() || DEFAULT_MODELL;
    if (!apiKey) return Response.json({ error: 'Kein Anthropic-Zugang hinterlegt.' }, { status: 503 });
    if (cfg.aktiv === false) return Response.json({ error: 'Anthropic-Zugang ist ausgeschaltet.' }, { status: 503 });

    // ── Nachrichten zusammenstellen ────────────────────────────────────
    const kontextZeilen = [
      kontext.fach ? `Fach: ${kontext.fach}` : null,
      kontext.jahrgangsstufe ? `Jahrgang: ${kontext.jahrgangsstufe}` : null,
      kontext.einheit ? `Einheit: ${kontext.einheit}` : null,
      kontext.lernziele ? `Lernziele: ${kontext.lernziele}` : null,
      kontext.beschreibung ? `Ursprüngliche Aufgabenidee der Lehrkraft: ${kontext.beschreibung}` : null,
    ].filter(Boolean);

    const messages = [];
    if (kontextZeilen.length) {
      messages.push({
        role: 'user',
        content: `RAHMEN DIESER AUFGABE (nicht wörtlich auf dem Bildschirm anzeigen):\n${kontextZeilen.join('\n')}`,
      });
      messages.push({ role: 'assistant', content: '<antwort>Verstanden, ich habe den Rahmen.</antwort>' });
    }

    for (const m of verlauf) {
      if (!m?.role || !m?.content) continue;
      messages.push({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content),
      });
    }

    const letzte = fragment
      ? `BISHERIGES FRAGMENT (Stand, auf den sich Änderungen beziehen):\n${fragment}\n\n---\n\nÄNDERUNGSWUNSCH DER LEHRKRAFT:\n${nachricht}`
      : `AUFGABE DER LEHRKRAFT:\n${nachricht}`;
    messages.push({ role: 'user', content: letzte });

    // ═══════════════════════════════════════════════════════════════════
    // ── ADAPTER: Anthropic Messages API (anbieterspezifisch) ───────────
    // ═══════════════════════════════════════════════════════════════════
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: modell,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      let detail = '';
      try {
        const err = await upstream.json();
        detail = err?.error?.message ? ` ${err.error.message}` : '';
      } catch (_e) { /* ignorieren */ }
      return Response.json(
        { error: `KI nicht erreichbar (HTTP ${upstream.status}).${detail}` },
        { status: 502 },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const reader = upstream.body.getReader();

        let roh = '';          // vollständige Modellantwort
        let puffer = '';       // unvollständige SSE-Zeilen des Anbieters
        let sichtbar = '';     // bereits an das Frontend gesendeter <antwort>-Text
        let tokens = { input: null, output: null };

        const sendeAntwortText = () => {
          // Nur den Inhalt von <antwort> live durchreichen — der Code
          // interessiert die Lehrkraft nicht und würde nur flackern.
          const offen = roh.match(/<antwort>([\s\S]*?)(<\/antwort>|$)/i);
          if (!offen) return;
          const jetzt = offen[1];
          if (jetzt.length > sichtbar.length) {
            const neu = jetzt.slice(sichtbar.length);
            sichtbar = jetzt;
            controller.enqueue(enc.encode(sseEvent('chunk', { text: neu })));
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            puffer += dec.decode(value, { stream: true });

            const zeilen = puffer.split('\n');
            puffer = zeilen.pop() || '';

            for (const zeile of zeilen) {
              if (!zeile.startsWith('data:')) continue;
              const nutzlast = zeile.slice(5).trim();
              if (!nutzlast || nutzlast === '[DONE]') continue;
              let ev;
              try { ev = JSON.parse(nutzlast); } catch (_e) { continue; }

              if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                roh += ev.delta.text;
                sendeAntwortText();
              } else if (ev.type === 'message_start') {
                tokens.input = ev.message?.usage?.input_tokens ?? null;
              } else if (ev.type === 'message_delta') {
                tokens.output = ev.usage?.output_tokens ?? null;
              } else if (ev.type === 'error') {
                controller.enqueue(enc.encode(sseEvent('fehler', {
                  error: ev.error?.message || 'Fehler beim Erzeugen.',
                })));
              }
            }
          }

          // ── Auswertung: Fragment neu bauen oder patchen ──────────────
          const antwort = tagInhalt(roh, 'antwort') || 'Fertig.';
          const edits = leseEdits(roh);
          const komplettNeu = tagInhalt(roh.replace(/<edit>[\s\S]*?<\/edit>/gi, ''), 'neu');

          let neuesFragment = fragment;
          let warnungen = [];
          let geaendert = false;

          if (komplettNeu) {
            neuesFragment = saeubere(komplettNeu);
            geaendert = true;
          } else if (edits.length && fragment) {
            const res = wendeEditsAn(fragment, edits);
            neuesFragment = res.fragment;
            warnungen = res.warnungen;
            geaendert = res.fragment !== fragment;
          }

          controller.enqueue(enc.encode(sseEvent('ergebnis', {
            antwort,
            fragment: neuesFragment,
            geaendert,
            warnungen,
            tokens,
          })));
        } catch (err) {
          controller.enqueue(enc.encode(sseEvent('fehler', { error: err.message })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
