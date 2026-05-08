# MBK-Integration · Schnittstellen-Spezifikation

**Ticket:** Folge-Ticket zu #SCORM-INT-001
**Status:** Schema-Entwurf zur gemeinsamen Abnahme
**Stand:** 2026-05-08
**Schema-Version:** 1.0.1 (Patch: Alt-Texte + Sandwich-Notiz, durch MBK-Abnahme ergänzt)
**Geltungsbereich:** Datenübergabe vom Planungstool (Pool-Manager) an die
Moodle-Builder-KI (MBK) für die **Generierung** von didaktischen Inhalten
(Lückenfüller, Aufgaben-Generierung, interaktive Elemente).

> Dieses Dokument ergänzt `docs/scorm-integration.md`. Die SCORM-Doku regelt
> die **Strukturübergabe**, dieses Dokument regelt die **Generierungs-
> Briefings**, mit denen die MBK kreative Lücken füllt.
>
> Erst nach beidseitiger Abnahme wird die Datenmodell-Erweiterung (AP2),
> der Prompt-Manager-Umbau (AP3) und die neuen Backend-Endpoints (AP4)
> implementiert.

---

## 1. Zielsetzung & Designprinzipien

### 1.1 Die fundamentale Trennung: harte Fakten ↔ Generierungs-Briefing

Der Datenfluss zwischen Planungstool und MBK besteht aus **zwei
unterschiedlichen Klassen von Information**, die sauber getrennt werden:

1. **Harte Fakten** (deterministisch, 1:1 übergeben, **keine KI-Verarbeitung**)
   – Strukturdaten (Themenfelder, Lernpakete, Lernziele, Aktivitäts-Slots)
   – Fertig ausgearbeitete Aufgabeninhalte (Lückentexte, Miniquiz-Items, …)

2. **Generierungs-Briefing** (Anweisungen für **kreative Lückenfüllung** der MBK)
   – Globale Rahmenbedingungen (Mission, Lerntypen, Schul-Nomenklatur)
   – Lokale Mikro-Aufträge pro Lücke (GPS, Zieloptik, Source, Blueprint)

Diese Trennung ergibt **vier Payloads**, die jeweils eine eigene Schnittstelle
und einen eigenen Lebenszyklus haben.

### 1.2 System-Kontext vs. Micro-Payload (Token-Effizienz)

Die zentrale Architektur-Erkenntnis dieses Dokuments:

> Generelle Informationen (Mission, Lerntypen, Schul-Nomenklatur) gehen
> **nicht** pro Generierungs-Auftrag rüber — sie werden **einmalig** als
> System-Prompt geladen und bleiben für die gesamte Sitzung im Gedächtnis
> der MBK. Pro Lücke wird nur ein extrem schlanker User-Prompt verschickt.

Das spart bei einer Einheit mit z. B. 30 zu generierenden Lücken **massiv
Tokens** (Faktor ~10–20×) und reduziert Latenz spürbar.

### 1.3 Designprinzipien

1. **Vier-Payload-Trennung** — A, B, C-Global, C-Local. Jedes Payload hat
   genau eine Aufgabe. Keine Vermischung.
2. **System-Kontext ist cache-fähig** — C-Global ist byte-stabil pro Sitzung
   und wird über einen Hash invalidiert (siehe §2.3).
3. **Anti-Halluzinations-Schutz** — wenn echte Source-Materialien existieren
   (Transkripte, Lehrer-Notizen, Schul-Nomenklatur), werden sie 1:1
   übergeben. Die MBK darf nichts „dazudichten", was im Material nicht steht.
4. **Optional bleibt optional** — alle Felder, die die Lehrkraft nicht
   ausfüllt, sind explizit `null`. Die MBK füllt diese Lücken aus dem
   restlichen Kontext.
5. **UI-Neutralität von Caching-Mechanismen** — Hash und Versionierung sind
   technisch sichtbar (im JSON), aber im Pool-Manager-UI **niemals** sichtbar.

---

