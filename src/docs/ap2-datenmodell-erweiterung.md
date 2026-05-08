# AP2 · Datenmodell-Erweiterung (Pool-Manager)

**Ticket:** #MBK-AP2-DATENMODELL
**Status:** Design-Spec — bereit für Implementierungs-Freigabe
**Stand:** 2026-05-08
**Vorgelagert:** [docs/mbk-integration.md](./mbk-integration.md), [docs/ap2-nomenklatur-manager.md](./ap2-nomenklatur-manager.md)

> Dieses Dokument schließt die fünf 🔴 Daten-Lücken aus der MBK-Spec. Es
> gliedert sich in **Mikro-Ebene** (Felder am einzelnen Lernpaket / der
> einzelnen Aktivität) und **Global-Ebene** (Felder im Prompt-Manager).

---

## 1. Mikro-Ebene · Aufgabenspezifische Briefings (Payload C-Local)

### 1.1 `Lernpakete.kernbegriffe`

| | |
|---|---|
| **Entity** | `Lernpakete` |
| **Feldname** | `kernbegriffe` |
| **Typ** | `array of string`, default `[]` |
| **UI** | Tag-Input (kommasepariert, Enter zum Hinzufügen) im Lernpaket-Editor. |
| **Zweck** | Verpflichtende Begriffe, die in jeder Übung des Pakets vorkommen müssen. Die MBK prüft beim Generieren, dass jeder Kernbegriff mindestens einmal in der Aufgabe enthalten ist. |
| **Out-of-Sync-Wirkung** | Edit triggert Update der Erstellungspakete dieses Lernpakets. |

### 1.2 `LernpaketPhaseAktivitaet.ki_notiz` & `AllgemeineAufgabe.ki_notiz`

| | |
|---|---|
| **Entities** | `LernpaketPhaseAktivitaet`, `AllgemeineAufgabe` |
| **Feldname** | `ki_notiz` |
| **Typ** | Object: `{ anweisung: string, beispiel: string }` (beide optional) |
| **UI** | Zwei Felder mit Hilfstexten — siehe MBK-Spec §4.1 "Sandwich-Notiz". |
| **Speicherregel** | Wenn beide leer → Feld gar nicht setzen (statt `{anweisung:"",beispiel:""}`), damit der Out-of-Sync-Check nicht fälschlich anschlägt. |

### 1.3 `LernpaketPhaseAktivitaet.visuelle_vorgabe` & `AllgemeineAufgabe.visuelle_vorgabe`

| | |
|---|---|
| **Entities** | `LernpaketPhaseAktivitaet`, `AllgemeineAufgabe` |
| **Feldname** | `visuelle_vorgabe` |
| **Typ** | Object: `{ beschreibung: string, format: 'svg'\|'canvas'\|'image'\|'none' }` |
| **UI** | Textarea + Format-Select. `alt_text_required` wird **abgeleitet**, nicht gespeichert. |
| **Beispiel** | `{ beschreibung: "Koordinatensystem mit fallender Geraden, Steigung -2", format: "svg" }` |

### 1.4 `LernpaketPhaseAktivitaet.transkript`

| | |
|---|---|
| **Entity** | `LernpaketPhaseAktivitaet` (nicht auf `AllgemeineAufgabe` — Transkripte gehören zu Medien-Aktivitäten) |
| **Feldname** | `transkript` |
| **Typ** | `string` (LongText, max. 50.000 Zeichen) |
| **UI-Sichtbarkeit** | Nur bei Aktivitäten mit `katalog.name ∈ {Video, Audio, Podcast, Hörverstehen}`. Steuerung über das `form_schema` des `AktivitaetenKatalog`-Eintrags. |
| **Begleit-Feature** | Zauberstab-Button "Transkript automatisch erzeugen" → ruft `generateMediaTranscript` (s. §3). |

### 1.5 `LernpaketPhaseAktivitaet.alt_text` (Rückgabe-Feld)

| | |
|---|---|
| **Entity** | `LernpaketPhaseAktivitaet` |
| **Feldname** | `alt_text` |
| **Typ** | `string` (max. 1.000 Zeichen) |
| **UI** | Read-Only-Anzeige unter dem visuellen Asset, mit Edit-Button für manuelle Korrektur durch Lehrkraft. |
| **Wer schreibt?** | Wird beim Import des MBK-Rückgabe-Payloads gefüllt; Lehrkraft kann nachträglich überschreiben. |

---

## 2. Global-Ebene · System-Kontext (Payload C-Global)

Diese Felder leben im **MBK-Prompt-Manager** (bestehende Entity
`MBKGlobalPrompt` — wir erweitern sie nicht um neue Spalten, sondern legen
neue **Schlüssel** an, da der Manager bereits Schlüssel-Wert-basiert ist).

### 2.1 Neue MBKGlobalPrompt-Schlüssel

| Schlüssel | Kategorie | Anzeigename | Inhalt |
|---|---|---|---|
| `operatoren_liste` | global | Operatoren-Liste pro Lerntyp | Markdown-Tabelle: Lerntyp × erlaubte Operator-Verben (Nenne, Erkläre, Analysiere, …). |
| `wortlimit_regeln` | global | Wortlimit-Regeln pro Lerntyp | Klartext-Regeln: Minimalist max. 50 Wörter, Pragmatiker max. 120, … |
| `guardrail_feedback` | global | Feedback-Guardrails | Wie reagiert die KI auf falsche Schülerantworten? Tonalität, Hinweis-Tiefe, Eskalation. |

