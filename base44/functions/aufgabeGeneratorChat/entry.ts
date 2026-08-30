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
 * ZWEI MODI (2026-08-29):
 *   modus='aufgabe'  (Vorgabe) — baut das Fragment EINES offenen Schritts.
 *   modus='struktur'           — schlägt die SCHRITTFOLGE einer allgemeinen
 *                                Aufgabe vor, als Text, ohne irgendetwas zu
 *                                bauen. Das ist bewusst der erste Halt: eine
 *                                Folge zu besprechen dauert Sekunden, sie zu
 *                                bauen Minuten.
 *
 * Request  (POST): { nachricht, modus?, fragment?, verlauf?, kontext? }
 * Response (SSE):  event: chunk    → { text }
 *                  event: ergebnis → { antwort, tokens,
 *                                      … modus='aufgabe':  fragment, geaendert, warnungen
 *                                      … modus='struktur': schritte[] }
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
const SYSTEM_PROMPT_AUFGABE = `Du bist der Aufgaben-Baumeister einer schulischen Lernplattform. Gemeinsam mit einer Lehrkraft entwickelst du im Gespräch eine interaktive Übungsaufgabe für Schüler:innen.

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
// Systemanweisung — Struktur-Phase: erst die Folge besprechen, nichts bauen.
// ═══════════════════════════════════════════════════════════════════════

/** Die Schritttypen. Muss zu src/lib/schrittTypen.js passen. */
const SCHRITT_TYPEN_BESCHREIBUNG = `- "katalog": ein fertiges, deterministisches Aufgabenformat aus dem Aktivitätenkatalog (Lückentext, Zuordnung, Miniquiz, Lehrwerk/Quelle …). ERSTE WAHL, wann immer ein Format passt — es ist erprobt, sofort fertig und die Lehrkraft muss nur wenige Felder ausfüllen.
- "material": reiner Inhalt ohne Aufgabenstellung (Text, Bild, PDF, Video, Audio, Link).
- "offen": eine interaktive Aufgabe, die eigens gebaut werden muss. Nur wenn KEIN Katalogformat passt — das Bauen kostet Zeit.
- "brian": ein Gespräch mit dem KI-Tutor. Für offene, diskursive Aufgaben ohne eindeutige Lösung.
- "handlung": Arbeit an echtem Material außerhalb des Bildschirms (messen, bauen, befragen). Schülerseitig nur ein Bestätigen-Knopf.
- "extern": eine eingebettete fremde Seite, typischerweise GeoGebra.`;

function baueStrukturPrompt(katalogNamen, galerieEintraege = []) {
  const katalog = katalogNamen.length
    ? katalogNamen.map((n) => `  - ${n}`).join('\n')
    : '  (Katalog konnte nicht geladen werden — schlage dann keinen "katalog"-Schritt vor.)';

  // Die Galerie ist KEIN eigener Schritttyp: Ein Galerie-Eintrag wird ein
  // Katalog-Schritt vom Format "Aktivitätengalerie". Die App baut ihn nicht
  // selbst — sie uebergibt Galerie-ID und Inhaltstext, die MBK setzt daraus
  // die fertige Aktivitaet zusammen.
  const galerie = galerieEintraege.length
    ? `\n# FERTIGE VORLAGEN AUS DER AKTIVITÄTEN-GALERIE
Diese Vorlagen sind bereits gebaut und müssen nur mit Inhalten gefüllt werden. Passt eine davon, ist sie fast immer die besere Wahl als eine neu gebaute offene Aufgabe.
${galerieEintraege.map((g) => {
      const teile = [`  - "${g.name}" (id: ${g.id})`];
      if (g.kurzbeschreibung) teile.push(`    ${String(g.kurzbeschreibung).slice(0, 300)}`);
      return teile.join('\n');
    }).join('\n')}

Willst du eine dieser Vorlagen vorschlagen, nimm typ "katalog" mit aktivitaet_name "Aktivitätengalerie" und gib zusaetzlich "galerie_id" und "galerie_name" an. Nenne in der kurzbeschreibung, WARUM diese Vorlage passt.\n`
    : '';

  return `Du planst gemeinsam mit einer Lehrkraft den AUFBAU einer Unterrichtsaufgabe für Schüler:innen.