## 2. Die vier Payloads im Überblick

### 2.1 Übersichtstabelle

| ID | Name | Endpoint | Frequenz | KI-Rolle | Cachebar? |
|---|---|---|---|---|---|
| **A** | `structurePayload` | `exportSCORMPlan` | 1× pro Einheit | — (geht an SCORM, nicht an MBK) | ja |
| **B** | `taskContentPayload` | `exportSCORMPlan` (gleicher Call) | 1× pro Einheit, inkrementell ergänzbar | — (geht an SCORM) | ja |
| **C-Global** | `generationSystemContext` | `getMBKSystemContext` | 1× pro Einheits-Generierungs-Sitzung | **System-Prompt** | ✅ ja, perfekt |
| **C-Local** | `generationMicroPayload` | `generateActivityBriefing` | n× pro Sitzung (1 pro Lücke) | **User-Prompt** | nein |

### 2.2 Sequenzdiagramm einer MBK-Sitzung

```
┌─────────────┐                ┌──────────────┐                ┌─────┐
│ Pool-Manager│                │ App-Backend  │                │ MBK │
└──────┬──────┘                └──────┬───────┘                └──┬──┘
       │                              │                           │
       │  exportSCORMPlan(einheit_id) │                           │
       ├─────────────────────────────►│                           │
       │  ◄── A + B (Struktur+Inhalt) │                           │
       │                              │                           │
       │  „Bau mir die Einheit, MBK"  │                           │
       │                              │                           │
       │  getMBKSystemContext(eId)    │                           │
       ├─────────────────────────────►│                           │
       │  ◄── C-Global + sysCtxHash   │                           │
       │                              │                           │
       │  ─── lädt C-Global einmalig als System-Prompt ──────────►│
       │                              │                           │ ◄ gecached
       │                              │                           │
       │  Pro Lücke (z. B. Aktivität #4):                         │
       │  generateActivityBriefing(   │                           │
       │     aktivitaet_id, lerntyp)  │                           │
       ├─────────────────────────────►│                           │
       │  ◄── C-Local (schlank!) ────│                           │
       │                              │                           │
       │  ─── User-Prompt mit C-Local ────────────────────────────►│
       │                              │              ◄── Inhalt ──┤
       │                              │                           │
       │  ... (n weitere Lücken) ...                              │
       │                              │                           │
```

### 2.3 System-Context-Hash (Cache-Invalidierung)

C-Global enthält ein Feld `system_context_hash` (sha256, 16 Hex-Zeichen
gekürzt). Berechnung: deterministischer Hash über den vollständigen
C-Global-JSON-Body (ohne den Hash selbst und ohne `meta.exported_at`).

**MBK-Verhalten:**

- Beim Start einer Sitzung: C-Global laden, `system_context_hash` notieren.
- Bei jedem `generateActivityBriefing`-Aufruf liefert das Backend zusätzlich
  den **aktuellen** `system_context_hash` mit.
- Stimmt er nicht mit dem gecachten überein → MBK lädt C-Global neu.
- Stimmt er überein → Cache bleibt aktiv, kein Reload.

**Dieser Mechanismus ist UI-frei.** Lehrkräfte sehen weder den Hash noch den
Reload. Sie ändern ggf. eine Wortlimit-Regel im Prompt-Manager, der Hash
ändert sich automatisch, und die MBK lädt beim nächsten Aufruf transparent
neu.

---

## 3. Schema C-Global (System-Kontext)

> 🟢 **Wird einmalig pro Einheit geladen, bleibt im KI-Gedächtnis.**