**Vorteil:** Kein Schema-Change nötig — wir seeden die drei neuen Records
in `seedMBKGlobalPrompts` als Default-Texte. Lehrkräfte/Admins editieren
sie im bestehenden Prompt-Manager-UI.

### 2.2 Schul-Nomenklatur

Eigene Entity (siehe `docs/ap2-nomenklatur-manager.md`) — wird im
C-Global-Payload als `schul_nomenklatur` ausgegeben.

---

## 3. Helper · `generateMediaTranscript`

**Neue Backend-Function:** `functions/generateMediaTranscript.js`

| Aspekt | Details |
|---|---|
| **Auth** | Authentifizierter User mit Schreibrecht auf die jeweilige `LernpaketPhaseAktivitaet` (Standard-Lock-Check). |
| **Payload** | `{ activity_id, source_url }` |
| **Logik** | URL-Type erkennen (YouTube / SoundCloud / direkter MP3/MP4-Link). Audio-Spur extrahieren → Speech-to-Text via `InvokeLLM` mit `file_urls` (sofern Modell Audio unterstützt) oder dediziertem Transkriptions-Service. |
| **Antwort** | `{ transcript: string, duration_sec: number, language: string }` |
| **Ratenbegrenzung** | `utils/rateLimiter` mit 5 Calls/Minute pro User (Schutz gegen Missbrauch). |
| **Fehlerverhalten** | Liefert klare User-Fehlermeldungen: "Video privat", "Quelle zu lang (>30 Min)", "Sprache nicht unterstützt". |

**UI-Integration:** Im `ActivityContentForm` neben dem Transkript-Feld
ein Sparkles-Button. State: `idle | loading | success | error`.
Bei Erfolg wird das Feld vorbefüllt — Lehrkraft kann nachbearbeiten.

> **Wichtig für AP2-Kickoff:** Diese Function ist **nicht im Critical
> Path**. Wir können das Transkript-Feld manuell befüllbar ausliefern
> und den Auto-Fill-Button in einem separaten Sprint nachschieben.

---

## 4. Datei-Struktur (was wo entsteht)

```
entities/
  SchulNomenklatur.json                      ← NEU
  Lernpakete.json                            ← Edit: + kernbegriffe
  LernpaketPhaseAktivitaet.json              ← Edit: + ki_notiz, visuelle_vorgabe, transkript, alt_text
  AllgemeineAufgabe.json                     ← Edit: + ki_notiz, visuelle_vorgabe

functions/
  updateSchulNomenklaturSecure.js            ← NEU
  generateMediaTranscript.js                 ← NEU (separat schiebbar)
  exportSCORMPlan.js                         ← später (eigenes Ticket)
  generateActivityBriefing.js                ← später (eigenes Ticket)

lib/
  systemContextHash.js                       ← NEU
  __tests__/systemContextHash.test.js        ← NEU

components/admin/nomenklatur/
  NomenklaturManagerView.jsx                 ← NEU
  NomenklaturFachEditor.jsx                  ← NEU
  NomenklaturDefinitionRow.jsx               ← NEU

components/workspace/
  ActivityContentForm.jsx                    ← Edit: + ki_notiz/visuelle_vorgabe/transkript-Felder
  TranskriptAutoFillButton.jsx               ← NEU (separat schiebbar)
```

---

## 5. Reihenfolge der Implementierung

| Schritt | Inhalt | Blockiert? |
|---|---|---|
| 1 | Entity-Schemas erweitern (Lernpakete, Aktivität, Aufgabe, SchulNomenklatur) | nein |
| 2 | `lib/systemContextHash.js` + Tests | nein |
| 3 | `updateSchulNomenklaturSecure` | hängt an Schritt 1 |
| 4 | Nomenklatur-Manager-UI in AdminSettings | hängt an Schritt 3 |
| 5 | `ki_notiz` + `visuelle_vorgabe` in `ActivityContentForm` + AllgemeineAufgaben-Editor | hängt an Schritt 1 |
| 6 | Transkript-Feld (manuell, ohne Auto-Fill) | hängt an Schritt 1 |
| 7 | Drei neue MBKGlobalPrompt-Schlüssel im Seed | nein, parallel zu 1–6 |
| 8 | `generateMediaTranscript` + Auto-Fill-Button | optional, separat |

Schritt 1+2+7 können **parallel** gestartet werden. Erst danach hängt
sich der Rest ein.

---

## 6. Tests (Pflicht für PR-Freigabe)

| Test | Datei | Inhalt |
|---|---|---|
| Hash-Determinismus | `lib/__tests__/systemContextHash.test.js` | Gleicher Input → gleicher Hash, Reihenfolge der Conventions egal. |
| Hash-Sensitivität | `lib/__tests__/systemContextHash.test.js` | Convention ändert sich → Hash ändert sich. |
| Nomenklatur-RLS | manuell | Fachschaftsleitung kann nur eigene Fächer schreiben (oder: nur admin schreibt — finale Regel in §4 von ap2-nomenklatur-manager.md). |
| Sandwich-Notiz-Speicher | manuell | Beide Felder leer → `ki_notiz` ist `null`/undefined, nicht `{anweisung:"",beispiel:""}`. |

---

## 7. Abnahme

| Rolle | Status |
|---|---|
| App-Team | ☐ |
| MBK-Entwicklung | ☐ |
| Didaktik-/Planungs-Lead | ☐ |