# WAS DU TUST — UND WAS NICHT
Du schlägst eine geordnete FOLGE VON SCHRITTEN vor. Mehr nicht.
Du baust in dieser Phase NICHTS: keine Aufgaben, kein HTML, keine Inhalte, keine Musterlösungen. Nur die Folge, kurz und als Text. Die Lehrkraft entscheidet dann, welchen Schritt sie zuerst ausarbeitet.
Halte dich kurz. Eine gute Folge hat 2 bis 6 Schritte. Mehr als 8 sind fast immer ein Zeichen dafür, dass du zu kleinteilig denkst.

# SCHRITTTYPEN
${SCHRITT_TYPEN_BESCHREIBUNG}

# DIE REGEL FÜR DIE TYPWAHL — in dieser Reihenfolge
1. Passt ein Format aus dem Aktivitätenkatalog? Dann nimm "katalog" und nenne das Format beim Namen.
2. Sonst: Gibt es eine fertige Vorlage in der Aktivitäten-Galerie? Dann nimm sie (siehe unten) — sie ist gebaut und getestet.
3. Braucht es echtes Material, eine fremde Seite oder ein Gespräch? Dann "handlung", "extern" oder "brian".
4. Erst wenn nichts davon trägt: "offen".
Greife NICHT reflexhaft zu "offen". Eine Aufgabe, die zu drei Vierteln aus Katalogformaten besteht, ist der Lehrkraft mehr wert als eine, die komplett neu gebaut werden muss.

# VERFÜGBARE KATALOGFORMATE
${katalog}
${galerie}

# WIE DU ANTWORTEST
Antworte IMMER in diesem Format, ohne Markdown-Codefences:

<antwort>Zwei bis vier Sätze an die Lehrkraft: wie du die Aufgabe aufbauen würdest und warum. Sprich über den Unterricht, nicht über Technik.</antwort>

<schritte>
[
  { "titel": "…", "typ": "katalog", "aktivitaet_name": "Lückentext", "kurzbeschreibung": "…", "dauer_minuten": 10 }
]
</schritte>

Regeln für <schritte>:
- Reines JSON-Array, nichts davor oder danach. Kein Kommentar im JSON.
- "titel": kurz, sehen später die Schüler:innen.
- "typ": genau einer der oben genannten Werte.
- "aktivitaet_name": NUR bei typ "katalog", und NUR ein Name aus der Liste oben, zeichengenau.
- "galerie_id"/"galerie_name": NUR bei aktivitaet_name "Aktivitätengalerie", und NUR eine id aus der Galerie-Liste, zeichengenau.
- "kurzbeschreibung": ein Satz für die Lehrkraft, was in diesem Schritt passiert. Nicht schülersichtbar.
- "dauer_minuten": grobe Schätzung als Zahl, oder weglassen.
- Reine Rückfragen: nur <antwort>, ohne <schritte>.
- Ändert die Lehrkraft den Vorschlag, gib die VOLLSTÄNDIGE neue Folge aus, nicht nur die Änderung.