```jsonc
{
  "meta": {
    "schema_version": "1.0.0",
    "einheit_id": "einheit:<uuid>",
    "exported_at": "2026-05-08T14:23:00.000Z",
    "system_context_hash": "a1b2c3d4e5f6a7b8"   // s. §2.3
  },

  "mission_statement": "...",                    // aus MBKGlobalPrompt(global_mission_statement)

  "lerntypen": {
    "lerntyp:minimalist": {
      "label": "Minimalist",
      "definition": "fokussiert auf das Wesentliche, ...",
      "erlaubte_operatoren": ["Nenne", "Berechne", "Beschreibe"],
      "wortlimit_pro_block": 80,
      "bearbeitungsregel": "Nur Pflichtkern. Schwierigkeitsgrad 1. ..."
    },
    "lerntyp:pragmatiker":  { /* … */ },
    "lerntyp:ehrgeizig":    { /* … */ },
    "lerntyp:passioniert":  { /* … */ }
  },

  "globale_guardrails": {
    "fehler_feedback_regel":
      "Liefere niemals sofort die Lösung. Gib stattdessen einen methodischen Tipp.",
    "tonalitaet":
      "Du bist Brian, der KI-Tutor. Du sprichst Lernende direkt an, freundlich, klar.",
    "halluzinations_schutz":
      "Wenn Material vorhanden ist, beziehe dich AUSSCHLIESSLICH darauf. Keine Annahmen."
  },

  "schul_nomenklatur": {
    "Mathematik": {
      "geradengleichung": "y = m·x + n",
      "y_achsenabschnitt": "n (NICHT b)",
      "schreibweise_steigung": "m",
      "weitere_konventionen": ["Ursprung als O (nicht U)", "..."]
    },
    "Deutsch": { /* … */ }
    // weitere Fächer nach Bedarf
  },

  "phasen_mapping": {
    "Input":     "Einstieg",
    "Übung":     "Erarbeitung",
    "Abschluss": "Sicherung"
  },

  "fachliche_persona": "..."                     // aus ExportPrompts(persona)
}
```

**Datenquellen:**

| Feld | Quelle | Pflege durch |
|---|---|---|
| `mission_statement` | `MBKGlobalPrompt(schluessel='global_mission_statement')` | Admin / Moodle-Designer |
| `lerntypen.*.definition` | `MBKGlobalPrompt(schluessel='def_lerntypen')` | Admin |
| `lerntypen.*.erlaubte_operatoren` | 🔴 **NEU** in `MBKGlobalPrompt` (Schlüssel pro Lerntyp) | Admin |
| `lerntypen.*.wortlimit_pro_block` | 🔴 **NEU** in `MBKGlobalPrompt` (Schlüssel pro Lerntyp) | Admin |
| `lerntypen.*.bearbeitungsregel` | aktuell hartkodiert in `lib/exportPromptTemplates.js` → wandert ggf. in `MBKGlobalPrompt` | Admin |
| `globale_guardrails` | 🔴 **NEU** in `MBKGlobalPrompt` (3 neue Schlüssel) | Admin |
| `schul_nomenklatur` | 🔴 **NEU** in Schul-Stammdaten, fach-indiziert | Admin / Fachschaftsleitung |
| `phasen_mapping` | hartkodiert (Vertragsgegenstand) | — |
| `fachliche_persona` | `ExportPrompts(prompt_type='persona')` | LLM-generiert + Lehrkraft-Review |

---

## 4. Schema C-Local (Micro-Payload)

> 🟡 **Wird pro Lücke einmal verschickt. Maximal schlank.**

Die Struktur folgt 1:1 den **sechs Blöcken** der MBK-Wunschliste — mit dem
wichtigen Unterschied, dass **alles, was schon im System-Kontext steht,
hier nur als Schlüssel/Verweis erscheint** (kein Volltext mehr).

