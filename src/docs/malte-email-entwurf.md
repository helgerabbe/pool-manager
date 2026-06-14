# Email-Entwurf: Bauanleitung v2 & Abgleich mit Claude

**An: Malte · Entwurf · Stand: 2026-06-14**

---

**Betreff: Bauanleitung v2 – Generator-Workflow + Claudes Feedback eingearbeitet**

Moin Malte,

drei Dinge für dich:

---

### 1. Die Bauanleitung v2 ist fertig

`docs/malte-anleitung-mbk-v2.md`

Die wichtigste Änderung: Der Generator (`core/build.mjs`) ersetzt den Handbau.
Ein Befehl erzeugt alle HTML-Dateien plus SCORM-Manifest aus den Payload-JSONs.
Deterministisch, wiederholbar, kein „Datei für Datei runterhangeln" mehr.

---

### 2. Claudes Feedback ist eingearbeitet

`docs/malte-antwort-mbk-abgleich.md`

Punkt für Punkt aufgeschlüsselt, was wir übernommen haben:
- Generator-Workflow ✓
- GitHub als Source of Truth ✓
- Eigene Engine statt Base44-Plugins ✓
- Ein SCO statt vieler Manifest-Einträge ✓
- KI-Aufgaben live zur Laufzeit ✓

Und wo wir anders entschieden haben:
- **Das Portal bleibt eigenständig** – nicht in Moodle integriert.
  (Begründung: Portal ist fachübergreifend, Moodle wäre pro Kurs dupliziert)

---

### 3. Nächste Schritte

- [x] Bauanleitung v2
- [x] Abgleich-Dokument
- [ ] Du (oder Claude): Portal-Nachbau (Phase B) gemäß v2-Anleitung
- [ ] Claire/Claude: Generator + Engine umsetzen
- [ ] Erstes Modul mit v2 bauen und testen

---

Lies dir die v2 in Ruhe durch. Wenn was fehlt oder unklar ist, meld dich.

Viele Grüße,
Noah