# GESPRÄCHSFÜHRUNG
Die Lehrkraft ist Fachfrau für ihren Unterricht, aber keine Programmiererin. Frage nur nach, wenn ohne die Antwort wirklich nicht weitergeplant werden kann — sonst schlage etwas vor und lass sie korrigieren. Am konkreten Vorschlag merkt man schneller, was man will.`;
}

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

/**
 * Laedt das Manifest der Aktivitaeten-Galerie (GitHub-Repository, konfiguriert
 * ueber Systemeinstellungen 'github_connector').
 *
 * ROBUST GEGEN AUSFALL, und zwar mit Absicht: Ist der Connector nicht
 * eingerichtet, das Token abgelaufen oder GitHub nicht erreichbar, gibt diese
 * Funktion eine leere Liste zurueck und der Ablaufvorschlag entsteht ohne
 * Galerie-Vorschlaege. Ein abgelaufenes Token darf nicht den ganzen
 * Generator lahmlegen — die Lehrkraft wuerde den Zusammenhang nie erraten.
 *
 * Stand 2026-08-30: Der Zugriff scheitert an einer Organisationsregel von
 * GitHub (fein abgestufte Token duerfen nicht laenger als 366 Tage laufen).
 * Sobald ein neues Token hinterlegt ist, greift dieser Weg ohne weitere
 * Aenderung.
 */
async function ladeGalerieEintraege(base44) {
  try {
    const settings = await base44.asServiceRole.entities.Systemeinstellungen
      .filter({ schluessel: 'github_connector' })
      .catch(() => []);
    const cfg = settings?.[0]?.wert_text ? JSON.parse(settings[0].wert_text) : null;
    if (!cfg?.owner || !cfg?.repo || !cfg?.access_token || !cfg?.file_path) return [];

    const branch = cfg.branch || 'main';
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.file_path}?ref=${branch}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return [];

    const file = await res.json();
    const b64 = String(file.content || '').replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const manifest = JSON.parse(new TextDecoder('utf-8').decode(bytes));
    const alle = Array.isArray(manifest?.aktivitaeten) ? manifest.aktivitaeten : [];

    // Gleiche Sichtbarkeitsregel wie im Galerie-Browser der App: Gibt es das
    // Flag, zaehlt es; gibt es keins, sind alle sichtbar.
    const hatFlag = alle.some((a: any) => a?.galerie_sichtbar === true);
    return (hatFlag ? alle.filter((a: any) => a?.galerie_sichtbar === true) : alle)
      .filter((a: any) => a?.id && a?.name);
  } catch (_e) {
    return [];
  }
}

/** Höchstens so viele Materialien werden als Datei angehängt. */
const MAX_ANHAENGE = 4;
/** Größere Dateien werden übersprungen (Anthropic-Grenze, Kosten, Tempo). */
const MAX_ANHANG_BYTES = 4 * 1024 * 1024;

/**
 * Holt Material-Dateien und macht daraus Anthropic-Inhaltsblöcke.
 *
 * Serverseitig geholt statt per URL durchgereicht: Base44-Upload-Adressen
 * sind nicht zwingend von außen erreichbar, und ein Anbieterwechsel soll
 * nicht daran scheitern.
 *
 * Bewusst genügsam — nur Bilder und PDFs, höchstens vier Stück, jeweils
 * höchstens 4 MB. Alles andere (Links, eingefügter Text) steht ohnehin schon
 * als Text im Prompt. Was übersprungen wird, kommt in `uebersprungen`, damit
 * das Modell nicht so tut, als hätte es die Datei gesehen.
 */
async function ladeMaterialAnhaenge(materialien: any[]) {
  const bloecke: any[] = [];
  const gelesen: string[] = [];
  const uebersprungen: string[] = [];

  const kandidaten = (materialien || []).filter((m) => m?.url
    && (m?.type === 'image' || m?.type === 'pdf'));

  for (const m of kandidaten) {
    const name = String(m.label || 'Material');
    if (bloecke.length >= MAX_ANHAENGE) { uebersprungen.push(`${name} (zu viele Dateien)`); continue; }
    try {
      const res = await fetch(m.url);
      if (!res.ok) { uebersprungen.push(`${name} (nicht abrufbar)`); continue; }

      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_ANHANG_BYTES) { uebersprungen.push(`${name} (zu groß)`); continue; }

      const kopfTyp = (res.headers.get('content-type') || '').split(';')[0].trim();
      const istPdf = m.type === 'pdf' || kopfTyp === 'application/pdf';
      const mediaType = istPdf
        ? 'application/pdf'
        : (kopfTyp.startsWith('image/') ? kopfTyp : 'image/png');

      // Base64 in Blöcken kodieren — String.fromCharCode(...alles) sprengt
      // bei großen Dateien den Aufrufstapel.
      let binaer = '';
      for (let i = 0; i < buf.length; i += 8192) {
        binaer += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      const daten = btoa(binaer);

      bloecke.push({
        type: istPdf ? 'document' : 'image',
        source: { type: 'base64', media_type: mediaType, data: daten },
      });
      gelesen.push(name);
    } catch (_e) {
      uebersprungen.push(`${name} (Fehler beim Laden)`);
    }
  }

  return { bloecke, gelesen, uebersprungen };
}

const ERLAUBTE_TYPEN = new Set(['katalog', 'material', 'offen', 'brian', 'handlung', 'extern']);

/**
 * Liest den <schritte>-Block als geprüfte Liste.
 *
 * Bewusst streng: ein Schritt mit unbekanntem Typ oder ohne Titel wird
 * VERWORFEN, nicht repariert. Ein stillschweigend zurechtgebogener Vorschlag
 * wäre schlimmer als ein fehlender — die Lehrkraft sieht sonst etwas, das
 * niemand so gemeint hat. Was aussortiert wurde, wird gemeldet.
 */
function leseSchritte(text, katalogNamen) {
  const roh = tagInhalt(text, 'schritte');
  if (!roh) return { schritte: null, warnungen: [] };

  let liste;
  try {
    liste = JSON.parse(saeubere(roh));
  } catch (_e) {
    return { schritte: null, warnungen: ['Der Vorschlag war nicht lesbar. Frag am besten noch einmal nach.'] };
  }
  if (!Array.isArray(liste)) {
    return { schritte: null, warnungen: ['Der Vorschlag hatte nicht die erwartete Form.'] };
  }

  const bekannt = new Set(katalogNamen);
  const warnungen = [];
  const schritte = [];

  liste.forEach((s, i) => {
    const titel = String(s?.titel || '').trim();
    const typ = String(s?.typ || '').trim();
    if (!titel || !ERLAUBTE_TYPEN.has(typ)) {
      warnungen.push(`Vorschlag ${i + 1} war unbrauchbar und wurde ausgelassen.`);
      return;
    }

    const eintrag: {
      titel: string; typ: string; kurzbeschreibung: string;
      dauer_minuten?: number; aktivitaet_name?: string;
    } = {
      titel,
      typ,
      kurzbeschreibung: String(s?.kurzbeschreibung || '').trim(),
    };

    const dauer = Number(s?.dauer_minuten);
    if (Number.isFinite(dauer) && dauer > 0) eintrag.dauer_minuten = Math.round(dauer);

    if (typ === 'katalog') {
      const name = String(s?.aktivitaet_name || '').trim();
      // Ein erfundener Formatname wäre eine tote Referenz. Dann lieber den
      // Schritt als "offen" durchreichen — die Lehrkraft sieht die Absicht
      // und kann selbst ein Format wählen.
      if (name && bekannt.has(name)) {
        eintrag.aktivitaet_name = name;
      } else {
        eintrag.typ = 'offen';
        warnungen.push(`Für „${titel}“ wurde ein Format vorgeschlagen, das es nicht gibt (${name || 'ohne Namen'}). Der Schritt steht jetzt als offene Aufgabe da.`);
      }
    }

    schritte.push(eintrag);
  });

  return { schritte, warnungen };
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
    const istStruktur = String(body.modus || 'aufgabe') === 'struktur';
    let anhaengeBloecke: any[] = [];

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

    // ── Katalogformate laden (nur Struktur-Modus) ──────────────────────
    // Ohne die echten Namen erfindet das Modell Formate, die es nicht gibt.
    // Nach Namen entdoppelt: der Katalog führt jede Aktivität einmal pro
    // Lernpaket-Phase, ein Schritt hat aber keine Phase.
    let katalogNamen: string[] = [];
    if (istStruktur) {
      const katalog = await base44.asServiceRole.entities.AktivitaetenKatalog
        .list()
        .catch(() => []);
      const namen: string[] = (katalog || [])
        .filter((k: any) => k?.is_active !== false && k?.name)
        .map((k: any) => String(k.name));
      katalogNamen = [...new Set(namen)].sort((a, b) => a.localeCompare(b, 'de'));
    }
    const systemStruktur = istStruktur ? baueStrukturPrompt(katalogNamen) : '';

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

    let letzte;
    if (istStruktur) {
      const bisher = Array.isArray(body.schritte) && body.schritte.length
        ? `BISHERIGER VORSCHLAG:\n${JSON.stringify(body.schritte, null, 2)}\n\n---\n\n`
        : '';

      // Materialsammlung der Lehrkraft. Bewusst nur, was als TEXT vorliegt:
      // Bezeichnung, Typ, eingefuegter Text, Link-Adresse. Inhalte von PDFs
      // und Bildern werden (noch) nicht ausgelesen — das Modell darf also
      // nicht so tun, als kenne es sie, deshalb steht der Hinweis dabei.
      const materialien = Array.isArray(body.materialien) ? body.materialien : [];
      const anhang = await ladeMaterialAnhaenge(materialien);
      anhaengeBloecke = anhang.bloecke;

      // Was tatsaechlich mitgeschickt wurde, darf das Modell auswerten. Was
      // nicht gelesen werden konnte, muss es ausdruecklich wissen — sonst
      // erfindet es Inhalte zu einem Dateinamen.
      const leseHinweis = [
        anhang.gelesen.length
          ? `Die folgenden Dateien liegen dieser Nachricht bei und darfst du auswerten: ${anhang.gelesen.join(', ')}.`
          : '',
        anhang.uebersprungen.length
          ? `NICHT gelesen werden konnten: ${anhang.uebersprungen.join(', ')}. Von diesen kennst du nur die Bezeichnung — behaupte nie, du haettest sie gesehen.`
          : '',
        'Von Materialien ohne beiliegende Datei kennst du nur Bezeichnung, Text und Adresse.',
        'Beziehe vorhandenes Material ein, wenn es passt (etwa als Material-Schritt oder als Quelle einer Buchaufgabe).',
      ].filter(Boolean).join(' ');

      const materialBlock = materialien.length
        ? `VORHANDENES MATERIAL DER LEHRKRAFT (${materialien.length}):\n`
          + materialien.map((m: any, i: number) => {
            const teile = [`${i + 1}. [${m?.type || 'unbekannt'}] ${m?.label || 'ohne Bezeichnung'}`];
            if (m?.url) teile.push(`   Adresse: ${m.url}`);
            if (m?.content) teile.push(`   Inhalt: ${String(m.content).slice(0, 1500)}`);
            return teile.join('\n');
          }).join('\n')
          + `\n\n${leseHinweis}\n\n---\n\n`
          : '';

      letzte = `${bisher}${materialBlock}WUNSCH DER LEHRKRAFT:\n${nachricht}`;
    } else {
      letzte = fragment
        ? `BISHERIGES FRAGMENT (Stand, auf den sich Änderungen beziehen):\n${fragment}\n\n---\n\nÄNDERUNGSWUNSCH DER LEHRKRAFT:\n${nachricht}`
        : `AUFGABE DER LEHRKRAFT:\n${nachricht}`;
    }
    // Mit Anhängen wird die letzte Nachricht zu einer Blockliste: erst die
    // Dateien, dann der Text — so bezieht sich der Auftrag auf das, was
    // darüber steht.
    messages.push(anhaengeBloecke.length
      ? { role: 'user', content: [...anhaengeBloecke, { type: 'text', text: letzte }] }
      : { role: 'user', content: letzte });

    // ═══════════════════════════════════════════════════════════════════
    // ── ADAPTER: Anthropic Messages API (anbieterspezifisch) ───────────
    // ═══════════════════════════════════════════════════════════════════
    const ruf = (msgs: any[]) => fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: modell,
        max_tokens: MAX_TOKENS,
        system: istStruktur ? systemStruktur : SYSTEM_PROMPT_AUFGABE,
        messages: msgs,
        stream: true,
      }),
    });

    let upstream = await ruf(messages);

    // Nicht jedes Modell nimmt PDFs oder Bilder an. Scheitert der Aufruf MIT
    // Anhaengen, versuchen wir es ohne — eine Schrittfolge ohne gesichtetes
    // Material ist immer noch besser als eine Fehlermeldung. Die Lehrkraft
    // erfaehrt es ueber den Hinweis im Prompt-Text.
    if (!upstream.ok && anhaengeBloecke.length > 0) {
      const ohneAnhang = [...messages];
      ohneAnhang[ohneAnhang.length - 1] = {
        role: 'user',
        content: `${letzte}\n\nHINWEIS: Die beigefuegten Dateien konnten nicht verarbeitet werden. Du kennst von ihnen nur die Bezeichnung — behaupte nicht, du haettest sie gelesen.`,
      };
      upstream = await ruf(ohneAnhang);
    }

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

          // ── Auswertung ───────────────────────────────────────────────
          const antwort = tagInhalt(roh, 'antwort') || 'Fertig.';

          if (istStruktur) {
            const res = leseSchritte(roh, katalogNamen);
            controller.enqueue(enc.encode(sseEvent('ergebnis', {
              antwort,
              schritte: res.schritte,
              geaendert: !!res.schritte,
              warnungen: res.warnungen,
              tokens,
            })));
          } else {
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
          }
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