```jsonc
{
  "meta": {
    "schema_version": "1.0.0",
    "einheit_id": "einheit:<uuid>",
    "system_context_hash": "a1b2c3d4e5f6a7b8",  // muss zur aktuellen C-Global passen
    "request_id": "<uuid>",                      // für Logging/Debugging
    "requested_at": "2026-05-08T14:24:01.000Z"
  },

  // ── Block 1: GPS ──────────────────────────────────────────────────────
  "gps": {
    "fach": "Mathematik",
    "jahrgang": "9",
    "titel_einheit": "Lineare Funktionen",
    "themenfeld": {
      "id": "themenfeld:<uuid>",
      "titel": "TF 2: Steigung m",
      "position": "TF 2 von 4"
    },
    "lernpaket": {
      "id": "lernpaket:<uuid>",
      "titel": "Steigungsdreieck",
      "position": "Lernpaket 1 von 3 in diesem Themenfeld"
    },
    "phase": {
      "interner_name": "Übung",                  // unser Vokabular
      "mbk_name": "Erarbeitung",                 // gemapptes Vokabular
      "position_in_phase": "Aktivität 2 von 4"
    }
  },

  // ── Block 2: Zieloptik ────────────────────────────────────────────────
  "zieloptik": {
    "lernziele": [
      "Der Schüler kann den y-Achsenabschnitt n im Graphen ablesen.",
      "..."
    ],
    "kernbegriffe": ["Ursprung", "y-Achse", "Schnittpunkt"]   // null = MBK darf selbst wählen
  },

  // ── Block 3: Lerntyp-Schalter (nur Schlüssel!) ────────────────────────
  "lerntyp_schalter": "lerntyp:minimalist",       // löst Logik aus C-Global aus

  // ── Block 4: Source of Truth ──────────────────────────────────────────
  "source_of_truth": {
    "vorhandener_input": [                        // leer = nichts vorgelegt
      {
        "kind": "video",
        "url": "https://medien.example.org/steigung.mp4",
        "transkript": "Wir schauen uns heute an, wie ...",  // null = nicht hinterlegt
        "label": "Erklärvideo Steigungsdreieck"
      },
      {
        "kind": "pdf",
        "url": "https://medien.example.org/aufgaben.pdf",
        "zusammenfassung": null,
        "label": "Übungsblatt"
      }
    ],
    "erlaubter_loesungsraum": null                // bei Bedarf pro Aktivität, sonst aus C-Global
  },

  // ── Block 5: Blueprint ────────────────────────────────────────────────
  "blueprint": {
    "aktivitaets_typ": "Lückentext",              // aus AktivitaetenKatalog.name
    "aktivitaet_id": "aktivitaet:<uuid>",
    "lehrer_notiz": {                             // "Sandwich-Notiz" (s. §4.1)
      "anweisung": "Erstelle 5 Fragen zum Steigungsdreieck.",
      "beispiel":  "So wie in der letzten Einheit zu Funktionen."
    },                                            // beide Felder optional, beide null = kein Briefing
    "visuelle_vorgabe": {
      "beschreibung": "Interaktive SVG-Grafik für das Koordinatensystem.",
      "format": "svg",                            // svg | canvas | image | none
      "alt_text_required": true                   // MBK liefert beim Rückgabe-Payload Alt-Text mit (s. §4.2)
    },
    "feldwerte_vorab": { /* aus LernpaketPhaseAktivitaet.field_values */ }
  },

  // ── Block 6: Lokale Guardrails (ableitbar) ────────────────────────────
  "lokale_guardrails": {
    "ist_letztes_element_der_phase": true,        // automatisch berechnet
    "tagebuch_trigger": "Generiere am Ende einen 'Check-out im Lerntagebuch'-Button.",
    "wortlimit_override": null                    // null = Lerntyp-Default aus C-Global
  }
}
```

**Datenquellen-Mapping:**

