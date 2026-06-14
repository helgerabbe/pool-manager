# Antwort: Bauanleitung v2 – Abgleich mit Claudes Feedback

**An: Malte · Von: Noah · Stand: 2026-06-14**

---

## Hallo Malte,

danke dir für deine Rückmeldung zum ersten gebauten Modul („Einführung in die Poolzeit") und deinen detaillierten Abgleich mit Claudes Anmerkungen. Ich habe alles durchgearbeitet und die Bauanleitung entsprechend auf Version 2 aktualisiert. Hier Punkt für Punkt, was sich geändert hat und warum.

---

## Deine Beobachtungen aus dem ersten Modul

### 1. Lernpaket-Header leer → stumpfe Upsert-Prüfung
Im ersten Modul fehlten viele Transkripte und Alt-Texte – der Header-Block einer Aktivität war leer und die Upsert-Prüfung „ist das schon frisch?" hat stumpf „ja" gesagt, weil das Briefing ja wirklich „leer war wie es war". Der Export selber hat korrekt funktioniert, das war ein Daten-Problem (nicht gefüllte Pflichtfelder), kein Payload-Problem.

### 2. SCORM-Paket-Struktur
Du hast das SCORM-Paket entsprechend der v1-Anleitung umgesetzt – viele einzelne `<item>`-Einträge im Manifest. Claudes Feedback hat hier einen besseren Weg gezeigt: ein einziges SCO mit `index.html` als Einstieg.

### 3. KI-Aktivitäten
Im ersten Modul waren noch keine KI-Aufgaben drin, der Topic kam erst später. Für die v2 haben wir das jetzt sauber geregelt: Live-Webhook zur Laufzeit, kein statischer Fragment-Merger mehr.

---

## Claudes Feedback – was wir übernommen haben

### Generator-Workflow (`core/build.mjs`)
**Übernommen.** Ein Befehl erzeugt alle HTML-Dateien + Manifest. Kein Handbau mehr, kein „Ordnereintrag für Ordnereintrag" runterhangeln. Der Generator ist deterministisch, wiederholbar und kursübergreifend konsistent. Der Prompt-Katalog („Briefing der MBK") ist davon entkoppelt – der Generator arbeitet nur mit den Payloads.

### GitHub als Quelle der Wahrheit
**Übernommen.** Die Payloads werden im Export-Center als ZIP heruntergeladen und ins Repo eingecheckt (`kurse/<slug>/payloads/`). Das ist versioniert, diffbar, teamfähig und braucht keine Supabase-Lese-Rechte für Malte.

### Eigene Engine (`mbk-runtime.js`)
**Übernommen.** Keine Base44-Plugins mehr. Stattdessen eine zentrale Engine mit Renderer-Registry für alle 18 Aktivitätstypen, SCORM-Bridge, Fortschritts-Tracking und Cloud-Save. Die Engine liegt im Repo unter `core/assets/`.

### Einzels SCO statt vieler Einträge
**Übernommen.** Das `imsmanifest.xml` enthält ein einziges SCO (`index.html`). Navigation läuft über interne Links. Moodle-Standard – kommt dem nahe, was Moodle-Admin-Kollegen gewohnt sind.

### KI-Aktivitäten: Live-Feedback
**Übernommen.** KI-Aufgaben (`ki_check`, `ki_tutor`) laufen live über einen Make.com-Webhook zur Laufzeit. Es werden KEINE statischen HTML-Fragmente vorab generiert. Der Aufgabentext ist sichtbar, Kriterien bleiben für die KI. Kein manueller Merging-Schritt mehr.

---

## Claudes Feedback – was wir anders entschieden haben

### Portal-Nachbau (Phase B)
**Bleibt erhalten.** Claudes Vorschlag, das Portal direkt in Moodle zu integrieren (Kurs-Layout, HTML-Module), haben wir diskutiert und uns dagegen entschieden. Begründung:

- Das Portal (Cockpit, Poolzeit-Manager, Lerntagebuch) ist fachübergreifend. In Moodle wäre es pro Kurs dupliziert.
- Die methodische Hülle ist ein eigenes Produkt mit eigenem Lifecycle – unabhängig von einzelnen Kursen.
- Der Moodle-Admin will nicht 10 Mal dieselbe Portal-Hülle in 10 Kursen pflegen.

**Entscheidung:** Portal bleibt eine eigenständige Web-App. Moodle ist Host für die SCORM-Pakete pro Einheit.

---

## Zusammenfassung der Änderungen (v1 → v2)

| Aspekt | v1 | v2 |
|---|---|---|
| Generierung | Handbau, HTML-Datei für HTML-Datei | Generator (`core/build.mjs`) |
| Datenquelle | Supabase (direkte DB-Abfragen) | GitHub (Payload-JSONs im Repo) |
| Runtime | Base44-Plugins (`lib/runtime/plugin_*.js`) | Eigene Engine (`core/assets/mbk-runtime.js`) |
| SCORM | Viele `<item>`-Einträge | Ein SCO (`index.html`) |
| KI-Aufgaben | Statische HTML-Fragmente, manueller Merger | Live-Webhook zur Laufzeit |
| Portal | Eigenständige Web-App | ✅ Beibehalten |
| Payload-Struktur | Identisch | ✅ Beibehalten |
| Verträge | 7 Verträge in Payload 1 | ✅ Beibehalten |
| Check-Liste | ✅ Beibehalten | ✅ Beibehalten, erweitert |

---

## Nächste Schritte

- [x] Bauanleitung v2 geschrieben (`docs/malte-anleitung-mbk-v2.md`)
- [ ] Portal-Nachbau (Phase B) – deine Aufgabe, Claude kann dir dabei helfen
- [ ] Generator (`core/build.mjs`) umsetzen – Claires Aufgabe
- [ ] Engine (`mbk-runtime.js`) umsetzen – Claires Aufgabe
- [ ] Erstes Modul mit v2-Daten neu bauen und in Moodle testen

---

Wenn noch was unklar ist oder du andere Entscheidungen brauchst, sag Bescheid.

Viele Grüße,
Noah