| Feld | Quelle | Lücke? |
|---|---|---|
| `gps.*` | `Einheiten`, `Themenfeld`, `Lernpakete` (Reihenfolge ableitbar) | ✅ vollständig |
| `gps.phase.position_in_phase` | berechnet aus `LernpaketPhaseAktivitaet.reihenfolge` | ✅ |
| `zieloptik.lernziele` | `Lernziele` (gefiltert auf Lernpaket) | ✅ |
| `zieloptik.kernbegriffe` | 🔴 **NEU** `Lernpakete.kernbegriffe[]` | optional |
| `lerntyp_schalter` | aus Aufruf-Kontext (welcher Lernpfad) | ✅ |
| `source_of_truth.vorhandener_input[].transkript` | 🔴 **NEU** `LernpaketPhaseAktivitaet.field_values.transkript` (oder analog für AllgemeineAufgabe.materialien) | optional |
| `source_of_truth.erlaubter_loesungsraum` | aus C-Global (Schul-Nomenklatur) ODER 🟡 lokales Override-Feld | optional |
| `blueprint.aktivitaets_typ` | `AktivitaetenKatalog.name` | ✅ |
| `blueprint.lehrer_notiz.anweisung` | 🔴 **NEU** `…ki_notiz_anweisung` (auf Aktivität + Aufgabe) | optional |
| `blueprint.lehrer_notiz.beispiel` | 🔴 **NEU** `…ki_notiz_beispiel` (auf Aktivität + Aufgabe) | optional |
| `blueprint.visuelle_vorgabe.beschreibung` | 🔴 **NEU** `…visuelle_vorgabe_text` | optional |
| `blueprint.visuelle_vorgabe.format` | 🔴 **NEU** `…visuelle_vorgabe_format` (Enum) | optional |
| `blueprint.visuelle_vorgabe.alt_text_required` | hartkodiert auf `true` wenn `format ∈ {svg, canvas, image}` | abgeleitet |
| `blueprint.feldwerte_vorab` | `LernpaketPhaseAktivitaet.field_values` | ✅ |
| `lokale_guardrails.ist_letztes_element_der_phase` | berechnet | ✅ |
| `lokale_guardrails.tagebuch_trigger` | abgeleitet (wenn `ist_letztes_element_der_phase`) | ✅ |
| `lokale_guardrails.wortlimit_override` | optional pro Aktivität, sonst aus C-Global | optional |

> 🔴 = neue Datenfelder, die im AP2-Schritt im Pool-Manager-Datenmodell und
> in der UI ergänzt werden.

### 4.1 Die „Sandwich-Notiz" (Pro-Tipp aus der MBK-Abnahme)

Die `lehrer_notiz` ist bewusst **strukturiert** in zwei Felder, statt einem
einzelnen Freitext:

- **`anweisung`** — was die KI tun soll. *Beispiel: „Erstelle 5 Fragen zum
  Steigungsdreieck."*
- **`beispiel`** — wie das Ergebnis aussehen / klingen soll. *Beispiel: „So
  wie in der letzten Einheit zu Funktionen."*

**Warum diese Struktur?** Anweisung allein lässt der KI zu viel Spielraum
beim Tonfall/Format. Beispiel allein erklärt nicht, was zu tun ist. Beides
kombiniert (das „Sandwich") erhöht laut MBK-Entwicklung die Treffsicherheit
spürbar.

**UI-Konsequenz für AP3:** Im Aktivitäts-/Aufgaben-Editor erscheinen zwei
separate Felder mit Hilfstexten („Was soll die KI tun?" / „Wie soll es
aussehen? Optional ein Beispiel."). Beide sind optional. Wenn beide leer
sind, wird `lehrer_notiz` im Payload als `null` ausgegeben.

### 4.2 Alt-Texte für visuelle Inhalte (Barrierefreiheit)

Wenn die MBK auf Basis von `visuelle_vorgabe` einen visuellen Inhalt
generiert (SVG, Canvas, Bild), liefert sie im **Rückgabe-Payload an das
Planungstool** zwingend einen Alt-Text mit, sofern
`alt_text_required === true` ist.

**Rückgabe-Format der MBK** (zur Information — wird vom Planungstool
gespeichert, nicht erneut an die MBK übergeben):

```jsonc
{
  "generated_visual": {
    "format": "svg",
    "content": "<svg>...</svg>",
    "alt_text": "Koordinatensystem mit einer fallenden Geraden, die die y-Achse bei +3 schneidet."
  }
}
```

**Logik:** Das Feld `alt_text_required` wird automatisch auf `true` gesetzt,
wenn `format ∈ {svg, canvas, image}`. Bei `format: "none"` (kein visueller
Inhalt gewünscht) ist es `false`. Lehrkräfte sehen diesen Schalter nicht im
UI — er wird vom Backend abgeleitet.

**Speicherort der Alt-Texte:** Die Alt-Texte landen am gleichen Anker wie
der visuelle Inhalt (z. B. `LernpaketPhaseAktivitaet.field_values.alt_text`).
Details werden in AP2 finalisiert.

---

## 5. Schema B (`taskContentPayload`)

> 🔵 **Fertig ausgearbeitete Aufgabeninhalte. Geht an SCORM, nicht an die MBK
> zur Generierung.**

Die fertigen Inhalte (echter Lückentext, echtes Miniquiz, echte
Begriffspaare, …) werden **nicht** durch die MBK generiert, sondern liegen
als statische Daten im Pool-Manager. Sie werden zusammen mit dem
Strukturpayload (Schema A) durch `exportSCORMPlan` ausgeliefert.

**Format:** identisch zu Schema A's `flat_map`-Einträgen vom Typ `aktivitaet`
und `master`. Siehe `docs/scorm-integration.md` §3.4.

**Wichtige Eigenschaft:** **Inkrementell nachlieferbar.** Eine Lehrkraft
kann eine Einheit mit teilweise leeren Aufgaben exportieren — die MBK füllt
diese Lücken via C-Local-Briefings, der Pool-Manager kann später ein
zweites `exportSCORMPlan` mit ergänzten Aufgaben nachschieben, und SCORM
patcht über die stabilen IDs (`aktivitaet:<uuid>`) gezielt nach.

---

## 6. Datenquellen-Mapping (Konsolidierung)

### 6.1 Was haben wir, was fehlt uns?

| 🔴 Neue Felder (AP2) | Wo? | Payload | Pflege |
|---|---|---|---|
| `Lernpakete.kernbegriffe[]` | Lernpaket-Form | C-Local | Lehrkraft, optional |
| `LernpaketPhaseAktivitaet.field_values.transkript` | Aktivitäts-Editor | C-Local | Lehrkraft + KI-Auto-Fill |
| `LernpaketPhaseAktivitaet.ki_notiz` | Aktivitäts-Editor | C-Local | Lehrkraft, optional |
| `LernpaketPhaseAktivitaet.visuelle_vorgabe` | Aktivitäts-Editor | C-Local | Lehrkraft, optional |
| `AllgemeineAufgabe.ki_notiz` | Aufgaben-Editor | C-Local | Lehrkraft, optional |
| `AllgemeineAufgabe.visuelle_vorgabe` | Aufgaben-Editor | C-Local | Lehrkraft, optional |
| `MBKGlobalPrompt(operatoren_<lerntyp>)` ×4 | Prompt-Manager | C-Global | Admin |
| `MBKGlobalPrompt(wortlimit_<lerntyp>)` ×4 | Prompt-Manager | C-Global | Admin |
| `MBKGlobalPrompt(guardrail_fehler_feedback)` | Prompt-Manager | C-Global | Admin |
| `MBKGlobalPrompt(guardrail_tonalitaet)` | Prompt-Manager | C-Global | Admin |
| `MBKGlobalPrompt(guardrail_halluzinations_schutz)` | Prompt-Manager | C-Global | Admin |
| **Schul-Stammdaten:** `nomenklatur_pro_fach{}` | Schul-Stammdaten-Card | C-Global | Admin / Fachschaftsleitung |

### 6.2 KI-Hilfsfunktion `generateMediaTranscript`

Damit die Lehrkraft das Transkript-Feld nicht manuell tippen muss:
optionaler „🪄 Auto-Fill aus URL"-Button neben dem Transkript-Feld. Backend
ruft Whisper-/Transkriptions-API auf, schreibt das Ergebnis ins Feld zurück,
Lehrkraft kann manuell nachpolieren.

Implementierungs-Hinweis: Dies ist ein **separates AP** und nicht Teil des
Schema-Vertrags hier — wird in AP2 geplant.

---

## 7. Backend-Endpoints

| Endpoint | Status | Liefert |
|---|---|---|
| `exportSCORMPlan(einheit_id)` | 🟡 geplant (nach SCORM-Schema-Abnahme) | A + B |
| `getMBKSystemContext(einheit_id)` | 🆕 **neu** (Teil dieses Vertrags) | C-Global |
| `generateActivityBriefing(aktivitaet_id, lerntyp)` | 🆕 **neu** | C-Local |
| `generateMediaTranscript(url)` | 🆕 **neu, optional** | Transkript-Text |

### 7.1 Vorbedingungen & Fehler

| Endpoint | Vorbedingung | Fehler |
|---|---|---|
| `getMBKSystemContext` | Einheit existiert + User hat Leseberechtigung | 401, 403, 404 |
| `generateActivityBriefing` | Aktivität gehört zur Einheit + Lerntyp ∈ {minimalist, pragmatiker, ehrgeizig, passioniert} | 401, 403, 404, 400 (ungültiger Lerntyp) |
| `generateMediaTranscript` | URL ist erreichbar + ist Audio/Video | 400, 502 (externer Service down) |

---

## 8. Versionierung

- `meta.schema_version` ist die **einzige verbindliche Versions-Aussage**
  für MBK-Konsumenten (analog zur SCORM-Doku).
- SemVer-Regeln identisch: Patch = Klarstellung, Minor = additive Felder,
  Major = Breaking Change.
- `system_context_hash` ist **kein** Versions-Feld, sondern ein reiner
  Cache-Invalidator innerhalb einer Schema-Version.

---

## 9. UI-Auswirkungen (Vorschau auf AP3)

Damit ihr seht, was im Pool-Manager UI-seitig passiert (Details kommen in AP3):

- **Schul-Stammdaten-Card** bekommt einen neuen Tab „Fachsprache & Nomenklatur"
  mit Texteingabe pro Fach.
- **MBK-Prompt-Manager** bekommt eine neue Sektion „Lerntyp-Feinjustierung"
  (Operatoren-Liste + Wortlimit pro Lerntyp) und eine Sektion „Globale
  Guardrails" (3 Felder).
- **Aktivitäts-Editor** (`PhaseActivitiesList` / `ActivityContentForm`)
  bekommt einen optional ausklappbaren Block „🤖 KI-Briefing" mit
  Transkript-Feld (+ Auto-Fill-Button), Notiz, visueller Vorgabe.
- **Aufgaben-Editor** (`AllgemeineAufgabenView`) bekommt denselben
  KI-Briefing-Block.
- **Lehrkräfte sehen NICHTS** vom `system_context_hash`, von Payload-IDs,
  Schema-Versionen oder Caching-Mechanik — alles rein technisch.

---

## 10. Abnahme

| Rolle | Name | Datum | Status |
|---|---|---|---|
| App-Team | App-Team-Lead | 2026-05-08 | ✅ |
| MBK-Entwicklung | MBK-Entwicklungsleitung | 2026-05-08 | ✅ |
| Planungs-/Didaktik-Lead | _(zu ergänzen)_ |  | ☐ |

**Abnahme-Statement der MBK-Entwicklung (2026-05-08):**

> „Hiermit bestätige ich die technische und didaktische Vollständigkeit des
> Schemas v1.0.1. Die MBK ist bereit für die Implementierung auf Basis
> dieser Briefings."

Sobald die didaktische Abnahme gesetzt ist, gilt das Schema als final und
AP2 (Datenmodell-Erweiterung im Pool-Manager) startet.

---

## 11. Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| 1.0.0 | 2026-05-08 | Initiale Spezifikation (Vier-Payload-Trennung, System-Context-Hash) |
| 1.0.1 | 2026-05-08 | Patch nach MBK-Abnahme: `lehrer_notiz` strukturiert als „Sandwich" (anweisung + beispiel); `visuelle_vorgabe` strukturiert (beschreibung + format + alt_text_required) für Barrierefreiheit |